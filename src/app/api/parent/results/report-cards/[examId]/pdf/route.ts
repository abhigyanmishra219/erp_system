import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireParent } from "@/lib/auth/requireParent";
import connectToDatabase from "@/lib/db";
import { ReportCardService } from "@/lib/services/reportCardService";
import { ReportCardPdfService } from "@/lib/services/reportCardPdfService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const auth = await requireParent(req);
    if (!auth.success) return auth.response;

    const { schoolId, childIds } = auth.context;
    const { examId } = await params;

    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ID", message: "Invalid examination ID" } },
        { status: 400 }
      );
    }

    if (!childIds || childIds.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "NO_CHILDREN", message: "No linked children found." } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedStudentId = searchParams.get("studentId");

    let activeStudentId = childIds[0];
    if (requestedStudentId) {
      if (!childIds.includes(requestedStudentId)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN_CHILD_ACCESS",
              message: "Access denied. The requested student is not linked to your parent account.",
            },
          },
          { status: 403 }
        );
      }
      activeStudentId = requestedStudentId;
    }

    await connectToDatabase();

    // 1. Generate report card using existing ReportCardService
    const reportCard = await ReportCardService.generateReportCard({
      schoolId,
      examId,
      studentId: new mongoose.Types.ObjectId(activeStudentId),
    });

    if (!reportCard) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "REPORT_CARD_NOT_FOUND",
            message: "Report card not found for this examination.",
          },
        },
        { status: 404 }
      );
    }

    // 2. Strict Publication Rule: Only PUBLISHED report cards are downloadable
    if (reportCard.resultStatus !== "PUBLISHED") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "REPORT_CARD_NOT_PUBLISHED",
            message: "Official report card for this examination has not been published yet.",
          },
        },
        { status: 404 }
      );
    }

    // 3. Generate PDF Buffer using existing ReportCardPdfService
    const pdfBuffer = await ReportCardPdfService.generateReportCardPdf(reportCard);

    // 4. Generate clean, sanitized filename
    const safeExamName = reportCard.exam.name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    const safeStudentName = reportCard.student.name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    const filename = `report_card_${safeExamName}_${safeStudentName}.pdf`;

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("Error generating report card PDF for parent:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: error.message || "Failed to generate report card PDF",
        },
      },
      { status: 500 }
    );
  }
}

// Read-only Security Enforcement
export async function POST() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Parents cannot create or modify report card PDFs" } },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Parents cannot modify report card PDFs" } },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Parents cannot modify report card PDFs" } },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Parents cannot delete report card PDFs" } },
    { status: 405 }
  );
}
