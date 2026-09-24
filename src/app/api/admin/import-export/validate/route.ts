import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import ImportSession from "@/models/ImportSession";
import AuditLog from "@/models/AuditLog";
import { ColumnMapper } from "@/lib/import/columnMapper";
import { StudentImportValidator } from "@/lib/import/validators/studentImport";
import { ParentImportValidator } from "@/lib/import/validators/parentImport";
import { TeacherImportValidator } from "@/lib/import/validators/teacherImport";
import { ClassImportValidator } from "@/lib/import/validators/classImport";
import { SectionImportValidator } from "@/lib/import/validators/sectionImport";
import { FeeImportValidator } from "@/lib/import/validators/feeImport";

export async function POST(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId, user } = auth.context;

  try {
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "Session ID is required." } },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const session = await ImportSession.findOne({ _id: sessionId, schoolId, userId: user.id });
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "SESSION_NOT_FOUND", message: "Import session not found or access denied." },
        },
        { status: 404 }
      );
    }

    const mapping = session.columnMapping instanceof Map
      ? Object.fromEntries(session.columnMapping)
      : (session.columnMapping as Record<string, string>);

    // Transform raw rows into ERP keys
    const transformedRows = session.rowsData.map((row: any) => ({
      rowNumber: row.rowNumber,
      data: ColumnMapper.transformRow(row.rawValues, mapping),
    }));

    let validationResult: {
      validRows: any[];
      errors: any[];
      summary: { total: number; valid: number; invalid: number };
    };

    if (session.type === "STUDENTS") {
      validationResult = await StudentImportValidator.validateRows(schoolId, transformedRows);

      // Validate subscription student capacity
      const activeRows = validationResult.validRows.filter((r) => (r.data?.status || "ACTIVE") === "ACTIVE");
      const { checkStudentCapacity } = await import("@/lib/subscription-guard");
      const capacityCheck = await checkStudentCapacity(schoolId, activeRows.length);

      if (!capacityCheck.allowed) {
        validationResult.errors.push({
          rowNumber: 0,
          field: "subscriptionLimit",
          message: `Subscription capacity exceeded: ${capacityCheck.remaining} student slots available, but ${activeRows.length} active students requested. Plan limit: ${capacityCheck.limit}, Current active: ${capacityCheck.currentCount}.`,
        });
        session.errorMessage = `Subscription capacity exceeded (${activeRows.length} requested vs ${capacityCheck.remaining} available).`;
      }
    } else if (session.type === "PARENTS") {
      validationResult = await ParentImportValidator.validateRows(schoolId, transformedRows);
    } else if (session.type === "TEACHERS") {
      validationResult = await TeacherImportValidator.validateRows(schoolId, transformedRows);
    } else if (session.type === "CLASSES") {
      validationResult = await ClassImportValidator.validateRows(schoolId, transformedRows);
    } else if (session.type === "SECTIONS") {
      validationResult = await SectionImportValidator.validateRows(schoolId, transformedRows);
    } else if (session.type === "FEES") {
      validationResult = await FeeImportValidator.validateRows(schoolId, transformedRows);
    } else {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TYPE", message: "Unsupported import category." } },
        { status: 400 }
      );
    }

    session.status = "VALIDATED";
    session.validRows = validationResult.summary.valid;
    session.invalidRows = validationResult.summary.invalid;
    session.validationErrors = validationResult.errors;
    // Store valid rows in session summary for confirmation
    session.summary = {
      validDataList: validationResult.validRows,
    };

    await session.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "EXCEL_IMPORT_VALIDATED",
      entityType: "IMPORT_SESSION",
      entityId: session._id.toString(),
      schoolId,
      metadata: {
        importType: session.type,
        totalRows: session.totalRows,
        validRows: session.validRows,
        invalidRows: session.invalidRows,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session._id.toString(),
        status: session.status,
        totalRows: session.totalRows,
        validRows: session.validRows,
        invalidRows: session.invalidRows,
        errorsCount: validationResult.errors.length,
        errors: validationResult.errors.slice(0, 100), // Return top 100 errors for UI display
      },
    });
  } catch (err: any) {
    console.error("POST /api/admin/import-export/validate error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "VALIDATION_FAILED", message: err.message || "Failed to validate import data." },
      },
      { status: 500 }
    );
  }
}
