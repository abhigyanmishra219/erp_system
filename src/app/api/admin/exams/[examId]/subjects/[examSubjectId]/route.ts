import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import ExamSubject from "@/models/ExamSubject";
import AuditLog from "@/models/AuditLog";
import { updateExamSubjectSchema } from "@/lib/validation/exam";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string; examSubjectId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "EXAMS");
  if (!subCheck.allowed) return subCheck.response;

  const { schoolId, user } = auth.context;
  const { examId, examSubjectId } = await params;

  if (!mongoose.Types.ObjectId.isValid(examId) || !mongoose.Types.ObjectId.isValid(examSubjectId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid ID parameter" } },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const validated = updateExamSubjectSchema.parse(body);

    await connectToDatabase();

    const subject = await ExamSubject.findOne({
      _id: examSubjectId,
      examId,
      schoolId,
      isActive: true,
    });

    if (!subject) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Exam subject not found" } },
        { status: 404 }
      );
    }

    if (validated.examDate !== undefined) subject.examDate = validated.examDate ? new Date(validated.examDate) : undefined;
    if (validated.maximumMarks !== undefined) subject.maximumMarks = validated.maximumMarks;
    if (validated.passingMarks !== undefined) subject.passingMarks = validated.passingMarks;
    subject.updatedBy = new mongoose.Types.ObjectId(user.id);

    await subject.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "EXAM_SUBJECT_UPDATED",
      entityType: "EXAM_SUBJECT",
      entityId: subject._id.toString(),
      schoolId,
      metadata: { examId, examSubjectId, updates: validated },
    });

    return NextResponse.json({
      success: true,
      message: "Exam subject updated successfully",
      data: {
        subject: {
          id: subject._id.toString(),
          maximumMarks: subject.maximumMarks,
          passingMarks: subject.passingMarks,
          examDate: subject.examDate,
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
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to update exam subject" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string; examSubjectId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "EXAMS");
  if (!subCheck.allowed) return subCheck.response;

  const { schoolId, user } = auth.context;
  const { examId, examSubjectId } = await params;

  if (!mongoose.Types.ObjectId.isValid(examId) || !mongoose.Types.ObjectId.isValid(examSubjectId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid ID parameter" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const subject = await ExamSubject.findOne({
      _id: examSubjectId,
      examId,
      schoolId,
      isActive: true,
    });

    if (!subject) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Exam subject not found" } },
        { status: 404 }
      );
    }

    subject.isActive = false;
    subject.updatedBy = new mongoose.Types.ObjectId(user.id);
    await subject.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "EXAM_SUBJECT_REMOVED",
      entityType: "EXAM_SUBJECT",
      entityId: subject._id.toString(),
      schoolId,
      metadata: { examId, examSubjectId },
    });

    return NextResponse.json({
      success: true,
      message: "Exam subject removed successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to remove exam subject" } },
      { status: 500 }
    );
  }
}
