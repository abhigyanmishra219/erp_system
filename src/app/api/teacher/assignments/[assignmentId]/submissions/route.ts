import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTeacher } from "@/lib/auth/requireTeacher";
import connectToDatabase from "@/lib/db";
import Assignment from "@/models/Assignment";
import AssignmentSubmission from "@/models/AssignmentSubmission";
import Student from "@/models/Student";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ assignmentId: string }> }
) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const { teacher, schoolId } = auth.context;
  const { assignmentId } = await context.params;

  if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
    return NextResponse.json({ success: false, error: "Invalid assignment ID." }, { status: 400 });
  }

  await connectToDatabase();

  // 1. Verify Assignment belongs to teacher & school
  const assignment = await Assignment.findOne({
    _id: assignmentId,
    schoolId,
    teacherId: teacher._id,
    isActive: true,
  })
    .populate("classId", "name code")
    .populate("sectionId", "name")
    .populate("subjectId", "name code")
    .lean();

  if (!assignment) {
    return NextResponse.json(
      { success: false, error: "Assignment not found or access denied." },
      { status: 404 }
    );
  }

  // 2. Fetch all enrolled students in assignment's Class & Section
  const students = await Student.find({
    schoolId,
    classId: assignment.classId,
    sectionId: assignment.sectionId,
    status: { $in: ["ACTIVE", "INACTIVE"] },
  })
    .sort({ rollNumber: 1, firstName: 1, lastName: 1 })
    .lean();

  // 3. Fetch all submissions for this assignment
  const submissions = await AssignmentSubmission.find({
    schoolId,
    assignmentId: assignment._id,
  })
    .populate("reviewedBy", "name email")
    .lean();

  const submissionMap = new Map(submissions.map((s: any) => [s.studentId.toString(), s]));

  let submittedCount = 0;
  let reviewedCount = 0;
  let lateCount = 0;
  let unsubmittedCount = 0;

  const submissionRoster = students.map((st: any) => {
    const stId = st._id.toString();
    const sub = submissionMap.get(stId);

    if (sub) {
      if (sub.status === "REVIEWED") reviewedCount++;
      else if (sub.status === "LATE") lateCount++;
      else submittedCount++;
    } else {
      unsubmittedCount++;
    }

    return {
      studentId: stId,
      fullName: `${st.firstName} ${st.lastName}`.trim(),
      admissionNumber: st.admissionNumber,
      rollNumber: st.rollNumber || "—",
      avatarUrl: st.avatarUrl || "",
      submission: sub
        ? {
            _id: sub._id.toString(),
            status: sub.status,
            submittedAt: sub.submittedAt,
            content: sub.content || "",
            attachments: sub.attachments || [],
            marks: sub.marks ?? null,
            feedback: sub.feedback || "",
            reviewedByName: (sub.reviewedBy as any)?.name || null,
            reviewedAt: sub.reviewedAt || null,
          }
        : null,
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      assignment: {
        _id: assignment._id.toString(),
        title: assignment.title,
        description: assignment.description,
        className: (assignment.classId as any)?.name || "Class",
        sectionName: (assignment.sectionId as any)?.name || "Section",
        subjectName: (assignment.subjectId as any)?.name || "Subject",
        assignedDate: assignment.assignedDate,
        dueDate: assignment.dueDate,
        maximumMarks: assignment.maximumMarks,
        attachments: assignment.attachments || [],
        status: assignment.status,
      },
      summary: {
        totalStudents: students.length,
        submittedCount: submittedCount + lateCount + reviewedCount,
        reviewedCount,
        pendingReviewCount: submittedCount + lateCount,
        unsubmittedCount,
      },
      submissions: submissionRoster,
    },
  });
}
