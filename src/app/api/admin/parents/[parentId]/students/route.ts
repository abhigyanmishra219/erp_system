import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Student from "@/models/Student";
import Parent from "@/models/Parent";
import StudentParent from "@/models/StudentParent";
import AuditLog from "@/models/AuditLog";
import { z } from "zod";

const linkStudentToParentSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  relationship: z.enum(["FATHER", "MOTHER", "GUARDIAN", "OTHER"]).optional(),
  isPrimaryGuardian: z.boolean().optional().default(false),
  isEmergencyContact: z.boolean().optional().default(false),
  canPickup: z.boolean().optional().default(true),
  notes: z.string().optional().default(""),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ parentId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { parentId } = await params;

  try {
    const body = await req.json();
    const validatedData = linkStudentToParentSchema.parse(body);

    await connectToDatabase();

    const [parent, student] = await Promise.all([
      Parent.findOne({ _id: parentId, schoolId }),
      Student.findOne({ _id: validatedData.studentId, schoolId }),
    ]);

    if (!parent) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Parent not found" },
        },
        { status: 404 }
      );
    }

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Student not found" },
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
            message: "This student is already linked to this parent.",
          },
        },
        { status: 409 }
      );
    }

    // If marked as primary guardian, demote other primary guardians for this student
    if (validatedData.isPrimaryGuardian) {
      await StudentParent.updateMany(
        { schoolId, studentId: student._id },
        { isPrimaryGuardian: false }
      );
    }

    const relationship = validatedData.relationship || parent.relationship || "GUARDIAN";

    const newLink = new StudentParent({
      schoolId,
      studentId: student._id,
      parentId: parent._id,
      relationship,
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
      entityType: "PARENT",
      entityId: parent._id.toString(),
      schoolId,
      metadata: {
        studentId: student._id.toString(),
        parentId: parent._id.toString(),
        relationship,
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
    console.error("POST /api/admin/parents/[parentId]/students error:", err);
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
        error: { code: "SERVER_ERROR", message: "Failed to link student" },
      },
      { status: 500 }
    );
  }
}
