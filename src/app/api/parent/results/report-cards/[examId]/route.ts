import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireParent } from "@/lib/auth/requireParent";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import { ReportCardService } from "@/lib/services/reportCardService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const auth = await requireParent(req);
    if (!auth.success) return auth.response;

    const subCheck = requireModule(auth.context.school, "RESULTS");
    if (!subCheck.allowed) return subCheck.response;

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

    // 2. Strict Publication Rule: Only PUBLISHED report cards are accessible
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
    console.error("Error fetching single report card for parent:", error);
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
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Parents cannot create report cards" } },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Parents cannot update report cards" } },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Parents cannot modify report cards" } },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Parents cannot delete report cards" } },
    { status: 405 }
  );
}
