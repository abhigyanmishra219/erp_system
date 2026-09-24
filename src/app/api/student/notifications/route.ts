import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { requireStudent } from "@/lib/auth/requireStudent";
import { NotificationService } from "@/lib/services/notificationService";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireStudent(req);
    if (!auth.success) return auth.response;

    const { schoolId, user } = auth.context;
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter")?.trim().toUpperCase() || "ALL";
    const type = (searchParams.get("type")?.trim().toUpperCase() || undefined) as any;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    let isReadParam: boolean | undefined = undefined;
    if (filter === "UNREAD") {
      isReadParam = false;
    } else if (filter === "READ") {
      isReadParam = true;
    }

    const result = await NotificationService.getUserNotifications(schoolId, user._id, {
      isRead: isReadParam,
      type: type || undefined,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
