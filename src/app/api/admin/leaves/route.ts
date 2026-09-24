import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { requireModule } from "@/lib/subscription-guard";
import LeaveRequest from "@/models/LeaveRequest";
import Student from "@/models/Student";
import Teacher from "@/models/Teacher";
import AuditLog from "@/models/AuditLog";
import { createLeaveRequestSchema } from "@/lib/validation/leave";
import { LeaveService } from "@/lib/services/leaveService";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "LEAVE");
  if (!subCheck.allowed) return subCheck.response;

  const { schoolId } = auth.context;

  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status")?.trim() || "";
    const applicantRole = searchParams.get("applicantRole")?.trim() || "";
    const studentId = searchParams.get("studentId")?.trim() || "";
    const teacherId = searchParams.get("teacherId")?.trim() || "";
    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const query: any = {
      schoolId: new mongoose.Types.ObjectId(schoolId),
      isActive: true,
    };

    if (status && status !== "ALL") {
      query.status = status;
    }

    if (applicantRole && applicantRole !== "ALL") {
      query.applicantRole = applicantRole;
    }

    if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
      query.studentId = new mongoose.Types.ObjectId(studentId);
    }

    if (teacherId && mongoose.Types.ObjectId.isValid(teacherId)) {
      query.teacherId = new mongoose.Types.ObjectId(teacherId);
    }

    if (search) {
      query.reason = { $regex: search, $options: "i" };
    }

    const [leaves, total, statsResult] = await Promise.all([
      LeaveRequest.find(query)
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
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LeaveRequest.countDocuments(query),
      LeaveRequest.aggregate([
        { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), isActive: true } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] } },
            approved: { $sum: { $cond: [{ $eq: ["$status", "APPROVED"] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ["$status", "REJECTED"] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const stats = statsResult[0] || {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        leaves,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        stats,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to fetch leave requests" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "LEAVE");
  if (!subCheck.allowed) return subCheck.response;

  const { schoolId, user } = auth.context;
  const userId = user.id;
  const role = user.role;

  try {
    await connectToDatabase();

    const body = await req.json();
    const parseResult = createLeaveRequestSchema.safeParse(body);
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

    const { applicantRole, studentId, teacherId, fromDate, toDate, reason, attachments } =
      parseResult.data;

    const leave = await LeaveService.submitLeave({
      schoolId,
      applicantUserId: userId,
      applicantRole,
      studentId,
      teacherId,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      reason,
      attachments,
    });

    await AuditLog.create({
      userId,
      userRole: role,
      action: "LEAVE_CREATED",
      entityType: "LEAVE",
      entityId: leave._id.toString(),
      schoolId,
      metadata: {
        leaveId: leave._id.toString(),
        applicantRole,
        studentId,
        teacherId,
        fromDate,
        toDate,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Leave request submitted successfully",
        data: { leave },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to submit leave request" } },
      { status: 400 }
    );
  }
}
