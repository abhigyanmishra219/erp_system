import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import AuditLog from "@/models/AuditLog";
import { ExcelExportService } from "@/lib/export/excelExportService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId, user } = auth.context;

  try {
    const { type } = await params;
    const lowerType = type.toLowerCase() as
      | "students"
      | "teachers"
      | "parents"
      | "attendance"
      | "fees"
      | "results"
      | "reports";

    const validTypes = ["students", "teachers", "parents", "attendance", "fees", "results", "reports"];
    if (!validTypes.includes(lowerType)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_EXPORT_TYPE",
            message: `Unsupported export category '${type}'. Supported categories: ${validTypes.join(", ")}.`,
          },
        },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const filters = {
      academicYearId: url.searchParams.get("academicYearId") || undefined,
      classId: url.searchParams.get("classId") || undefined,
      sectionId: url.searchParams.get("sectionId") || undefined,
      status: url.searchParams.get("status") || undefined,
      gender: url.searchParams.get("gender") || undefined,
      department: url.searchParams.get("department") || undefined,
      examId: url.searchParams.get("examId") || undefined,
      date: url.searchParams.get("date") || undefined,
      startDate: url.searchParams.get("startDate") || undefined,
      endDate: url.searchParams.get("endDate") || undefined,
      search: url.searchParams.get("search") || undefined,
    };

    await connectToDatabase();

    const { buffer, fileName } = await ExcelExportService.generateExportBuffer(
      lowerType,
      schoolId,
      filters,
      user
    );

    // Audit Log for export
    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "REPORT_EXPORTED_EXCEL",
      entityType: "EXCEL_EXPORT",
      entityId: lowerType,
      schoolId,
      metadata: {
        exportCategory: lowerType,
        fileName,
        filters,
      },
    });

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/import-export/export/[type] error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "EXPORT_FAILED", message: err.message || "Failed to generate Excel export" },
      },
      { status: 500 }
    );
  }
}
