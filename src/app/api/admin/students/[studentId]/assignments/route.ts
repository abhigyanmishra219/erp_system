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

    let submittedCount = 0;
    let lateCount = 0;
    let reviewedCount = 0;
    let totalScorePercentageSum = 0;
    let reviewedWithScoreCount = 0;

    const formattedList = assignments.map((a: any) => {
      const sub = submissionMap.get(a._id.toString());
      if (sub) {
        if (sub.status === "SUBMITTED") submittedCount++;
        else if (sub.status === "LATE") lateCount++;
        else if (sub.status === "REVIEWED") {
          reviewedCount++;
          if (typeof sub.marks === "number" && a.maximumMarks && a.maximumMarks > 0) {
            totalScorePercentageSum += (sub.marks / a.maximumMarks) * 100;
            reviewedWithScoreCount++;
          }
        }
      }

      return {
        id: a._id.toString(),
        assignmentId: a._id.toString(),
        title: a.title,
        description: a.description,
        subject: a.subjectId ? { id: a.subjectId._id?.toString(), name: a.subjectId.name, code: a.subjectId.code } : null,
        teacher: a.teacherId
          ? {
              id: a.teacherId._id?.toString(),
              name: `${a.teacherId.firstName} ${a.teacherId.lastName}`.trim(),
              firstName: a.teacherId.firstName,
              lastName: a.teacherId.lastName,
            }
          : null,
        assignedDate: a.assignedDate,
        dueDate: a.dueDate,
        maximumMarks: a.maximumMarks,
        totalMarks: a.maximumMarks,
        status: sub ? sub.status : "PENDING",
        submission: sub
          ? {
              id: sub._id.toString(),
              status: sub.status,
              submittedAt: sub.submittedAt,
              marks: sub.marks,
              marksObtained: sub.marks,
              feedback: sub.feedback,
            }
          : null,
      };
    });

    const total = assignments.length;
    const pendingCount = total - (submittedCount + lateCount + reviewedCount);
    const averagePercentage = reviewedWithScoreCount > 0 ? Math.round(totalScorePercentageSum / reviewedWithScoreCount) : null;

    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: student._id.toString(),
          name: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
        },
        summary: {
          total,
          submitted: submittedCount + reviewedCount,
          pending: Math.max(0, pendingCount),
          late: lateCount,
          reviewed: reviewedCount,
          averagePercentage,
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
