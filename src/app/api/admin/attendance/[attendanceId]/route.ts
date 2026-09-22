import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Attendance from "@/models/Attendance";
import AuditLog from "@/models/AuditLog";
import { updateAttendanceSchema } from "@/lib/validation/attendance";
import { formatAttendanceDate } from "@/lib/utils/date";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ attendanceId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { attendanceId } = await params;

  if (!mongoose.Types.ObjectId.isValid(attendanceId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid attendance record ID" } },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const record: any = await Attendance.findOne({
    _id: attendanceId,
    schoolId,
  })
    .populate("studentId", "firstName lastName admissionNumber rollNumber gender avatarUrl")
    .populate("classId", "name code")
    .populate("sectionId", "name code")
    .populate("academicYearId", "name status")
    .populate("markedBy", "name email role")
    .populate("editedBy", "name email role")
    .lean();

  if (!record) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Attendance record not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: record._id.toString(),
      _id: record._id.toString(),
      student: record.studentId
        ? {
            id: record.studentId._id?.toString(),
            name: `${record.studentId.firstName} ${record.studentId.lastName}`,
            admissionNumber: record.studentId.admissionNumber,
            rollNumber: record.studentId.rollNumber || "",
            gender: record.studentId.gender,
            avatarUrl: record.studentId.avatarUrl || "",
          }
        : null,
      class: record.classId
        ? { id: record.classId._id?.toString(), name: record.classId.name, code: record.classId.code }
        : null,
      section: record.sectionId
        ? { id: record.sectionId._id?.toString(), name: record.sectionId.name, code: record.sectionId.code }
        : null,
      academicYear: record.academicYearId
        ? { id: record.academicYearId._id?.toString(), name: record.academicYearId.name }
        : null,
      date: formatAttendanceDate(new Date(record.date)),
      status: record.status,
      remarks: record.remarks || "",
      isLocked: !!record.isLocked,
      markedBy: record.markedBy ? { name: record.markedBy.name, email: record.markedBy.email } : null,
      editedBy: record.editedBy ? { name: record.editedBy.name, email: record.editedBy.email } : null,
      editedAt: record.editedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ attendanceId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { attendanceId } = await params;

  if (!mongoose.Types.ObjectId.isValid(attendanceId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid attendance record ID" } },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const validatedData = updateAttendanceSchema.parse(body);

    await connectToDatabase();

    const record = await Attendance.findOne({
      _id: attendanceId,
      schoolId,
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Attendance record not found" } },
        { status: 404 }
      );
    }

    // Check locking constraint:
    // If the record is currently locked and the request is trying to change status/remarks without unlocking
    if (record.isLocked && validatedData.isLocked !== false && (validatedData.status || validatedData.remarks !== undefined)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ATTENDANCE_LOCKED",
            message: "Attendance has already been locked and cannot be modified.",
          },
        },
        { status: 403 }
      );
    }

    const oldStatus = record.status;
    let auditAction = "ATTENDANCE_UPDATED";

    if (validatedData.status && validatedData.status !== oldStatus) {
      record.status = validatedData.status;
      auditAction = "ATTENDANCE_STATUS_CHANGED";
    }

    if (validatedData.remarks !== undefined) {
      record.remarks = validatedData.remarks;
    }

    if (validatedData.isLocked !== undefined) {
      record.isLocked = validatedData.isLocked;
      auditAction = validatedData.isLocked ? "ATTENDANCE_LOCKED" : "ATTENDANCE_UNLOCKED";
    }

    record.editedBy = user.id as any;
    record.editedAt = new Date();

    await record.save();

    // Record audit log
    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: auditAction,
      entityType: "ATTENDANCE",
      entityId: attendanceId,
      schoolId,
      metadata: {
        attendanceId,
        studentId: record.studentId?.toString(),
        date: formatAttendanceDate(new Date(record.date)),
        oldStatus,
        newStatus: record.status,
        isLocked: record.isLocked,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Attendance record updated successfully",
      data: {
        id: record._id.toString(),
        status: record.status,
        remarks: record.remarks,
        isLocked: record.isLocked,
        editedAt: record.editedAt,
      },
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid update data provided",
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: error.message || "Failed to update attendance record",
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ attendanceId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { attendanceId } = await params;

  if (!mongoose.Types.ObjectId.isValid(attendanceId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid attendance record ID" } },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const record = await Attendance.findOne({
    _id: attendanceId,
    schoolId,
  });

  if (!record) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Attendance record not found" } },
      { status: 404 }
    );
  }

  if (record.isLocked) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ATTENDANCE_LOCKED",
          message: "Locked attendance records cannot be deleted.",
        },
      },
      { status: 403 }
    );
  }

  await Attendance.deleteOne({ _id: attendanceId, schoolId });

  await AuditLog.create({
    userId: user.id,
    userRole: user.role,
    action: "ATTENDANCE_UPDATED",
    entityType: "ATTENDANCE",
    entityId: attendanceId,
    schoolId,
    metadata: {
      action: "DELETE",
      studentId: record.studentId?.toString(),
      date: formatAttendanceDate(new Date(record.date)),
    },
  });

  return NextResponse.json({
    success: true,
    message: "Attendance record deleted successfully",
  });
}
