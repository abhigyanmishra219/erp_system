import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import { requireParent } from "@/lib/auth/requireParent";
import { NotificationService } from "@/lib/services/notificationService";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    const auth = await requireParent(req);
    if (!auth.success) return auth.response;

    const { schoolId, user } = auth.context;
    const { notificationId } = await params;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ID", message: "Invalid notification ID" } },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const updated = await NotificationService.markAsRead(schoolId, user._id, notificationId);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: { code: "NOTIFICATION_NOT_FOUND", message: "Notification not found or unauthorized" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notification marked as read.",
      data: {
        notification: updated,
      },
    });
  } catch (error: any) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: error.message || "Failed to update notification" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    const auth = await requireParent(req);
    if (!auth.success) return auth.response;

    const { schoolId, user } = auth.context;
    const { notificationId } = await params;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ID", message: "Invalid notification ID" } },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const deleted = await NotificationService.deleteNotification(schoolId, user._id, notificationId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { code: "NOTIFICATION_NOT_FOUND", message: "Notification not found or unauthorized" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notification deleted.",
    });
  } catch (error: any) {
    console.error("Error deleting notification:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: error.message || "Failed to delete notification" } },
      { status: 500 }
    );
  }
}
