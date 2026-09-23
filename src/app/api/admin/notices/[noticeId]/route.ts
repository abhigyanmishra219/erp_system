import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import Notice from "@/models/Notice";
import Class from "@/models/Class";
import Section from "@/models/Section";
import AuditLog from "@/models/AuditLog";
import { updateNoticeSchema } from "@/lib/validation/notice";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ noticeId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { noticeId } = await params;

  if (!mongoose.Types.ObjectId.isValid(noticeId)) {
    return NextResponse.json(
      { success: false, error: { message: "Invalid notice ID format" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const notice = await Notice.findOne({
      _id: noticeId,
      schoolId,
      isActive: true,
    })
      .populate("targetClassId", "name code")
      .populate("targetSectionId", "name")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .lean();

    if (!notice) {
      return NextResponse.json(
        { success: false, error: { message: "Notice not found in this school" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { notice },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to fetch notice details" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const existingNotice = await Notice.findOne({
      _id: noticeId,
      schoolId,
      isActive: true,
    });

    if (!existingNotice) {
      return NextResponse.json(
        { success: false, error: { message: "Notice not found" } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parseResult = updateNoticeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: parseResult.error.issues[0]?.message || "Validation error",
            issues: parseResult.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      targetType,
      targetClassId,
      targetSectionId,
      targetRoles,
      attachments,
      status,
      publishedAt,
      expiresAt,
    } = parseResult.data;

    // Validate class and section if target is changing
    const finalTargetType = targetType || existingNotice.targetType;
    let finalClassId = targetClassId !== undefined ? targetClassId : existingNotice.targetClassId;
    let finalSectionId = targetSectionId !== undefined ? targetSectionId : existingNotice.targetSectionId;

    if (targetType && targetType !== existingNotice.targetType) {
      if (targetType !== "CLASS" && targetType !== "SECTION") {
        finalClassId = null;
        finalSectionId = null;
      }
    }

    if (finalTargetType === "CLASS" || finalTargetType === "SECTION") {
      if (finalClassId) {
        const classDoc = await Class.findOne({ _id: finalClassId, schoolId }).lean();
        if (!classDoc) {
          return NextResponse.json(
            { success: false, error: { message: "Selected class does not belong to this school" } },
            { status: 400 }
          );
        }
      }

      if (finalTargetType === "SECTION" && finalSectionId) {
        const sectionDoc = await Section.findOne({
          _id: finalSectionId,
          classId: finalClassId,
          schoolId,
        }).lean();
        if (!sectionDoc) {
          return NextResponse.json(
            { success: false, error: { message: "Selected section does not belong to the class in this school" } },
            { status: 400 }
          );
        }
      }
    }

    if (title !== undefined) existingNotice.title = title;
    if (description !== undefined) existingNotice.description = description;
    if (targetType !== undefined) existingNotice.targetType = targetType;
    existingNotice.targetClassId = (finalClassId as any) || null;
    existingNotice.targetSectionId = (finalSectionId as any) || null;
    if (targetRoles !== undefined) existingNotice.targetRoles = targetRoles as any;
    if (attachments !== undefined) {
      existingNotice.attachments = attachments.map((att) => ({ ...att, size: att.size ?? undefined })) as any;
    }
    if (status !== undefined) existingNotice.status = status;
    if (publishedAt !== undefined) existingNotice.publishedAt = publishedAt ? new Date(publishedAt) : null;
    if (expiresAt !== undefined) existingNotice.expiresAt = expiresAt ? new Date(expiresAt) : null;
    existingNotice.updatedBy = userId as any;

    await existingNotice.save();

    await AuditLog.create({
      userId,
      userRole: role,
      action: "NOTICE_UPDATED",
      entityType: "SCHOOL",
      entityId: noticeId,
      schoolId,
      metadata: {
        noticeId,
        updatedFields: Object.keys(body),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Notice updated successfully",
      data: { notice: existingNotice },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to update notice" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
          isActive: false,
          updatedBy: userId,
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
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to archive notice" } },
      { status: 500 }
    );
  }
}
