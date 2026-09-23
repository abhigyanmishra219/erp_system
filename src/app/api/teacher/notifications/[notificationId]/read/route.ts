import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";
import connectToDatabase from "@/lib/db";
import { NotificationService } from "@/lib/services/notificationService";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ notificationId: string }> }
) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { notificationId } = await props.params;

  try {
    await connectToDatabase();

    const success = await NotificationService.markAsRead(
      schoolId,
      user.id,
      notificationId
    );

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notification marked as read.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update notification" },
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
