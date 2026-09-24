import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { requireModule } from "@/lib/subscription-guard";
import { NotificationService } from "@/lib/services/notificationService";
import AuditLog from "@/models/AuditLog";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "NOTIFICATIONS");
  if (!subCheck.allowed) return subCheck.response;

  const { schoolId, user } = auth.context;
  const userId = user.id;
  const role = user.role;
  const { notificationId } = await params;

  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    return NextResponse.json(
      { success: false, error: { message: "Invalid notification ID format" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const success = await NotificationService.markAsRead(schoolId, userId, notificationId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: { message: "Notification not found or access denied" } },
        { status: 404 }
      );
    }

    await AuditLog.create({
      userId,
      userRole: role,
      action: "NOTIFICATION_READ",
      entityType: "USER",
      entityId: notificationId,
      schoolId,
      metadata: { notificationId },
    });

    const unreadCount = await NotificationService.getUnreadCount(schoolId, userId);

    return NextResponse.json({
      success: true,
      message: "Notification marked as read",
      data: { unreadCount },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to mark notification as read" } },
      { status: 500 }
    );
  }
}
