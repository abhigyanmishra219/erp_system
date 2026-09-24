import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireStudent } from "@/lib/auth/requireStudent";
import connectToDatabase from "@/lib/db";
import { ReportCardService } from "@/lib/services/reportCardService";
import { ReportCardPdfService } from "@/lib/services/reportCardPdfService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const auth = await requireStudent(req);
  if (!auth.success) return auth.response;

  const { student, schoolId } = auth.context;
  const { examId } = await params;

  if (!mongoose.Types.ObjectId.isValid(examId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid examination ID" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    // 1. Generate report card for authenticated student ONLY
    const reportCard = await ReportCardService.generateReportCard({
      schoolId,
      examId,
      studentId: student._id,
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

    // 2. Strict Publication Rule: Only PUBLISHED report cards are downloadable by students
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
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed for students" } },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed for students" } },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed for students" } },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed for students" } },
    { status: 405 }
  );
}
