import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireStudent } from "@/lib/auth/requireStudent";
import connectToDatabase from "@/lib/db";
import { ReportCardService } from "@/lib/services/reportCardService";

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
    // We NEVER trust a studentId from request parameters or body.
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

    // 2. Strict Publication Rule: Only PUBLISHED report cards are accessible by students
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

    // 3. Remove development-only information and localhost references
    if (reportCard.school.website && reportCard.school.website.includes("localhost")) {
      reportCard.school.website = "";
    }
    if (reportCard.school.logo && reportCard.school.logo.includes("localhost")) {
      reportCard.school.logo = "";
    }

    return NextResponse.json({
      success: true,
      data: {
        reportCard,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: error.message || "Failed to retrieve student report card",
        },
      },
      { status: 500 }
    );
  }
}

// Read-only Security Enforcement
export async function POST() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Students cannot create report cards" } },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Students cannot update report cards" } },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Students cannot modify report cards" } },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Students cannot delete report cards" } },
    { status: 405 }
  );
}
