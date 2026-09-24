import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { requireModule } from "@/lib/subscription-guard";
import { TimetableService } from "@/lib/services/timetableService";
import AcademicYear from "@/models/AcademicYear";
import Teacher from "@/models/Teacher";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "TIMETABLE");
  if (!subCheck.allowed) return subCheck.response;

  const { schoolId } = auth.context;
  const { teacherId } = await params;

  if (!mongoose.Types.ObjectId.isValid(teacherId)) {
    return NextResponse.json(
      { success: false, error: { message: "Invalid teacher ID format" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const teacher = await Teacher.findOne({
      _id: teacherId,
      schoolId,
      status: "ACTIVE",
    }).lean();

    if (!teacher) {
      return NextResponse.json(
        { success: false, error: { message: "Active teacher not found in this school" } },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    let academicYearId = searchParams.get("academicYearId");

    if (!academicYearId) {
      const currentYear = await AcademicYear.findOne({ schoolId, status: "ACTIVE" }).lean();
      if (currentYear) {
        academicYearId = currentYear._id.toString();
      }
    }

    if (!academicYearId) {
      return NextResponse.json(
        { success: false, error: { message: "Academic year is required or no active academic year found" } },
        { status: 400 }
      );
    }

    const result = await TimetableService.getTeacherTimetable(schoolId, academicYearId, teacherId);

    return NextResponse.json({
      success: true,
      data: {
        teacher: {
          id: teacher._id.toString(),
          name: `${teacher.firstName} ${teacher.lastName}`.trim(),
          email: teacher.email,
        },
        ...result,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to fetch teacher timetable" } },
      { status: 500 }
    );
  }
}
