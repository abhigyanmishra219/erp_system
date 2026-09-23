import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireStudent } from "@/lib/auth/requireStudent";
import connectToDatabase from "@/lib/db";
import Assignment from "@/models/Assignment";
import AssignmentSubmission from "@/models/AssignmentSubmission";
import { createAuditLog } from "@/lib/audit";
import { submitAssignmentSchema } from "@/lib/validation/assignment";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ assignmentId: string }> }
) {
  const auth = await requireStudent(req);
  if (!auth.success) return auth.response;

  const { user, student, schoolId } = auth.context;
  const { assignmentId } = await context.params;

  if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
    return NextResponse.json({ success: false, error: "Invalid Assignment ID." }, { status: 400 });
  }

  try {
    const body = await req.json();
    const validatedData = submitAssignmentSchema.parse(body);

    await connectToDatabase();

    // 1. Verify that the assignment exists and is assigned to this student's class and section
    const assignment = await Assignment.findOne({
      _id: assignmentId,
      schoolId,
      classId: student.classId,
      sectionId: student.sectionId,
      status: "PUBLISHED",
      isActive: true,
    });

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: "Assignment not found or not eligible for submission." },
        { status: 404 }
      );
    }

    // 2. Check if existing submission has already been graded/reviewed by teacher
    const existingSubmission = await AssignmentSubmission.findOne({
      schoolId,
      assignmentId: assignment._id,
      studentId: student._id,
    });

    if (existingSubmission && existingSubmission.status === "REVIEWED") {
      return NextResponse.json(
        {
          success: false,
          error: "This assignment has already been reviewed and graded. Resubmission is not permitted.",
        },
        { status: 400 }
      );
    }

    // 3. Determine if submission is on-time or late
    const now = new Date();
    const isLate = now > new Date(assignment.dueDate);
    const submissionStatus = isLate ? "LATE" : "SUBMITTED";

    // 4. Upsert submission record
    const submission = await AssignmentSubmission.findOneAndUpdate(
      {
        schoolId,
        assignmentId: assignment._id,
        studentId: student._id,
      },
      {
        $set: {
          academicYearId: student.academicYearId,
          classId: student.classId,
          sectionId: student.sectionId,
          submittedAt: now,
          status: submissionStatus,
          content: validatedData.content || "",
          attachments: validatedData.attachments || [],
        },
      },
      { upsert: true, returnDocument: "after", runValidators: true }
    );

    // 5. Audit Logging
    await createAuditLog({
      schoolId: schoolId.toString(),
      userId: user._id.toString(),
      userRole: "STUDENT",
      action: "CREATE",
      entityType: "ASSIGNMENT_SUBMISSION",
      entityId: submission._id.toString(),
      metadata: {
        assignmentId: assignment._id.toString(),
        studentId: student._id.toString(),
        status: submissionStatus,
        isLate,
        attachmentCount: validatedData.attachments?.length || 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: isLate ? "Assignment submitted (Marked as Late)" : "Assignment submitted successfully!",
      data: submission,
    });
  } catch (error: any) {
    console.error("Assignment submission error:", error);
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit assignment" },
      { status: 500 }
    );
  }
}
