import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { requireModule } from "@/lib/subscription-guard";
import { ReportServices } from "@/lib/reports/reportServices";
import { ReportExportService } from "@/lib/reports/reportExportService";
import { BaseReportFilters, FeeReportType } from "@/lib/reports/types";
import AuditLog from "@/models/AuditLog";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reportType: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "REPORTS");
  if (!subCheck.allowed) return subCheck.response;

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
    status: searchParams.get("status") || undefined,
    paymentMethod: searchParams.get("paymentMethod") || undefined,
    fromDate: searchParams.get("fromDate") || undefined,
    toDate: searchParams.get("toDate") || undefined,
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
    switch (reportType as FeeReportType) {
      case "paid":
        result = await ReportServices.getPaidFeesReport(context, filters);
        break;
      case "pending":
        result = await ReportServices.getPendingFeesReport(context, filters);
        break;
      case "defaulters":
        result = await ReportServices.getDefaultersReport(context, filters);
        break;
      case "collection":
        result = await ReportServices.getCollectionReport(context, filters);
        break;
      case "student-payments":
        result = await ReportServices.getPaymentHistoryReport(context, filters);
        break;
      default:
        return NextResponse.json(
          { success: false, error: { message: `Unknown fee report type: ${reportType}` } },
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
        category: "FEE",
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
    console.error(`Error generating fee report (${reportType}):`, error);
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to generate report." } },
      { status: 500 }
    );
  }
}
