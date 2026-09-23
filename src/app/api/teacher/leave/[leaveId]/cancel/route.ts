import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";
import connectToDatabase from "@/lib/db";
import { LeaveService } from "@/lib/services/leaveService";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ leaveId: string }> }
) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { leaveId } = await props.params;

  try {
    await connectToDatabase();

    const cancelledLeave = await LeaveService.cancelLeave(
      schoolId,
      leaveId,
      user.id,
      "TEACHER"
    );

    return NextResponse.json({
      success: true,
      message: "Leave application cancelled successfully.",
      data: cancelledLeave,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to cancel leave application" },
      { status: 400 }
    );
  }
}
