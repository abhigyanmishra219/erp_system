import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/auth/requireStudent";
import connectToDatabase from "@/lib/db";
import Assignment from "@/models/Assignment";
import AssignmentSubmission from "@/models/AssignmentSubmission";
import AcademicYear from "@/models/AcademicYear";
import Subject from "@/models/Subject";
import Class from "@/models/Class";
import Section from "@/models/Section";

export async function GET(req: NextRequest) {
  const auth = await requireStudent(req);
  if (!auth.success) return auth.response;

  const { student, schoolId, classId, sectionId, academicYearId } = auth.context;

  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const requestedYearId = searchParams.get("academicYearId");
  const filterSubjectId = searchParams.get("subjectId");
  const filterStatus = searchParams.get("status"); // e.g. "PENDING", "SUBMITTED", "LATE", "REVIEWED", "OVERDUE"

  // 1. Resolve Academic Year Context
  let targetYearId = academicYearId || student.academicYearId;
  if (requestedYearId) {
    const validYear = await AcademicYear.findOne({
      _id: requestedYearId,
      schoolId,
    }).lean();
    if (validYear) targetYearId = validYear._id;
  }

  // 2. Query assignments for student's class, section, and school
  const assignmentQuery: Record<string, any> = {
    schoolId,
    academicYearId: targetYearId,
    classId,
    sectionId,
    status: "PUBLISHED",
    isActive: true,
  };

  if (filterSubjectId) {
    assignmentQuery.subjectId = filterSubjectId;
  }

  const assignmentsDocs = await Assignment.find(assignmentQuery)
    .populate("subjectId", "name code type")
    .populate("teacherId", "firstName lastName email")
    .populate("academicYearId", "name status")
    .sort({ dueDate: 1 })
    .lean();

  const assignmentIds = assignmentsDocs.map((a: any) => a._id);

  // 3. Query student's own submissions for these assignments
  const submissionsDocs = await AssignmentSubmission.find({
    schoolId,
    studentId: student._id,
    assignmentId: { $in: assignmentIds },
  }).lean();

  const submissionMap = new Map<string, any>();
  submissionsDocs.forEach((sub: any) => {
    submissionMap.set(sub.assignmentId.toString(), sub);
  });

  const now = new Date();

  // 4. Map assignments with submission status
  let assignments = assignmentsDocs.map((a: any) => {
    const sub = submissionMap.get(a._id.toString());
    const isPastDue = now > new Date(a.dueDate);

    let calculatedStatus: "PENDING" | "SUBMITTED" | "LATE" | "REVIEWED" | "OVERDUE" = "PENDING";
    if (sub) {
      calculatedStatus = sub.status;
    } else if (isPastDue) {
      calculatedStatus = "OVERDUE";
    }

    return {
      _id: a._id.toString(),
      title: a.title,
      description: a.description,
      subject: {
        _id: a.subjectId?._id?.toString() || a.subjectId?.toString() || "",
        name: a.subjectId?.name || "Subject",
        code: a.subjectId?.code || "",
        type: a.subjectId?.type || "THEORY",
      },
      teacher: a.teacherId
        ? {
            _id: a.teacherId._id?.toString() || a.teacherId.toString(),
            name: `${a.teacherId.firstName || ""} ${a.teacherId.lastName || ""}`.trim() || "Faculty",
            email: a.teacherId.email || "",
          }
        : null,
      academicYear: {
        _id: a.academicYearId?._id?.toString() || targetYearId.toString(),
        name: a.academicYearId?.name || "Academic Year",
      },
      assignedDate: a.assignedDate,
      dueDate: a.dueDate,
      maximumMarks: a.maximumMarks ?? null,
      attachments: a.attachments || [],
      attachmentCount: a.attachments?.length || 0,
      isOverdue: isPastDue && (!sub || sub.status === "PENDING"),
      submission: sub
        ? {
            _id: sub._id.toString(),
            status: sub.status,
            submittedAt: sub.submittedAt,
            content: sub.content || "",
            attachments: sub.attachments || [],
            marks: sub.marks ?? null,
            feedback: sub.feedback || "",
            reviewedAt: sub.reviewedAt || null,
          }
        : null,
      submissionStatus: calculatedStatus,
    };
  });

  // Apply status filter if provided
  if (filterStatus && filterStatus !== "ALL") {
    assignments = assignments.filter((a) => {
      if (filterStatus === "OVERDUE") return a.submissionStatus === "OVERDUE";
      if (filterStatus === "PENDING") return a.submissionStatus === "PENDING";
      if (filterStatus === "SUBMITTED") return a.submissionStatus === "SUBMITTED";
      if (filterStatus === "LATE") return a.submissionStatus === "LATE";
      if (filterStatus === "REVIEWED") return a.submissionStatus === "REVIEWED";
      return true;
    });
  }

  // Summary counts
  const totalCount = assignmentsDocs.length;
  const submittedCount = submissionsDocs.filter((s: any) => s.status === "SUBMITTED" || s.status === "LATE" || s.status === "REVIEWED").length;
  const reviewedCount = submissionsDocs.filter((s: any) => s.status === "REVIEWED").length;
  const pendingCount = totalCount - submittedCount;

  return NextResponse.json({
    success: true,
    data: {
      summary: {
        total: totalCount,
        pending: pendingCount,
        submitted: submittedCount,
        reviewed: reviewedCount,
      },
      assignments,
    },
  });
}
