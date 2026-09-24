import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { requireParent } from "@/lib/auth/requireParent";
import { requireModule } from "@/lib/subscription-guard";
import { NotificationService } from "@/lib/services/notificationService";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireParent(req);
    if (!auth.success) return auth.response;

    const subCheck = requireModule(auth.context.school, "NOTIFICATIONS");
    if (!subCheck.allowed) return subCheck.response;

    const { schoolId, user } = auth.context;
    await connectToDatabase();

    const modifiedCount = await NotificationService.markAllAsRead(schoolId, user._id);

    return NextResponse.json({
      success: true,
      message: "All notifications marked as read.",
      data: {
        modifiedCount,
      },
    });
  } catch (error: any) {
    console.error("Error marking all notifications as read:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: error.message || "Failed to mark notifications as read" } },
      { status: 500 }
    );
  }
}
