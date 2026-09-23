import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { LeaveService } from "@/lib/services/leaveService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leaveId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId, user } = auth.context;
  const userId = user.id;
  const role = user.role;
  const { leaveId } = await params;

  if (!mongoose.Types.ObjectId.isValid(leaveId)) {
    return NextResponse.json(
      { success: false, error: { message: "Invalid leave ID format" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const leave = await LeaveService.cancelLeave(schoolId, leaveId, userId, role);

    return NextResponse.json({
      success: true,
      message: "Leave request cancelled successfully",
      data: { leave },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to cancel leave request" } },
      { status: 400 }
    );
  }
}
