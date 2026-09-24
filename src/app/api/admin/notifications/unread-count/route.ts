import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { requireModule } from "@/lib/subscription-guard";
import { NotificationService } from "@/lib/services/notificationService";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "NOTIFICATIONS");
  if (!subCheck.allowed) return subCheck.response;

  const { schoolId, user } = auth.context;
  const userId = user.id;

  try {
    await connectToDatabase();

    const unreadCount = await NotificationService.getUnreadCount(schoolId, userId);

    return NextResponse.json({
      success: true,
      data: { unreadCount },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to fetch unread count" } },
      { status: 500 }
    );
  }
}
