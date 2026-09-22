import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Assignment from "@/models/Assignment";
import AssignmentSubmission from "@/models/AssignmentSubmission";
import Student from "@/models/Student";
import AuditLog from "@/models/AuditLog";
import { submitAssignmentSchema } from "@/lib/validation/assignment";
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

    const submissions = await AssignmentSubmission.find({
      schoolId,
      assignmentId,
    })
      .populate("studentId", "firstName lastName admissionNumber rollNumber gender")
      .populate("reviewedBy", "name email")
      .sort({ submittedAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: { submissions },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch submissions" } },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const validated = submitAssignmentSchema.parse(body);

    await connectToDatabase();

    // 1. Fetch assignment
    const assignment = await Assignment.findOne({ _id: assignmentId, schoolId, isActive: true });
    if (!assignment) {
      return NextResponse.json(
        { success: false, error: { code: "ASSIGNMENT_NOT_FOUND", message: "Assignment not found or inactive." } },
        { status: 404 }
      );
    }

    // 2. Resolve target student
    let targetStudentId = validated.studentId;

    if ((user.role as string) === "STUDENT") {
      const studentProfile = await Student.findOne({ schoolId, userId: user.id, status: "ACTIVE" }).lean();
      if (!studentProfile) {
        return NextResponse.json(
          { success: false, error: { code: "STUDENT_NOT_FOUND", message: "Student profile not found for this user." } },
          { status: 403 }
        );
      }
      targetStudentId = studentProfile._id.toString();
    }

    if (!targetStudentId || !mongoose.Types.ObjectId.isValid(targetStudentId)) {
      return NextResponse.json(
        { success: false, error: { code: "STUDENT_REQUIRED", message: "A valid student ID is required." } },
        { status: 400 }
      );
    }

    // 3. Verify student eligibility: must belong to the assignment's school, academicYear, class, and section
    const studentDoc = await Student.findOne({
      _id: targetStudentId,
      schoolId,
      academicYearId: assignment.academicYearId,
      classId: assignment.classId,
      sectionId: assignment.sectionId,
      status: { $in: ["ACTIVE", "INACTIVE"] },
    }).lean();

    if (!studentDoc) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "STUDENT_NOT_ELIGIBLE",
            message: "This student does not belong to the assignment's class and section.",
          },
        },
        { status: 400 }
      );
    }

    // 4. Calculate submission status based on due date
    const now = new Date();
    const isLate = now.getTime() > new Date(assignment.dueDate).getTime();
    const initialStatus = isLate ? "LATE" : "SUBMITTED";

    // 5. Sanitize attachments
    const sanitizedAttachments = (validated.attachments || []).map((att) =>
      FileStorageService.sanitizeAttachment(att)
    );

    // 6. Upsert submission document (single submission record per student per assignment)
    const existingSubmission = await AssignmentSubmission.findOne({
      schoolId,
      assignmentId: assignment._id,
      studentId: studentDoc._id,
    });

    const isResubmission = !!existingSubmission;

    const submission = await AssignmentSubmission.findOneAndUpdate(
      {
        schoolId,
        assignmentId: assignment._id,
        studentId: studentDoc._id,
      },
      {
        $set: {
          academicYearId: assignment.academicYearId,
          classId: assignment.classId,
          sectionId: assignment.sectionId,
          submittedAt: now,
          status: initialStatus,
          content: validated.content || "",
          attachments: sanitizedAttachments,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 7. Audit Log
    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: isResubmission ? "ASSIGNMENT_RESUBMITTED" : "ASSIGNMENT_SUBMITTED",
      entityType: "ASSIGNMENT_SUBMISSION",
      entityId: submission._id.toString(),
      schoolId,
      metadata: {
        assignmentId: assignment._id.toString(),
        studentId: studentDoc._id.toString(),
        status: initialStatus,
        isLate,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: isLate ? "Assignment submitted (Marked Late)" : "Assignment submitted successfully",
        data: {
          submission: {
            id: submission._id.toString(),
            status: submission.status,
            submittedAt: submission.submittedAt,
            attachmentsCount: submission.attachments.length,
          },
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.issues) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid submission data", details: error.issues } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to submit assignment" } },
      { status: 500 }
    );
  }
}
