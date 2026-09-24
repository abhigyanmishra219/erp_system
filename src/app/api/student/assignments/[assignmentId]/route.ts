import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireStudent } from "@/lib/auth/requireStudent";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import Assignment from "@/models/Assignment";
import AssignmentSubmission from "@/models/AssignmentSubmission";
import Subject from "@/models/Subject";
import Class from "@/models/Class";
import Section from "@/models/Section";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ assignmentId: string }> }
) {
  const auth = await requireStudent(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "ASSIGNMENTS");
  if (!subCheck.allowed) return subCheck.response!;

  const { student, schoolId } = auth.context;
  const { assignmentId } = await context.params;

  if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
    return NextResponse.json({ success: false, error: "Invalid Assignment ID." }, { status: 400 });
  }

  await connectToDatabase();

  // Strictly verify that the assignment belongs to student's school, class, and section
  const assignment = await Assignment.findOne({
    _id: assignmentId,
    schoolId,
    classId: student.classId,
    sectionId: student.sectionId,
    status: "PUBLISHED",
    isActive: true,
  })
    .populate("subjectId", "name code type")
    .populate("teacherId", "firstName lastName email")
    .populate("academicYearId", "name status")
    .lean();

  if (!assignment) {
    return NextResponse.json(
      { success: false, error: "Assignment not found or not accessible." },
      { status: 404 }
    );
  }

  // Fetch student's own submission for this assignment
  const submission = await AssignmentSubmission.findOne({
    schoolId,
    studentId: student._id,
    assignmentId: assignment._id,
  }).lean();

  const now = new Date();
  const isPastDue = now > new Date(assignment.dueDate);

  let calculatedStatus: "PENDING" | "SUBMITTED" | "LATE" | "REVIEWED" | "OVERDUE" = "PENDING";
  if (submission) {
    calculatedStatus = submission.status;
  } else if (isPastDue) {
    calculatedStatus = "OVERDUE";
  }

  return NextResponse.json({
    success: true,
    data: {
      _id: (assignment as any)._id.toString(),
      title: (assignment as any).title,
      description: (assignment as any).description,
      subject: {
        _id: (assignment as any).subjectId?._id?.toString() || (assignment as any).subjectId?.toString() || "",
        name: (assignment as any).subjectId?.name || "Subject",
        code: (assignment as any).subjectId?.code || "",
        type: (assignment as any).subjectId?.type || "THEORY",
      },
      teacher: (assignment as any).teacherId
        ? {
            _id: (assignment as any).teacherId._id?.toString() || (assignment as any).teacherId.toString(),
            name: `${(assignment as any).teacherId.firstName || ""} ${(assignment as any).teacherId.lastName || ""}`.trim() || "Faculty",
            email: (assignment as any).teacherId.email || "",
          }
        : null,
      academicYear: {
        _id: (assignment as any).academicYearId?._id?.toString() || (assignment as any).academicYearId?.toString() || "",
        name: (assignment as any).academicYearId?.name || "Academic Year",
      },
      assignedDate: (assignment as any).assignedDate,
      dueDate: (assignment as any).dueDate,
      maximumMarks: (assignment as any).maximumMarks ?? null,
      attachments: (assignment as any).attachments || [],
      isOverdue: isPastDue && (!submission || submission.status === "PENDING"),
      submission: submission
        ? {
            _id: (submission as any)._id.toString(),
            status: submission.status,
            submittedAt: submission.submittedAt,
            content: submission.content || "",
            attachments: submission.attachments || [],
            marks: submission.marks ?? null,
            feedback: submission.feedback || "",
            reviewedAt: submission.reviewedAt || null,
          }
        : null,
      submissionStatus: calculatedStatus,
    },
  });
}
