import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import Assignment from "@/models/Assignment";
import AssignmentSubmission from "@/models/AssignmentSubmission";
import AuditLog from "@/models/AuditLog";
import { reviewSubmissionSchema } from "@/lib/validation/assignment";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string; submissionId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "ASSIGNMENTS");
  if (!subCheck.allowed) return subCheck.response!;

  const { schoolId, user } = auth.context;
  const { assignmentId, submissionId } = await params;

  if (!mongoose.Types.ObjectId.isValid(assignmentId) || !mongoose.Types.ObjectId.isValid(submissionId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid assignment or submission ID" } },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const validated = reviewSubmissionSchema.parse(body);

    await connectToDatabase();

    const [assignment, submission] = await Promise.all([
      Assignment.findOne({ _id: assignmentId, schoolId, isActive: true }),
      AssignmentSubmission.findOne({ _id: submissionId, assignmentId, schoolId }),
    ]);

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: { code: "ASSIGNMENT_NOT_FOUND", message: "Assignment not found." } },
        { status: 404 }
      );
    }

    if (!submission) {
      return NextResponse.json(
        { success: false, error: { code: "SUBMISSION_NOT_FOUND", message: "Submission not found." } },
        { status: 404 }
      );
    }

    // Validate maximum marks if assignment defines maximum marks
    if (
      assignment.maximumMarks !== null &&
      assignment.maximumMarks !== undefined &&
      validated.marks !== undefined &&
      validated.marks !== null
    ) {
      if (validated.marks > assignment.maximumMarks) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "MARKS_EXCEED_MAXIMUM",
              message: `Awarded marks (${validated.marks}) cannot exceed the assignment maximum of ${assignment.maximumMarks}.`,
            },
          },
          { status: 400 }
        );
      }
    }

    submission.marks = validated.marks ?? null;
    submission.feedback = validated.feedback || "";
    submission.status = "REVIEWED";
    submission.reviewedBy = user.id;
    submission.reviewedAt = new Date();

    await submission.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "ASSIGNMENT_REVIEWED",
      entityType: "ASSIGNMENT_SUBMISSION",
      entityId: submission._id.toString(),
      schoolId,
      metadata: {
        assignmentId: assignment._id.toString(),
        submissionId: submission._id.toString(),
        studentId: submission.studentId.toString(),
        marks: submission.marks,
        feedback: submission.feedback,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Submission reviewed successfully",
      data: {
        submission: {
          id: submission._id.toString(),
          status: submission.status,
          marks: submission.marks,
          feedback: submission.feedback,
          reviewedAt: submission.reviewedAt,
        },
      },
    });
  } catch (error: any) {
    if (error.issues) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Validation failed", details: error.issues } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to review submission" } },
      { status: 500 }
    );
  }
}
