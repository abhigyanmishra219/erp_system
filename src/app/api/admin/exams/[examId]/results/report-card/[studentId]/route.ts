import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import { ReportCardService } from "@/lib/services/reportCardService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string; studentId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { examId, studentId } = await params;

  if (!mongoose.Types.ObjectId.isValid(examId) || !mongoose.Types.ObjectId.isValid(studentId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid ID parameters" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const reportCard = await ReportCardService.generateReportCard({
      schoolId,
      examId,
      studentId,
    });

    if (!reportCard) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Report card data not found for this student and exam." } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        reportCard,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to generate report card" } },
      { status: 500 }
    );
  }
}
