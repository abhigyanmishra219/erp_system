import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import Teacher from "@/models/Teacher";
import TeacherAssignment from "@/models/TeacherAssignment";
import Exam from "@/models/Exam";
import ExamTarget from "@/models/ExamTarget";
import ExamSubject from "@/models/ExamSubject";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "EXAMS");
  if (!subCheck.allowed) return subCheck.response;

  const { schoolId } = auth.context;
  const { teacherId } = await params;

  if (!mongoose.Types.ObjectId.isValid(teacherId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid teacher ID" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const teacher = await Teacher.findOne({ _id: teacherId, schoolId }).lean();
    if (!teacher) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Teacher not found" } },
        { status: 404 }
      );
    }

    // Find all active teacher assignments for this teacher
    const assignments = await TeacherAssignment.find({
      schoolId,
      teacherId,
      isActive: true,
    })
      .populate("academicYearId", "name status")
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .populate("subjectId", "name code")
      .lean();

    // Find active exams matching these academic years
    const academicYearIds = Array.from(
      new Set(assignments.map((a: any) => (a.academicYearId?._id || a.academicYearId)?.toString()).filter(Boolean))
    );

    const exams = await Exam.find({
      schoolId,
      academicYearId: { $in: academicYearIds },
      isActive: true,
    })
      .populate("academicYearId", "name")
      .sort({ startDate: -1 })
      .lean();

    const formattedList = assignments.map((a: any) => ({
      id: a._id.toString(),
      academicYear: a.academicYearId ? { name: a.academicYearId.name } : null,
      class: a.classId ? { id: a.classId._id.toString(), name: a.classId.name } : null,
      section: a.sectionId ? { id: a.sectionId._id.toString(), name: a.sectionId.name } : null,
      subject: a.subjectId ? { id: a.subjectId._id.toString(), name: a.subjectId.name, code: a.subjectId.code } : null,
      assignmentType: a.assignmentType,
    }));

    return NextResponse.json({
      success: true,
      data: {
        teacher: {
          id: teacher._id.toString(),
          name: `${teacher.firstName} ${teacher.lastName}`,
        },
        assignments: formattedList,
        exams: exams.map((e: any) => ({
          id: e._id.toString(),
          name: e.name,
          startDate: e.startDate,
          endDate: e.endDate,
          status: e.status,
          academicYear: e.academicYearId ? { name: e.academicYearId.name } : null,
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch teacher exams" } },
      { status: 500 }
    );
  }
}
