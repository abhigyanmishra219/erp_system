import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { updateAttendanceSettingsSchema } from "@/lib/validation/adminSetup";
import School from "@/models/School";
import AuditLog from "@/models/AuditLog";
import connectToDatabase from "@/lib/db";

const DEFAULT_ATTENDANCE_SETTINGS = {
  attendanceTypes: ["PRESENT", "ABSENT", "LATE", "LEAVE"],
  workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { school } = auth.context;

  const attendanceSettings = school.attendanceSettings || DEFAULT_ATTENDANCE_SETTINGS;

  return NextResponse.json({
    success: true,
    data: {
      attendanceSettings: {
        attendanceTypes: attendanceSettings.attendanceTypes?.length
          ? attendanceSettings.attendanceTypes
          : DEFAULT_ATTENDANCE_SETTINGS.attendanceTypes,
        workingDays: attendanceSettings.workingDays?.length
          ? attendanceSettings.workingDays
          : DEFAULT_ATTENDANCE_SETTINGS.workingDays,
      },
    },
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;

  try {
    const body = await req.json();
    const validatedData = updateAttendanceSettingsSchema.parse(body);

    await connectToDatabase();

    const updatedSchool = await School.findByIdAndUpdate(
      schoolId,
      {
        $set: {
          attendanceSettings: validatedData,
          updatedBy: user.id,
        },
      },
      { new: true }
    );

    if (!updatedSchool) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "School not found" } },
        { status: 404 }
      );
    }

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "ATTENDANCE_SETTINGS_UPDATED",
      entityType: "SCHOOL",
      entityId: schoolId,
      schoolId,
      metadata: {
        workingDays: validatedData.workingDays,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Attendance settings saved successfully",
      data: {
        attendanceSettings: updatedSchool.attendanceSettings,
      },
    });
  } catch (error) {
    if ((error as any).name === "ZodError") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: (error as any).errors,
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
          message: error instanceof Error ? error.message : "Failed to update attendance settings",
        },
      },
      { status: 500 }
    );
  }
}
