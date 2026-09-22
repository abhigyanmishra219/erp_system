import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Teacher from "@/models/Teacher";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
import { teacherStatusSchema } from "@/lib/validation/teacher";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { teacherId } = await params;

  try {
    const body = await req.json();
    const validatedData = teacherStatusSchema.parse(body);

    await connectToDatabase();

    const teacher = await Teacher.findOne({ _id: teacherId, schoolId });

    if (!teacher) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Teacher not found" },
        },
        { status: 404 }
      );
    }

    const previousStatus = teacher.status;
    teacher.status = validatedData.status;

    // Sync portal login account isActive state
    if (teacher.userId) {
      const teacherUser = await User.findOne({ _id: teacher.userId, schoolId });
      if (teacherUser) {
        teacherUser.isActive = validatedData.status === "ACTIVE";
        await teacherUser.save();
      }
    }

    teacher.updatedBy = user.id;
    await teacher.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "TEACHER_STATUS_CHANGED",
      entityType: "TEACHER",
      entityId: teacher._id.toString(),
      schoolId,
      metadata: {
        teacherId: teacher._id.toString(),
        customTeacherId: teacher.teacherId,
        previousStatus,
        newStatus: validatedData.status,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: teacher._id.toString(),
        status: teacher.status,
      },
    });
  } catch (err: unknown) {
    console.error("PATCH /api/admin/teachers/[teacherId]/status error:", err);
    if (err && typeof err === "object" && "issues" in err) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: (err as { issues: unknown[] }).issues,
          },
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to update teacher status" },
      },
      { status: 500 }
    );
  }
}
