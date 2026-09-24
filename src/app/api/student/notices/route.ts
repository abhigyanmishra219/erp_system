import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/auth/requireStudent";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import Notice from "@/models/Notice";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireStudent(req);
    if (!auth.success) return auth.response;

    const subCheck = requireModule(auth.context.school, "NOTICES");
    if (!subCheck.allowed) return subCheck.response;

    const { schoolId, classId, sectionId } = auth.context;

    await connectToDatabase();

    const query: any = {
      schoolId,
      status: "PUBLISHED",
      isActive: true,
      $or: [
        { targetType: "SCHOOL" },
        { targetType: "STUDENTS" },
        { targetRoles: "STUDENT" },
        ...(classId ? [{ targetType: "CLASS", targetClassId: classId }] : []),
        ...(classId && sectionId
          ? [{ targetType: "SECTION", targetClassId: classId, targetSectionId: sectionId }]
          : []),
      ],
    };

    const notices = await Notice.find(query)
      .sort({ publishedAt: -1, createdAt: -1 })
      .lean();

    const formattedNotices = notices.map((n: any) => ({
      _id: n._id.toString(),
      title: n.title,
      description: n.description,
      targetType: n.targetType,
      attachments: (n.attachments || []).map((att: any) => ({
        name: att.name,
        url: att.url,
        mimeType: att.mimeType || "",
        size: att.size || null,
        type: att.type || "FILE",
      })),
      publishedAt: n.publishedAt || n.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        notices: formattedNotices,
      },
    });
  } catch (error: any) {
    console.error("Error fetching student notices:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch notices" },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
}
export async function PUT() {
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
}
export async function PATCH() {
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
}
export async function DELETE() {
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
}
