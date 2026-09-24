import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { requireParent } from "@/lib/auth/requireParent";
import { NotificationService } from "@/lib/services/notificationService";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireParent(req);
    if (!auth.success) return auth.response;

    const { schoolId, user } = auth.context;
    await connectToDatabase();

    const count = await NotificationService.getUnreadCount(schoolId, user._id);

    return NextResponse.json({
      success: true,
      data: {
        count,
        unreadCount: count,
      },
    });
  } catch (error: any) {
    console.error("Error getting parent unread notification count:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: error.message || "Failed to get unread count" } },
      { status: 500 }
    );
  }
}
