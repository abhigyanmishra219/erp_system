import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import ExamTarget from "@/models/ExamTarget";
import AuditLog from "@/models/AuditLog";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string; targetId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId, user } = auth.context;
  const { examId, targetId } = await params;

  if (!mongoose.Types.ObjectId.isValid(examId) || !mongoose.Types.ObjectId.isValid(targetId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid ID parameter" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const target = await ExamTarget.findOne({
      _id: targetId,
      examId,
      schoolId,
      isActive: true,
    });

    if (!target) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Exam target not found" } },
        { status: 404 }
      );
    }

    target.isActive = false;
    target.updatedBy = new mongoose.Types.ObjectId(user.id);
    await target.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "EXAM_TARGET_REMOVED",
      entityType: "EXAM_TARGET",
      entityId: target._id.toString(),
      schoolId,
      metadata: { examId, targetId },
    });

    return NextResponse.json({
      success: true,
      message: "Target section removed from exam",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to remove target" } },
      { status: 500 }
    );
  }
}
