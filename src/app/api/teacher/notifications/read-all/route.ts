import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import { NotificationService } from "@/lib/services/notificationService";

export async function POST(req: NextRequest) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "NOTIFICATIONS");
  if (!subCheck.allowed) return subCheck.response;

  const { user, schoolId } = auth.context;

  try {
    await connectToDatabase();

    const modifiedCount = await NotificationService.markAllAsRead(
      schoolId,
      user.id
    );

    return NextResponse.json({
      success: true,
      message: "All notifications marked as read.",
      data: { modifiedCount },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to mark all notifications as read" },
      { status: 500 }
    );
  }
}
