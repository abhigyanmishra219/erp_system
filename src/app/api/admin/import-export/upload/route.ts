import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import ImportSession, { ImportType } from "@/models/ImportSession";
import AuditLog from "@/models/AuditLog";
import { ExcelParser } from "@/lib/import/excelParser";
import { ColumnMapper } from "@/lib/import/columnMapper";
import { IMPORT_CONFIGS } from "@/lib/import/types";

export async function POST(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawType = (formData.get("type") as string || "").toUpperCase() as ImportType;

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: "NO_FILE_UPLOADED", message: "Please upload an Excel file." } },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".xlsx")) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNSUPPORTED_FILE_TYPE", message: "Only Excel (.xlsx) files are supported." },
        },
        { status: 400 }
      );
    }

    const config = IMPORT_CONFIGS[rawType];
    if (!config) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_IMPORT_TYPE",
            message: `Invalid import type '${rawType}'. Allowed: STUDENTS, PARENTS, TEACHERS, CLASSES, SECTIONS, FEES.`,
          },
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse Excel file safely
    const parsed = await ExcelParser.parseBuffer(buffer);

    if (parsed.duplicateHeaders.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_EXCEL_HEADERS",
            message: `Duplicate column header(s) found in Excel: ${parsed.duplicateHeaders.join(", ")}. Please ensure all column headers are unique.`,
          },
        },
        { status: 400 }
      );
    }

    if (parsed.totalRows === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "EMPTY_WORKSHEET", message: "The uploaded worksheet contains no data rows." },
        },
        { status: 400 }
      );
    }

    // Auto-suggest column mappings
    const suggestedMapping = ColumnMapper.autoSuggestMapping(rawType, parsed.headers);

    await connectToDatabase();

    // Create tenant-isolated ImportSession
    const session = new ImportSession({
      schoolId,
      userId: user.id,
      type: rawType,
      status: "UPLOADED",
      fileName: file.name,
      fileSize: file.size,
      parsedHeaders: parsed.headers,
      columnMapping: suggestedMapping,
      totalRows: parsed.totalRows,
      rowsData: parsed.rows,
      createdAt: new Date(),
    });

    await session.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "EXCEL_IMPORT_STARTED",
      entityType: "IMPORT_SESSION",
      entityId: session._id.toString(),
      schoolId,
      metadata: {
        importType: rawType,
        fileName: file.name,
        totalRows: parsed.totalRows,
        fileSize: file.size,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          sessionId: session._id.toString(),
          type: rawType,
          title: config.title,
          fileName: file.name,
          totalRows: parsed.totalRows,
          headers: parsed.headers,
          suggestedMapping,
          fields: config.fields,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/admin/import-export/upload error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "UPLOAD_PARSE_FAILED", message: err.message || "Failed to parse uploaded Excel file." },
      },
      { status: 500 }
    );
  }
}
