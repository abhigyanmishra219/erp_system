import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import TeacherAssignment from "@/models/TeacherAssignment";
import AuditLog from "@/models/AuditLog";
import { updateTeacherAssignmentSchema } from "@/lib/validation/teacher";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string; assignmentId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { teacherId, assignmentId } = await params;

  try {
    await connectToDatabase();

    const assignment = await TeacherAssignment.findOne({
      _id: assignmentId,
      teacherId,
      schoolId,
    });

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Assignment not found" } },
        { status: 404 }
      );
    }

    assignment.isActive = false;
    assignment.updatedBy = user.id;
    await assignment.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "TEACHER_ASSIGNMENT_DEACTIVATED",
      entityType: "TEACHER_ASSIGNMENT",
      entityId: assignment._id.toString(),
      schoolId,
      metadata: {
        teacherId,
        assignmentId,
        academicYearId: assignment.academicYearId?.toString(),
        classId: assignment.classId?.toString(),
        sectionId: assignment.sectionId?.toString(),
        subjectId: assignment.subjectId?.toString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Teacher assignment deactivated successfully",
    });
  } catch (err: unknown) {
    console.error("DELETE /api/admin/teachers/[teacherId]/assignments/[assignmentId] error:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to deactivate assignment" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string; assignmentId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { teacherId, assignmentId } = await params;

  try {
    const body = await req.json();
    const validatedData = updateTeacherAssignmentSchema.parse(body);

    await connectToDatabase();

    const assignment = await TeacherAssignment.findOne({
      _id: assignmentId,
      teacherId,
      schoolId,
    });

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Assignment not found" } },
        { status: 404 }
      );
    }

    // Handle class teacher status update
    if (validatedData.isClassTeacher === true && !assignment.isClassTeacher) {
      // 1. Check if THIS teacher is already active Class Teacher for another section in this academic year
      const existingTeacherClassTeacher = await TeacherAssignment.findOne({
        schoolId,
        academicYearId: assignment.academicYearId,
        teacherId,
        isClassTeacher: true,
        isActive: true,
        _id: { $ne: assignment._id },
      })
        .populate("classId", "name")
        .populate("sectionId", "name")
        .populate("academicYearId", "name");

      if (existingTeacherClassTeacher) {
        const prevClass = (existingTeacherClassTeacher.classId as any)?.name || "another class";
        const prevSection = (existingTeacherClassTeacher.sectionId as any)?.name || "another section";
        const yrName = (existingTeacherClassTeacher.academicYearId as any)?.name || "this academic year";
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "TEACHER_ALREADY_CLASS_TEACHER",
              message: `This teacher is already the Class Teacher of ${prevClass} - Section ${prevSection} for academic year ${yrName}. A teacher can be assigned as Class Teacher to only one section per academic year.`,
            },
          },
          { status: 409 }
        );
      }

      // 2. Demote existing class teacher for this class & section (if it belonged to someone else)
      const existingClassTeacher = await TeacherAssignment.findOne({
        schoolId,
        academicYearId: assignment.academicYearId,
        classId: assignment.classId,
        sectionId: assignment.sectionId,
        isClassTeacher: true,
        _id: { $ne: assignment._id },
        isActive: true,
      });

      if (existingClassTeacher) {
        existingClassTeacher.isClassTeacher = false;
        if (existingClassTeacher.assignmentType === "CLASS_TEACHER") {
          existingClassTeacher.isActive = false;
        } else if (existingClassTeacher.assignmentType === "BOTH") {
          existingClassTeacher.assignmentType = "SUBJECT_TEACHER";
        }
        await existingClassTeacher.save();

        await AuditLog.create({
          userId: user.id,
          userRole: user.role,
          action: "CLASS_TEACHER_REASSIGNED",
          entityType: "TEACHER_ASSIGNMENT",
          entityId: existingClassTeacher._id.toString(),
          schoolId,
          metadata: {
            previousTeacherId: existingClassTeacher.teacherId.toString(),
            newTeacherId: teacherId,
          },
        });
      }

      assignment.isClassTeacher = true;
      if (assignment.subjectId) {
        assignment.assignmentType = "BOTH";
      } else {
        assignment.assignmentType = "CLASS_TEACHER";
      }
    } else if (validatedData.isClassTeacher === false && assignment.isClassTeacher) {
      assignment.isClassTeacher = false;
      if (assignment.subjectId) {
        assignment.assignmentType = "SUBJECT_TEACHER";
      }
    }

    if (validatedData.isActive !== undefined) {
      assignment.isActive = validatedData.isActive;
    }

    if (validatedData.assignmentType !== undefined) {
      assignment.assignmentType = validatedData.assignmentType;
    }

    assignment.updatedBy = user.id;
    await assignment.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "TEACHER_ASSIGNMENT_UPDATED",
      entityType: "TEACHER_ASSIGNMENT",
      entityId: assignment._id.toString(),
      schoolId,
      metadata: {
        teacherId,
        assignmentId,
        isClassTeacher: assignment.isClassTeacher,
        isActive: assignment.isActive,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        assignment: {
          id: assignment._id.toString(),
          isClassTeacher: assignment.isClassTeacher,
          assignmentType: assignment.assignmentType,
          isActive: assignment.isActive,
        },
      },
    });
  } catch (err: unknown) {
    console.error("PATCH /api/admin/teachers/[teacherId]/assignments/[assignmentId] error:", err);
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
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update assignment" } },
      { status: 500 }
    );
  }
}
