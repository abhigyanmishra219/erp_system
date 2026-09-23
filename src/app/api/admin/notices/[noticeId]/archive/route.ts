import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import Notice from "@/models/Notice";
import AuditLog from "@/models/AuditLog";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ noticeId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId, user } = auth.context;
  const userId = user.id;
  const role = user.role;
  const { noticeId } = await params;

  if (!mongoose.Types.ObjectId.isValid(noticeId)) {
    return NextResponse.json(
      { success: false, error: { message: "Invalid notice ID format" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const notice = await Notice.findOneAndUpdate(
      { _id: noticeId, schoolId, isActive: true },
      {
        $set: {
          status: "ARCHIVED",
          updatedBy: userId as any,
        },
      },
      { new: true }
    );

    if (!notice) {
      return NextResponse.json(
        { success: false, error: { message: "Notice not found" } },
        { status: 404 }
      );
    }

    await AuditLog.create({
      userId,
      userRole: role,
      action: "NOTICE_ARCHIVED",
      entityType: "SCHOOL",
      entityId: noticeId,
      schoolId,
      metadata: { noticeId },
    });

    return NextResponse.json({
      success: true,
      message: "Notice archived successfully",
      data: { notice },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to archive notice" } },
      { status: 500 }
    );
  }
}
