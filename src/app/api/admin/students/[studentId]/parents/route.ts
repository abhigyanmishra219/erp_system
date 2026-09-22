import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Student from "@/models/Student";
import Parent from "@/models/Parent";
import StudentParent from "@/models/StudentParent";
import AuditLog from "@/models/AuditLog";
import { linkParentSchema } from "@/lib/validation/studentParent";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { studentId } = await params;

  try {
    const body = await req.json();
    const validatedData = linkParentSchema.parse(body);

    await connectToDatabase();

    const [student, parent] = await Promise.all([
      Student.findOne({ _id: studentId, schoolId }),
      Parent.findOne({ _id: validatedData.parentId, schoolId }),
    ]);

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Student not found" },
        },
        { status: 404 }
      );
    }

    if (!parent) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Parent not found" },
        },
        { status: 404 }
      );
    }

    // Check if link already exists
    const existingLink = await StudentParent.findOne({
      schoolId,
      studentId: student._id,
      parentId: parent._id,
    });

    if (existingLink) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_LINK",
            message: "This parent is already linked to this student.",
          },
        },
        { status: 409 }
      );
    }

    // If marked as primary guardian, demote existing primary guardians for this student
    if (validatedData.isPrimaryGuardian) {
      await StudentParent.updateMany(
        { schoolId, studentId: student._id },
        { isPrimaryGuardian: false }
      );
    }

    const newLink = new StudentParent({
      schoolId,
      studentId: student._id,
      parentId: parent._id,
      relationship: validatedData.relationship,
      isPrimaryGuardian: validatedData.isPrimaryGuardian ?? false,
      isEmergencyContact: validatedData.isEmergencyContact ?? false,
      canPickup: validatedData.canPickup ?? true,
      notes: validatedData.notes || "",
      createdBy: user.id,
      updatedBy: user.id,
    });

    await newLink.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "STUDENT_PARENT_LINKED",
      entityType: "STUDENT",
      entityId: student._id.toString(),
      schoolId,
      metadata: {
        studentId: student._id.toString(),
        parentId: parent._id.toString(),
        relationship: validatedData.relationship,
        isPrimaryGuardian: validatedData.isPrimaryGuardian,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          linkId: newLink._id.toString(),
          studentId: student._id.toString(),
          parentId: parent._id.toString(),
          relationship: newLink.relationship,
          isPrimaryGuardian: newLink.isPrimaryGuardian,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("POST /api/admin/students/[studentId]/parents error:", err);
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
        error: { code: "SERVER_ERROR", message: "Failed to link parent" },
      },
      { status: 500 }
    );
  }
}
