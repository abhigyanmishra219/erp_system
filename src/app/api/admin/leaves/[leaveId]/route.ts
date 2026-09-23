import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import LeaveRequest from "@/models/LeaveRequest";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leaveId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { leaveId } = await params;

  if (!mongoose.Types.ObjectId.isValid(leaveId)) {
    return NextResponse.json(
      { success: false, error: { message: "Invalid leave ID format" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const leave = await LeaveRequest.findOne({
      _id: leaveId,
      schoolId,
      isActive: true,
    })
      .populate("applicantUserId", "name email role")
      .populate({
        path: "studentId",
        select: "name admissionNumber rollNumber classId sectionId",
        populate: [
          { path: "classId", select: "name code" },
          { path: "sectionId", select: "name" },
        ],
      })
      .populate("teacherId", "name employeeId email phone")
      .populate("reviewedBy", "name email")
      .lean();

    if (!leave) {
      return NextResponse.json(
        { success: false, error: { message: "Leave request not found in this school" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { leave },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to fetch leave details" } },
      { status: 500 }
    );
  }
}
