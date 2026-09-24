import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireParent } from "@/lib/auth/requireParent";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import LeaveRequest from "@/models/LeaveRequest";
import Student from "@/models/Student";
import { z } from "zod";

const createLeaveSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  fromDate: z.string().min(1, "From date is required"),
  toDate: z.string().min(1, "To date is required"),
  reason: z.string().min(3, "Reason must be at least 3 characters").max(1000, "Reason cannot exceed 1000 characters"),
  attachments: z
    .array(
      z.object({
        name: z.string().min(1),
        url: z.string().min(1),
        mimeType: z.string().optional(),
        size: z.number().optional(),
      })
    )
    .optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireParent(req);
    if (!auth.success) return auth.response;

    const subCheck = requireModule(auth.context.school, "LEAVE");
    if (!subCheck.allowed) return subCheck.response;

    const { schoolId, user, childIds } = auth.context;

    if (!childIds || childIds.length === 0) {
      return NextResponse.json({
        success: true,
        hasChildren: false,
        message: "No linked children found for this parent account.",
        data: { leaves: [] },
      });
    }

    const { searchParams } = new URL(req.url);
    const requestedStudentId = searchParams.get("studentId");

    // 1. Authorize requested child
    let activeStudentId = childIds[0];
    if (requestedStudentId) {
      if (!childIds.includes(requestedStudentId)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN_CHILD_ACCESS",
              message: "Access denied. The requested student is not linked to your parent account.",
            },
          },
          { status: 403 }
        );
      }
      activeStudentId = requestedStudentId;
    }

    await connectToDatabase();

    // 2. Fetch leave requests submitted by this parent for the active child
    const leaves = await LeaveRequest.find({
      schoolId,
      studentId: activeStudentId,
      applicantUserId: user._id,
      isActive: true,
    })
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const formattedLeaves = leaves.map((l: any) => ({
      _id: l._id.toString(),
      studentId: l.studentId?.toString() || "",
      fromDate: l.fromDate,
      toDate: l.toDate,
      reason: l.reason,
      attachments: l.attachments || [],
      status: l.status,
      reviewedBy: l.reviewedBy ? (l.reviewedBy as any).name : null,
      reviewedAt: l.reviewedAt || null,
      rejectionReason: l.rejectionReason || null,
      createdAt: l.createdAt,
    }));

    return NextResponse.json({
      success: true,
      hasChildren: true,
      data: {
        leaves: formattedLeaves,
      },
    });
  } catch (error: any) {
    console.error("Error fetching parent leave requests:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch leave history",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireParent(req);
    if (!auth.success) return auth.response;

    const subCheck = requireModule(auth.context.school, "LEAVE");
    if (!subCheck.allowed) return subCheck.response;

    const { schoolId, user, childIds } = auth.context;

    const body = await req.json();
    const validation = createLeaveSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: validation.error.issues[0]?.message || "Invalid leave request payload",
          },
        },
        { status: 400 }
      );
    }

    const { studentId, fromDate, toDate, reason, attachments } = validation.data;

    // 1. Security check: Parent can submit leave ONLY for linked child
    if (!childIds.includes(studentId)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN_CHILD_ACCESS",
            message: "You can only submit leave requests for children linked to your parent account.",
          },
        },
        { status: 403 }
      );
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_DATES",
            message: "Invalid from or to date format.",
          },
        },
        { status: 400 }
      );
    }

    if (from > to) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_DATE_RANGE",
            message: "From date cannot be after To date.",
          },
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // 2. Verify Student exists and belongs to school
    const student = await Student.findOne({
      _id: studentId,
      schoolId,
    }).lean();

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "STUDENT_NOT_FOUND",
            message: "Student record not found.",
          },
        },
        { status: 404 }
      );
    }

    // 3. Create Leave Request with PENDING status
    const newLeave = await LeaveRequest.create({
      schoolId,
      applicantUserId: user._id,
      applicantRole: "PARENT",
      studentId: student._id,
      fromDate: from,
      toDate: to,
      reason: reason.trim(),
      attachments: attachments || [],
      status: "PENDING",
      isActive: true,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Leave application submitted successfully. It will be reviewed by administration.",
        data: {
          leave: {
            _id: newLeave._id.toString(),
            studentId: newLeave.studentId?.toString() || "",
            fromDate: newLeave.fromDate,
            toDate: newLeave.toDate,
            reason: newLeave.reason,
            attachments: newLeave.attachments,
            status: newLeave.status,
            createdAt: newLeave.createdAt,
          },
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error submitting parent leave application:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to submit leave request",
        },
      },
      { status: 500 }
    );
  }
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
