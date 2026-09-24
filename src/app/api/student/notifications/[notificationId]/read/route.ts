import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { requireStudent } from "@/lib/auth/requireStudent";
import { requireModule } from "@/lib/subscription-guard";
import { NotificationService } from "@/lib/services/notificationService";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ notificationId: string }> }
) {
  try {
    const auth = await requireStudent(req);
    if (!auth.success) return auth.response;

    const subCheck = requireModule(auth.context.school, "NOTIFICATIONS");
    if (!subCheck.allowed) return subCheck.response;

    const { schoolId, user } = auth.context;
    const params = await props.params;
    const { notificationId } = params;

    if (!notificationId) {
      return NextResponse.json(
        { success: false, message: "Notification ID is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const success = await NotificationService.markAsRead(schoolId, user._id, notificationId);
    if (!success) {
      return NextResponse.json(
        { success: false, message: "Notification not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ notificationId: string }> }
) {
  return POST(req, props);
}
