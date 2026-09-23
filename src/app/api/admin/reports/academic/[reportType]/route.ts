import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { ReportServices } from "@/lib/reports/reportServices";
import { ReportExportService } from "@/lib/reports/reportExportService";
import { BaseReportFilters, AcademicReportType } from "@/lib/reports/types";
import AuditLog from "@/models/AuditLog";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reportType: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { reportType } = await params;
  const { searchParams } = new URL(req.url);

  const format = (searchParams.get("format") || "json").toLowerCase();
  const isExport = format === "excel" || format === "pdf";

  const filters: BaseReportFilters = {
    academicYearId: searchParams.get("academicYearId") || undefined,
    examId: searchParams.get("examId") || undefined,
    classId: searchParams.get("classId") || undefined,
    sectionId: searchParams.get("sectionId") || undefined,
    subjectId: searchParams.get("subjectId") || undefined,
    studentId: searchParams.get("studentId") || undefined,
    page: parseInt(searchParams.get("page") || "1", 10),
    limit: parseInt(searchParams.get("limit") || "20", 10),
    isExport,
  };

  const context = {
    userId: user.id,
    userRole: user.role,
    schoolId,
    userName: user.email,
  };

  try {
    let result;
    switch (reportType as AcademicReportType) {
      case "exam-results":
        result = await ReportServices.getExamResultsReport(context, filters);
        break;
      case "class-performance":
        result = await ReportServices.getClassPerformanceReport(context, filters);
        break;
      case "student-performance":
        result = await ReportServices.getStudentPerformanceReport(context, filters);
        break;
      case "subject-performance":
        result = await ReportServices.getSubjectPerformanceReport(context, filters);
        break;
      default:
        return NextResponse.json(
          { success: false, error: { message: `Unknown academic report type: ${reportType}` } },
          { status: 404 }
        );
    }

    // Audit Logging
    const auditAction =
      format === "excel"
        ? "REPORT_EXPORTED_EXCEL"
        : format === "pdf"
        ? "REPORT_EXPORTED_PDF"
        : "REPORT_GENERATED";

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: auditAction,
      entityType: "REPORT",
      entityId: reportType,
      schoolId,
      metadata: {
        category: "ACADEMIC",
        reportType,
        format,
        filtersApplied: result.metadata.filtersApplied,
      },
    }).catch(console.error);

    if (format === "excel") {
      const buffer = await ReportExportService.generateExcelBuffer(result);
      const filename = ReportExportService.getReportFilename(reportType, "xlsx");
      return new NextResponse(buffer as any, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (format === "pdf") {
      const buffer = await ReportExportService.generatePdfBuffer(result);
      const filename = ReportExportService.getReportFilename(reportType, "pdf");
      return new NextResponse(buffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error(`Error generating academic report (${reportType}):`, error);
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to generate report." } },
      { status: 500 }
    );
  }
}
