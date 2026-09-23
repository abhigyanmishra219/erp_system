import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import Notice from "@/models/Notice";
import Class from "@/models/Class";
import Section from "@/models/Section";
import AuditLog from "@/models/AuditLog";
import { createNoticeSchema } from "@/lib/validation/notice";
import { NotificationService } from "@/lib/services/notificationService";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;

  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const targetType = searchParams.get("targetType")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const query: any = {
      schoolId,
      isActive: true,
    };

    if (status && status !== "ALL") {
      if (status === "EXPIRED") {
        query.status = "PUBLISHED";
        query.expiresAt = { $lt: new Date() };
      } else if (status === "PUBLISHED") {
        query.status = "PUBLISHED";
        query.$or = [
          { expiresAt: null },
          { expiresAt: { $gte: new Date() } },
        ];
      } else {
        query.status = status;
      }
    }

    if (targetType && targetType !== "ALL") {
      query.targetType = targetType;
    }

    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ],
      });
    }

    const [notices, total, statsResult] = await Promise.all([
      Notice.find(query)
        .populate("targetClassId", "name code")
        .populate("targetSectionId", "name")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notice.countDocuments(query),
      Notice.aggregate([
        { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), isActive: true } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            published: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$status", "PUBLISHED"] },
                      {
                        $or: [
                          { $eq: ["$expiresAt", null] },
                          { $gte: ["$expiresAt", new Date()] },
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            draft: { $sum: { $cond: [{ $eq: ["$status", "DRAFT"] }, 1, 0] } },
            expired: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$status", "PUBLISHED"] },
                      { $ne: ["$expiresAt", null] },
                      { $lt: ["$expiresAt", new Date()] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            archived: { $sum: { $cond: [{ $eq: ["$status", "ARCHIVED"] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const stats = statsResult[0] || {
      total: 0,
      published: 0,
      draft: 0,
      expired: 0,
      archived: 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        notices,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        stats,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to fetch notices" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId, user } = auth.context;
  const userId = user.id;
  const role = user.role;

  try {
    await connectToDatabase();

    const body = await req.json();
    const parseResult = createNoticeSchema.safeParse(body);
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

    // Validate class and section belong to this school
    if (targetType === "CLASS" || targetType === "SECTION") {
      if (!targetClassId) {
        return NextResponse.json(
          { success: false, error: { message: "Target class is required" } },
          { status: 400 }
        );
      }
      const classDoc = await Class.findOne({ _id: targetClassId, schoolId }).lean();
      if (!classDoc) {
        return NextResponse.json(
          { success: false, error: { message: "Selected class does not belong to this school" } },
          { status: 400 }
        );
      }

      if (targetType === "SECTION") {
        if (!targetSectionId) {
          return NextResponse.json(
            { success: false, error: { message: "Target section is required" } },
            { status: 400 }
          );
        }
        const sectionDoc = await Section.findOne({
          _id: targetSectionId,
          classId: targetClassId,
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

    const isDirectPublish = status === "PUBLISHED";
    const actualPublishedAt = isDirectPublish
      ? publishedAt
        ? new Date(publishedAt)
        : new Date()
      : null;

    const notice = await Notice.create({
      schoolId,
      title,
      description,
      targetType,
      targetClassId: targetType === "CLASS" || targetType === "SECTION" ? targetClassId : null,
      targetSectionId: targetType === "SECTION" ? targetSectionId : null,
      targetRoles: targetRoles as any,
      attachments: attachments ? attachments.map((att) => ({ ...att, size: att.size ?? undefined })) : [],
      status: isDirectPublish ? "PUBLISHED" : "DRAFT",
      publishedAt: actualPublishedAt,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: userId,
      updatedBy: userId,
    });

    // Create Audit Log
    await AuditLog.create({
      userId,
      userRole: role,
      action: "NOTICE_CREATED",
      entityType: "SCHOOL",
      entityId: notice._id.toString(),
      schoolId,
      metadata: {
        noticeId: notice._id.toString(),
        title: notice.title,
        targetType: notice.targetType,
        status: notice.status,
      },
    });

    // If published immediately, dispatch in-app notifications
    let notificationCount = 0;
    if (isDirectPublish) {
      notificationCount = await NotificationService.createNoticeNotifications(notice);

      await AuditLog.create({
        userId,
        userRole: role,
        action: "NOTICE_PUBLISHED",
        entityType: "SCHOOL",
        entityId: notice._id.toString(),
        schoolId,
        metadata: {
          noticeId: notice._id.toString(),
          recipientsNotified: notificationCount,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: isDirectPublish
          ? `Notice published successfully. ${notificationCount} in-app notifications delivered.`
          : "Notice draft saved successfully.",
        data: { notice, notificationCount },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to create notice" } },
      { status: 500 }
    );
  }
}
