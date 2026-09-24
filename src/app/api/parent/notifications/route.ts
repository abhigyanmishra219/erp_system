import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { requireParent } from "@/lib/auth/requireParent";
import { requireModule } from "@/lib/subscription-guard";
import { NotificationService } from "@/lib/services/notificationService";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireParent(req);
    if (!auth.success) return auth.response;

    const subCheck = requireModule(auth.context.school, "NOTIFICATIONS");
    if (!subCheck.allowed) return subCheck.response;

    const { schoolId, user } = auth.context;
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter")?.trim().toUpperCase() || "ALL";
    const type = (searchParams.get("type")?.trim().toUpperCase() || undefined) as any;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    let isReadParam: boolean | undefined = undefined;
    if (filter === "UNREAD") {
      isReadParam = false;
    } else if (filter === "READ") {
      isReadParam = true;
    }

    // Scoped strictly to authenticated parent user ID
    const result = await NotificationService.getUserNotifications(schoolId, user._id, {
      isRead: isReadParam,
      type: type || undefined,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error fetching parent notifications:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: error.message || "Failed to fetch notifications" } },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Method Not Allowed" } },
    { status: 405 }
  );
}
export async function PUT() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Method Not Allowed" } },
    { status: 405 }
  );
}
export async function PATCH() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Method Not Allowed" } },
    { status: 405 }
  );
}
export async function DELETE() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Method Not Allowed" } },
    { status: 405 }
  );
}
