import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";
import { requireModule } from "@/lib/subscription-guard";
import { getTeacherScope } from "@/lib/auth/teacherScope";
import connectToDatabase from "@/lib/db";
import Notice from "@/models/Notice";

export async function GET(req: NextRequest) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "NOTICES");
  if (!subCheck.allowed) return subCheck.response;

  const { teacher, schoolId } = auth.context;

  await connectToDatabase();

  // 1. Resolve Teacher Scope (assigned classes and sections)
  const scope = await getTeacherScope({
    schoolId,
    teacherId: teacher._id.toString(),
  });

  const { classIds, sectionIds } = scope;

  // 2. Build Audience Eligibility Query
  const audienceConditions: any[] = [
    { targetType: "SCHOOL" },
    { targetType: "TEACHERS" },
    { targetRoles: "TEACHER" },
  ];

  if (classIds && classIds.length > 0) {
    audienceConditions.push({
      targetType: "CLASS",
      targetClassId: { $in: classIds },
    });
  }

  if (sectionIds && sectionIds.length > 0) {
    audienceConditions.push({
      targetType: "SECTION",
      targetSectionId: { $in: sectionIds },
    });
  }

  const now = new Date();

  const noticeQuery: any = {
    schoolId,
    isActive: true,
    status: "PUBLISHED",
    $and: [
      { $or: audienceConditions },
      {
        $or: [
          { expiresAt: null },
          { expiresAt: { $gte: now } },
        ],
      },
    ],
  };

  const rawNotices = await Notice.find(noticeQuery)
    .populate("targetClassId", "name code")
    .populate("targetSectionId", "name")
    .populate("createdBy", "name email role")
    .sort({ publishedAt: -1, createdAt: -1 })
    .lean();

  const notices = rawNotices.map((n: any) => ({
    _id: n._id.toString(),
    title: n.title,
    description: n.description,
    targetType: n.targetType,
    targetClass: n.targetClassId
      ? {
          _id: n.targetClassId._id?.toString() || n.targetClassId.toString(),
          name: n.targetClassId.name || "Class",
        }
      : null,
    targetSection: n.targetSectionId
      ? {
          _id: n.targetSectionId._id?.toString() || n.targetSectionId.toString(),
          name: n.targetSectionId.name || "Section",
        }
      : null,
    targetRoles: n.targetRoles || [],
    attachments: n.attachments || [],
    publishedAt: n.publishedAt || n.createdAt,
    expiresAt: n.expiresAt || null,
    publisher: n.createdBy
      ? {
          name: n.createdBy.name || "School Administration",
          role: n.createdBy.role,
        }
      : null,
  }));

  const summary = {
    totalNotices: notices.length,
    schoolNoticesCount: notices.filter((n) => n.targetType === "SCHOOL").length,
    teacherNoticesCount: notices.filter(
      (n) => n.targetType === "TEACHERS" || n.targetRoles.includes("TEACHER")
    ).length,
    classNoticesCount: notices.filter(
      (n) => n.targetType === "CLASS" || n.targetType === "SECTION"
    ).length,
  };

  return NextResponse.json({
    success: true,
    data: {
      notices,
      summary,
    },
  });
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Notice creation is restricted to Administrators. Teachers have read-only access.",
    },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: "Notice modification is restricted to Administrators. Teachers have read-only access.",
    },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    {
      success: false,
      error: "Notice modification is restricted to Administrators. Teachers have read-only access.",
    },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: "Notice deletion is restricted to Administrators. Teachers have read-only access.",
    },
    { status: 405 }
  );
}
