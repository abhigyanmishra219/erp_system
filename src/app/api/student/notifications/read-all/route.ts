import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { requireStudent } from "@/lib/auth/requireStudent";
import { requireModule } from "@/lib/subscription-guard";
import { NotificationService } from "@/lib/services/notificationService";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireStudent(req);
    if (!auth.success) return auth.response;

    const subCheck = requireModule(auth.context.school, "NOTIFICATIONS");
    if (!subCheck.allowed) return subCheck.response;

    const { schoolId, user } = auth.context;
    await connectToDatabase();

    const modifiedCount = await NotificationService.markAllAsRead(schoolId, user._id);

    return NextResponse.json({
      success: true,
      message: "All notifications marked as read",
      data: { modifiedCount },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to mark all notifications as read" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  return POST(req);
}
