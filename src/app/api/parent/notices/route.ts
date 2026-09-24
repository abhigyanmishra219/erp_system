import { NextRequest, NextResponse } from "next/server";
import { requireParent } from "@/lib/auth/requireParent";
import connectToDatabase from "@/lib/db";
import Notice from "@/models/Notice";
import Student from "@/models/Student";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireParent(req);
    if (!auth.success) return auth.response;

    const { schoolId, childIds } = auth.context;

    if (!childIds || childIds.length === 0) {
      return NextResponse.json({
        success: true,
        hasChildren: false,
        message: "No linked children found for this parent account.",
        data: { notices: [] },
      });
    }

    const { searchParams } = new URL(req.url);
    const requestedStudentId = searchParams.get("studentId");
    const searchQuery = (searchParams.get("search") || "").trim();

    // 1. Authorize requested child
    let activeStudentId = childIds[0];
    if (requestedStudentId) {
      if (!childIds.includes(requestedStudentId)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN_CHILD_ACCESS",
              message: "Access denied. The requested student is not linked to your parent account.",
            },
          },
          { status: 403 }
        );
      }
      activeStudentId = requestedStudentId;
    }

    await connectToDatabase();

    // 2. Fetch Selected Student Details to know class & section
    const studentDoc = await Student.findOne({
      _id: activeStudentId,
      schoolId,
    }).lean();

    const classId = studentDoc ? (studentDoc.classId as any)?._id || studentDoc.classId : null;
    const sectionId = studentDoc ? (studentDoc.sectionId as any)?._id || studentDoc.sectionId : null;

    // 3. Build Notice Query: School-wide, Parents, Student's Class, Student's Section
    const audienceFilters: any[] = [
      { targetType: "SCHOOL" },
      { targetType: "PARENTS" },
    ];

    if (classId) {
      audienceFilters.push({ targetType: "CLASS", targetClassId: classId });
    }

    if (classId && sectionId) {
      audienceFilters.push({
        targetType: "SECTION",
        targetClassId: classId,
        targetSectionId: sectionId,
      });
    }

    const query: any = {
      schoolId,
      status: "PUBLISHED",
      isActive: true,
      $or: audienceFilters,
    };

    if (searchQuery) {
      const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$and = [{ $or: [{ title: regex }, { description: regex }] }];
    }

    const notices = await Notice.find(query)
      .sort({ publishedAt: -1, createdAt: -1 })
      .lean();

    const formattedNotices = notices.map((n: any) => ({
      _id: n._id.toString(),
      title: n.title,
      description: n.description,
      targetType: n.targetType,
      targetRoles: n.targetRoles || [],
      attachments: (n.attachments || []).map((att: any) => ({
        name: att.name,
        url: att.url,
        mimeType: att.mimeType || "",
        size: att.size || null,
        type: att.type || "FILE",
      })),
      publishedAt: n.publishedAt || n.createdAt,
      expiresAt: n.expiresAt || null,
    }));

    return NextResponse.json({
      success: true,
      hasChildren: true,
      data: {
        notices: formattedNotices,
      },
    });
  } catch (error: any) {
    console.error("Error fetching parent notices:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch school announcements",
        },
      },
      { status: 500 }
    );
  }
}

// Strictly enforce read-only security on Parent Notices endpoint
export async function POST() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Parents cannot create school notices." } },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Parents cannot update school notices." } },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Parents cannot modify school notices." } },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Parents cannot delete school notices." } },
    { status: 405 }
  );
}
