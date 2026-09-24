import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTeacher } from "@/lib/auth/requireTeacher";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import LeaveRequest from "@/models/LeaveRequest";
import { LeaveService } from "@/lib/services/leaveService";
import AuditLog from "@/models/AuditLog";

const teacherLeaveSubmitSchema = z.object({
  fromDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Valid start date is required",
  }),
  toDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Valid end date is required",
  }),
  reason: z
    .string()
    .min(3, "Reason must be at least 3 characters")
    .max(1000, "Reason cannot exceed 1000 characters"),
  attachments: z
    .array(
      z.object({
        name: z.string().min(1, "File name is required"),
        url: z.string().min(1, "File URL is required"),
        mimeType: z.string().optional().default(""),
        size: z.number().optional(),
      })
    )
    .optional()
    .default([]),
}).refine(
  (data) => {
    const from = new Date(data.fromDate);
    const to = new Date(data.toDate);
    return from.getTime() <= to.getTime();
  },
  {
    message: "To date must be on or after from date",
    path: ["toDate"],
  }
);

export async function GET(req: NextRequest) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "LEAVE");
  if (!subCheck.allowed) return subCheck.response;

  const { teacher, user, schoolId } = auth.context;

  await connectToDatabase();

  const leaves = await LeaveRequest.find({
    schoolId,
    isActive: true,
    $or: [{ applicantUserId: user.id }, { teacherId: teacher._id }],
  })
    .populate("reviewedBy", "name email role")
    .sort({ createdAt: -1 })
    .lean();

  const formattedLeaves = leaves.map((leave: any) => ({
    _id: leave._id.toString(),
    fromDate: leave.fromDate,
    toDate: leave.toDate,
    reason: leave.reason,
    attachments: leave.attachments || [],
    status: leave.status,
    reviewedBy: leave.reviewedBy
      ? {
          _id: leave.reviewedBy._id?.toString(),
          name: leave.reviewedBy.name || "Administrator",
          email: leave.reviewedBy.email,
        }
      : null,
    reviewedAt: leave.reviewedAt || null,
    rejectionReason: leave.rejectionReason || null,
    createdAt: leave.createdAt,
    updatedAt: leave.updatedAt,
  }));

  const summary = {
    totalApplications: formattedLeaves.length,
    pendingCount: formattedLeaves.filter((l) => l.status === "PENDING").length,
    approvedCount: formattedLeaves.filter((l) => l.status === "APPROVED").length,
    rejectedCount: formattedLeaves.filter((l) => l.status === "REJECTED").length,
    cancelledCount: formattedLeaves.filter((l) => l.status === "CANCELLED").length,
  };

  return NextResponse.json({
    success: true,
    data: {
      leaves: formattedLeaves,
      summary,
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "LEAVE");
  if (!subCheck.allowed) return subCheck.response;

  const { teacher, user, schoolId } = auth.context;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = teacherLeaveSubmitSchema.safeParse(body);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 400 }
    );
  }

  const { fromDate, toDate, reason, attachments } = parsed.data;

  try {
    await connectToDatabase();

    const leaveRequest = await LeaveService.submitLeave({
      schoolId,
      applicantUserId: user.id,
      applicantRole: "TEACHER",
      teacherId: teacher._id.toString(),
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      reason,
      attachments,
    });

    // Record Audit Log
    await AuditLog.create({
      userId: user.id,
      userRole: "TEACHER",
      action: "LEAVE_REQUESTED",
      entityType: "LEAVE",
      entityId: leaveRequest._id.toString(),
      schoolId,
      metadata: {
        leaveId: leaveRequest._id.toString(),
        teacherId: teacher._id.toString(),
        fromDate: leaveRequest.fromDate,
        toDate: leaveRequest.toDate,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Leave application submitted successfully.",
        data: leaveRequest,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to submit leave application" },
      { status: 400 }
    );
  }
}
