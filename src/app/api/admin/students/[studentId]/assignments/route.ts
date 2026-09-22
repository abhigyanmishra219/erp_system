import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Student from "@/models/Student";
import Assignment from "@/models/Assignment";
import AssignmentSubmission from "@/models/AssignmentSubmission";

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
      { success: false, error: { code: "INVALID_ID", message: "Invalid student ID" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const student = await Student.findOne({ _id: studentId, schoolId }).lean();
    if (!student) {
      return NextResponse.json(
        { success: false, error: { code: "STUDENT_NOT_FOUND", message: "Student not found." } },
        { status: 404 }
      );
    }

    // Fetch assignments for student's class, section, and academic year
    const assignments = await Assignment.find({
      schoolId,
      academicYearId: student.academicYearId,
      classId: student.classId,
      sectionId: student.sectionId,
      isActive: true,
    })
      .populate("subjectId", "name code")
      .populate("teacherId", "firstName lastName")
      .sort({ dueDate: -1 })
      .lean();

    const assignmentIds = assignments.map((a) => a._id);

    // Fetch student's submissions
    const submissions = await AssignmentSubmission.find({
      schoolId,
      assignmentId: { $in: assignmentIds },
      studentId: student._id,
    }).lean();

    const submissionMap = new Map<string, any>();
    for (const sub of submissions) {
      submissionMap.set(sub.assignmentId.toString(), sub);
    }

    const formattedList = assignments.map((a: any) => {
      const sub = submissionMap.get(a._id.toString());
      return {
        id: a._id.toString(),
        title: a.title,
        description: a.description,
        subject: a.subjectId ? { id: a.subjectId._id?.toString(), name: a.subjectId.name, code: a.subjectId.code } : null,
        teacher: a.teacherId ? { id: a.teacherId._id?.toString(), name: `${a.teacherId.firstName} ${a.teacherId.lastName}` } : null,
        assignedDate: a.assignedDate,
        dueDate: a.dueDate,
        maximumMarks: a.maximumMarks,
        submission: sub
          ? {
              id: sub._id.toString(),
              status: sub.status,
              submittedAt: sub.submittedAt,
              marks: sub.marks,
              feedback: sub.feedback,
            }
          : {
              status: "PENDING",
              submittedAt: null,
              marks: null,
              feedback: "",
            },
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: student._id.toString(),
          name: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
        },
        assignments: formattedList,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch student assignments" } },
      { status: 500 }
    );
  }
}
