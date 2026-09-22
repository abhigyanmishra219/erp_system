import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Parent from "@/models/Parent";
import StudentParent from "@/models/StudentParent";
import AuditLog from "@/models/AuditLog";
import { updateParentSchema } from "@/lib/validation/studentParent";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ parentId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { parentId } = await params;

  try {
    await connectToDatabase();

    const parent = await Parent.findOne({ _id: parentId, schoolId })
      .populate("userId", "email isActive mustChangePassword createdAt")
      .lean();

    if (!parent) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Parent not found" },
        },
        { status: 404 }
      );
    }

    // Fetch linked children
    const links = await StudentParent.find({
      schoolId,
      parentId: parent._id,
    })
      .populate({
        path: "studentId",
        populate: [
          { path: "classId", select: "name code" },
          { path: "sectionId", select: "name" },
          { path: "academicYearId", select: "name status" },
        ],
      })
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        parent: {
          id: parent._id.toString(),
          firstName: parent.firstName,
          lastName: parent.lastName,
          fullName: `${parent.firstName} ${parent.lastName}`.trim(),
          email: parent.email,
          phone: parent.phone,
          relationship: parent.relationship,
          occupation: parent.occupation,
          address: parent.address,
          status: parent.status,
          user: parent.userId,
          hasLoginAccount: !!parent.userId,
          createdAt: parent.createdAt,
          updatedAt: parent.updatedAt,
        },
        children: links
          .filter((l) => l.studentId)
          .map((l) => ({
            linkId: l._id.toString(),
            relationship: l.relationship,
            isPrimaryGuardian: l.isPrimaryGuardian,
            isEmergencyContact: l.isEmergencyContact,
            canPickup: l.canPickup,
            notes: l.notes,
            student: l.studentId,
          })),
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/admin/parents/[parentId] error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to fetch parent profile" },
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ parentId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { parentId } = await params;

  try {
    const body = await req.json();
    const validatedData = updateParentSchema.parse(body);

    await connectToDatabase();

    const parent = await Parent.findOne({ _id: parentId, schoolId });

    if (!parent) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Parent not found" },
        },
        { status: 404 }
      );
    }

    if (validatedData.email && validatedData.email.toLowerCase().trim() !== parent.email) {
      const conflict = await Parent.findOne({
        schoolId,
        _id: { $ne: parent._id },
        email: validatedData.email.toLowerCase().trim(),
      });

      if (conflict) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "DUPLICATE_EMAIL",
              message: `A parent with email '${validatedData.email}' already exists in your school.`,
            },
          },
          { status: 409 }
        );
      }
      parent.email = validatedData.email.toLowerCase().trim();
    }

    if (validatedData.firstName !== undefined) parent.firstName = validatedData.firstName;
    if (validatedData.lastName !== undefined) parent.lastName = validatedData.lastName;
    if (validatedData.phone !== undefined) parent.phone = validatedData.phone;
    if (validatedData.relationship !== undefined) parent.relationship = validatedData.relationship;
    if (validatedData.occupation !== undefined) parent.occupation = validatedData.occupation;
    if (validatedData.status !== undefined) parent.status = validatedData.status;
    if (validatedData.address) {
      parent.address = { ...parent.address, ...validatedData.address };
    }

    parent.updatedBy = user.id;
    await parent.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "PARENT_UPDATED",
      entityType: "PARENT",
      entityId: parent._id.toString(),
      schoolId,
      metadata: {
        parentId: parent._id.toString(),
        name: `${parent.firstName} ${parent.lastName}`,
        email: parent.email,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        parent: {
          id: parent._id.toString(),
          firstName: parent.firstName,
          lastName: parent.lastName,
          email: parent.email,
          phone: parent.phone,
          status: parent.status,
        },
      },
    });
  } catch (err: unknown) {
    console.error("PATCH /api/admin/parents/[parentId] error:", err);
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
        error: { code: "SERVER_ERROR", message: "Failed to update parent" },
      },
      { status: 500 }
    );
  }
}
