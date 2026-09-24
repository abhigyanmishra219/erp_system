import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTeacher } from "@/lib/auth/requireTeacher";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import Assignment from "@/models/Assignment";
import AssignmentSubmission from "@/models/AssignmentSubmission";
import { createAuditLog } from "@/lib/audit";
import { reviewSubmissionSchema } from "@/lib/validation/assignment";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ assignmentId: string; submissionId: string }> }
) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "ASSIGNMENTS");
  if (!subCheck.allowed) return subCheck.response!;

  const { user, teacher, schoolId } = auth.context;
  const { assignmentId, submissionId } = await context.params;

  if (!mongoose.Types.ObjectId.isValid(assignmentId) || !mongoose.Types.ObjectId.isValid(submissionId)) {
    return NextResponse.json({ success: false, error: "Invalid ID parameters." }, { status: 400 });
  }

  try {
    const body = await req.json();
    const validatedData = reviewSubmissionSchema.parse(body);

    await connectToDatabase();

    // 1. Verify Assignment Ownership
    const assignment = await Assignment.findOne({
      _id: assignmentId,
      schoolId,
      teacherId: teacher._id,
      isActive: true,
    });

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: "Assignment not found or access denied." },
        { status: 404 }
      );
    }

    // 2. Validate Marks boundary against Maximum Marks
    if (
      validatedData.marks !== null &&
      validatedData.marks !== undefined &&
      assignment.maximumMarks !== null &&
      assignment.maximumMarks !== undefined
    ) {
      if (validatedData.marks > assignment.maximumMarks) {
        return NextResponse.json(
          {
            success: false,
            error: `Marks awarded (${validatedData.marks}) cannot exceed the assignment maximum marks (${assignment.maximumMarks}).`,
          },
          { status: 400 }
        );
      }
    }

    // 3. Update Submission Record
    const submission = await AssignmentSubmission.findOne({
      _id: submissionId,
      schoolId,
      assignmentId: assignment._id,
    });

    if (!submission) {
      return NextResponse.json(
        { success: false, error: "Submission record not found for this assignment." },
        { status: 404 }
      );
    }

    submission.marks = validatedData.marks ?? null;
    submission.feedback = validatedData.feedback || "";
    submission.status = "REVIEWED";
    submission.reviewedBy = user.id;
    submission.reviewedAt = new Date();
    await submission.save();

    // 4. Audit Log
    await createAuditLog({
      userId: user.id,
      userRole: "TEACHER",
      action: "SUBMISSION_REVIEWED",
      entityType: "ASSIGNMENT_SUBMISSION",
      entityId: submission._id.toString(),
      schoolId,
      metadata: {
        assignmentId: assignment._id.toString(),
        assignmentTitle: assignment.title,
        studentId: submission.studentId.toString(),
        marksAwarded: validatedData.marks,
        maximumMarks: assignment.maximumMarks,
      },
    });

    if (validatedData.marks !== null && validatedData.marks !== undefined) {
      await createAuditLog({
        userId: user.id,
        userRole: "TEACHER",
        action: "ASSIGNMENT_MARKED",
        entityType: "ASSIGNMENT_SUBMISSION",
        entityId: submission._id.toString(),
        schoolId,
        metadata: {
          assignmentId: assignment._id.toString(),
          studentId: submission.studentId.toString(),
          marks: validatedData.marks,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Submission evaluated and marks recorded successfully.",
      data: submission,
    });
  } catch (error: any) {
    console.error("Review submission error:", error);
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Validation failed on grading data.", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to evaluate submission." },
      { status: 500 }
    );
  }
}
