import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { requireModule } from "@/lib/subscription-guard";
import { rejectLeaveSchema } from "@/lib/validation/leave";
import { LeaveService } from "@/lib/services/leaveService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leaveId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "LEAVE");
  if (!subCheck.allowed) return subCheck.response;

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

    const body = await req.json();
    const parseResult = rejectLeaveSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: parseResult.error.issues[0]?.message || "Validation error",
            issues: parseResult.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { rejectionReason } = parseResult.data;

    const leave = await LeaveService.rejectLeave(
      schoolId,
      leaveId,
      userId,
      role,
      rejectionReason
    );

    return NextResponse.json({
      success: true,
      message: "Leave request rejected",
      data: { leave },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to reject leave request" } },
      { status: 400 }
    );
  }
}
