import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Assignment from "@/models/Assignment";
import AssignmentSubmission from "@/models/AssignmentSubmission";
import Student from "@/models/Student";
import AuditLog from "@/models/AuditLog";
import { updateAssignmentSchema } from "@/lib/validation/assignment";
import { normalizeAttendanceDate } from "@/lib/utils/date";
import { FileStorageService } from "@/lib/services/fileStorage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { assignmentId } = await params;

  if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid assignment ID" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const assignment = await Assignment.findOne({
      _id: assignmentId,
      schoolId,
    })
      .populate("academicYearId", "name status")
      .populate("classId", "name code")
      .populate("sectionId", "name code capacity")
      .populate("subjectId", "name code")
      .populate("teacherId", "firstName lastName email teacherId")
      .lean();

    if (!assignment || !assignment.isActive) {
      return NextResponse.json(
        { success: false, error: { code: "ASSIGNMENT_NOT_FOUND", message: "Assignment not found." } },
        { status: 404 }
      );
    }

    // Fetch all eligible students in the target class and section
    const enrolledStudents = await Student.find({
      schoolId,
      academicYearId: (assignment.academicYearId as any)?._id || assignment.academicYearId,
      classId: (assignment.classId as any)?._id || assignment.classId,
      sectionId: (assignment.sectionId as any)?._id || assignment.sectionId,
      status: { $in: ["ACTIVE", "INACTIVE"] },
    })
      .sort({ rollNumber: 1, firstName: 1, lastName: 1 })
      .lean();

    // Fetch existing submissions for this assignment
    const submissions = await AssignmentSubmission.find({
      schoolId,
      assignmentId: assignment._id,
    })
      .populate("reviewedBy", "name email")
      .lean();

    const submissionMap = new Map<string, any>();
    for (const sub of submissions) {
      submissionMap.set(sub.studentId.toString(), sub);
    }

    let submittedCount = 0;
    let lateCount = 0;
    let reviewedCount = 0;
    let pendingCount = 0;

    const rosterSubmissions = enrolledStudents.map((st: any) => {
      const sub = submissionMap.get(st._id.toString());
      const status = sub ? sub.status : "PENDING";

      if (status === "SUBMITTED") submittedCount++;
      else if (status === "LATE") lateCount++;
      else if (status === "REVIEWED") reviewedCount++;
      else pendingCount++;

      return {
        student: {
          id: st._id.toString(),
          name: `${st.firstName} ${st.lastName}`,
          admissionNumber: st.admissionNumber,
          rollNumber: st.rollNumber || "",
          gender: st.gender,
        },
        submission: sub
          ? {
              id: sub._id.toString(),
              status: sub.status,
              submittedAt: sub.submittedAt,
              content: sub.content,
              attachments: sub.attachments || [],
              marks: sub.marks,
              feedback: sub.feedback,
              reviewedBy: sub.reviewedBy ? { name: (sub.reviewedBy as any).name } : null,
              reviewedAt: sub.reviewedAt,
            }
          : null,
      };
    });

    const summary = {
      totalStudents: enrolledStudents.length,
      pendingCount,
      submittedCount,
      lateCount,
      reviewedCount,
      completionRate:
        enrolledStudents.length > 0
          ? Number((((submittedCount + lateCount + reviewedCount) / enrolledStudents.length) * 100).toFixed(1))
          : 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        assignment: {
          id: assignment._id.toString(),
          title: assignment.title,
          description: assignment.description,
          academicYear: assignment.academicYearId,
          class: assignment.classId,
          section: assignment.sectionId,
          subject: assignment.subjectId,
          teacher: assignment.teacherId,
          assignedDate: assignment.assignedDate,
          dueDate: assignment.dueDate,
          maximumMarks: assignment.maximumMarks,
          attachments: assignment.attachments || [],
          status: assignment.status,
          createdAt: assignment.createdAt,
          updatedAt: assignment.updatedAt,
        },
        summary,
        roster: rosterSubmissions,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch assignment details" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId, user } = auth.context;
  const { assignmentId } = await params;

  if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid assignment ID" } },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const validated = updateAssignmentSchema.parse(body);

    await connectToDatabase();

    const assignment = await Assignment.findOne({ _id: assignmentId, schoolId });
    if (!assignment || !assignment.isActive) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Assignment not found." } },
        { status: 404 }
      );
    }

    if (validated.title !== undefined) assignment.title = validated.title;
    if (validated.description !== undefined) assignment.description = validated.description;
    if (validated.assignedDate) assignment.assignedDate = normalizeAttendanceDate(validated.assignedDate);
    if (validated.dueDate) assignment.dueDate = normalizeAttendanceDate(validated.dueDate);
    if (validated.maximumMarks !== undefined) assignment.maximumMarks = validated.maximumMarks;
    if (validated.status) assignment.status = validated.status;
    if (validated.isActive !== undefined) assignment.isActive = validated.isActive;

    if (validated.attachments) {
      assignment.attachments = validated.attachments.map((att) =>
        FileStorageService.sanitizeAttachment(att)
      );
    }

    assignment.updatedBy = user.id;
    await assignment.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "ASSIGNMENT_UPDATED",
      entityType: "ASSIGNMENT",
      entityId: assignment._id.toString(),
      schoolId,
      metadata: {
        assignmentId: assignment._id.toString(),
        title: assignment.title,
        updatedFields: Object.keys(validated),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Assignment updated successfully",
      data: { assignment },
    });
  } catch (error: any) {
    if (error.issues) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Validation failed", details: error.issues } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to update assignment" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId, user } = auth.context;
  const { assignmentId } = await params;

  if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid assignment ID" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const assignment = await Assignment.findOne({ _id: assignmentId, schoolId });
    if (!assignment) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Assignment not found." } },
        { status: 404 }
      );
    }

    // Soft delete
    assignment.isActive = false;
    assignment.status = "ARCHIVED";
    assignment.updatedBy = user.id;
    await assignment.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "ASSIGNMENT_DELETED",
      entityType: "ASSIGNMENT",
      entityId: assignment._id.toString(),
      schoolId,
      metadata: {
        assignmentId: assignment._id.toString(),
        title: assignment.title,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Assignment archived successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to delete assignment" } },
      { status: 500 }
    );
  }
}
