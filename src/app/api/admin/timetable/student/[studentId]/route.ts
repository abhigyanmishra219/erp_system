import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { TimetableService } from "@/lib/services/timetableService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { studentId } = await params;

  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return NextResponse.json(
      { success: false, error: { message: "Invalid student ID format" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const result = await TimetableService.getStudentTimetable(schoolId, studentId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to fetch student timetable" } },
      { status: 500 }
    );
  }
}
