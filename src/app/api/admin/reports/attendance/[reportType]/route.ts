import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { ReportServices } from "@/lib/reports/reportServices";
import { ReportExportService } from "@/lib/reports/reportExportService";
import { BaseReportFilters, AttendanceReportType } from "@/lib/reports/types";
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
    classId: searchParams.get("classId") || undefined,
    sectionId: searchParams.get("sectionId") || undefined,
    studentId: searchParams.get("studentId") || undefined,
    fromDate: searchParams.get("fromDate") || undefined,
    toDate: searchParams.get("toDate") || undefined,
    date: searchParams.get("date") || undefined,
    month: searchParams.get("month") || undefined,
    minPercentage: searchParams.get("minPercentage") ? Number(searchParams.get("minPercentage")) : undefined,
    maxPercentage: searchParams.get("maxPercentage") ? Number(searchParams.get("maxPercentage")) : undefined,
    page: parseInt(searchParams.get("page") || "1", 10),
    limit: parseInt(searchParams.get("limit") || "20", 10),
    isExport,
  };

  if (filters.fromDate && filters.toDate && new Date(filters.fromDate) > new Date(filters.toDate)) {
    return NextResponse.json(
      { success: false, error: { message: "From date cannot be later than To date." } },
      { status: 400 }
    );
  }

  const context = {
    userId: user.id,
    userRole: user.role,
    schoolId,
    userName: user.email,
  };

  try {
    let result;
    switch (reportType as AttendanceReportType) {
      case "daily":
        result = await ReportServices.getDailyAttendanceReport(context, filters);
        break;
      case "monthly":
        result = await ReportServices.getMonthlyAttendanceReport(context, filters);
        break;
      case "student-history":
        result = await ReportServices.getStudentAttendanceReport(context, filters);
        break;
      case "class-summary":
        result = await ReportServices.getClassAttendanceReport(context, filters);
        break;
      case "percentage-ranking":
        result = await ReportServices.getAttendancePercentageReport(context, filters);
        break;
      default:
        return NextResponse.json(
          { success: false, error: { message: `Unknown attendance report type: ${reportType}` } },
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
        category: "ATTENDANCE",
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
    console.error(`Error generating attendance report (${reportType}):`, error);
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to generate report." } },
      { status: 500 }
    );
  }
}
