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

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter")?.trim() || "ALL"; // "ALL" or "UNREAD"
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    const isReadParam = filter === "UNREAD" ? false : undefined;

    const result = await NotificationService.getUserNotifications(schoolId, userId, {
      isRead: isReadParam,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to fetch notifications" } },
      { status: 500 }
    );
  }
}
