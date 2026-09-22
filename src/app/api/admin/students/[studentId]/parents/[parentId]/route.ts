import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import StudentParent from "@/models/StudentParent";
import AuditLog from "@/models/AuditLog";
import { updateStudentParentLinkSchema } from "@/lib/validation/studentParent";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string; parentId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { studentId, parentId } = await params;

  try {
    await connectToDatabase();

    const link = await StudentParent.findOneAndDelete({
      schoolId,
      studentId,
      parentId,
    });

    if (!link) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Student-Parent relationship not found" },
        },
        { status: 404 }
      );
    }

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "STUDENT_PARENT_UNLINKED",
      entityType: "STUDENT",
      entityId: studentId,
      schoolId,
      metadata: {
        studentId,
        parentId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Parent unlinked successfully",
    });
  } catch (err: unknown) {
    console.error("DELETE /api/admin/students/[studentId]/parents/[parentId] error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to unlink parent" },
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string; parentId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { studentId, parentId } = await params;

  try {
    const body = await req.json();
    const validatedData = updateStudentParentLinkSchema.parse(body);

    await connectToDatabase();

    const link = await StudentParent.findOne({
      schoolId,
      studentId,
      parentId,
    });

    if (!link) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Student-Parent relationship not found" },
        },
        { status: 404 }
      );
    }

    if (validatedData.isPrimaryGuardian === true && !link.isPrimaryGuardian) {
      // Demote all other links for this student
      await StudentParent.updateMany(
        { schoolId, studentId, _id: { $ne: link._id } },
        { isPrimaryGuardian: false }
      );

      await AuditLog.create({
        userId: user.id,
        userRole: user.role,
        action: "PRIMARY_GUARDIAN_CHANGED",
        entityType: "STUDENT",
        entityId: studentId,
        schoolId,
        metadata: {
          studentId,
          newPrimaryParentId: parentId,
        },
      });
    }

    if (validatedData.relationship !== undefined) link.relationship = validatedData.relationship;
    if (validatedData.isPrimaryGuardian !== undefined) link.isPrimaryGuardian = validatedData.isPrimaryGuardian;
    if (validatedData.isEmergencyContact !== undefined) link.isEmergencyContact = validatedData.isEmergencyContact;
    if (validatedData.canPickup !== undefined) link.canPickup = validatedData.canPickup;
    if (validatedData.notes !== undefined) link.notes = validatedData.notes;

    link.updatedBy = user.id;
    await link.save();

    return NextResponse.json({
      success: true,
      data: {
        linkId: link._id.toString(),
        relationship: link.relationship,
        isPrimaryGuardian: link.isPrimaryGuardian,
        isEmergencyContact: link.isEmergencyContact,
        canPickup: link.canPickup,
        notes: link.notes,
      },
    });
  } catch (err: unknown) {
    console.error("PATCH /api/admin/students/[studentId]/parents/[parentId] error:", err);
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
        error: { code: "SERVER_ERROR", message: "Failed to update relationship" },
      },
      { status: 500 }
    );
  }
}
