import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { requireModule } from "@/lib/subscription-guard";
import { NotificationService } from "@/lib/services/notificationService";
import AuditLog from "@/models/AuditLog";

export async function POST(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "NOTIFICATIONS");
  if (!subCheck.allowed) return subCheck.response;

  const { schoolId, user } = auth.context;
  const userId = user.id;
  const role = user.role;

  try {
    await connectToDatabase();

    const count = await NotificationService.markAllAsRead(schoolId, userId);

    if (count > 0) {
      await AuditLog.create({
        userId,
        userRole: role,
        action: "NOTIFICATIONS_MARKED_READ",
        entityType: "USER",
        schoolId,
        metadata: { count },
      });
    }

    return NextResponse.json({
      success: true,
      message: `${count} notifications marked as read`,
      data: { count, unreadCount: 0 },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to mark all notifications as read" } },
      { status: 500 }
    );
  }
}
