import { NextRequest, NextResponse } from "next/server";
import { requireSystemAdmin } from "@/lib/auth/requireSystemAdmin";
import connectToDatabase from "@/lib/db";
import School from "@/models/School";
import { updateSchoolSchema } from "@/lib/validation/school";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const auth = await requireSystemAdmin(req);
  if (!auth.success) {
    return auth.response;
  }

  const { schoolId } = await params;

  if (!/^[0-9a-fA-F]{24}$/.test(schoolId)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_ID",
          message: "Invalid school identifier format",
        },
      },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();
    const school = await School.findOne({
      _id: schoolId,
      isDeleted: false,
    })
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .lean();

    if (!school) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "School not found or has been removed",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: school._id.toString(),
        name: school.name,
        code: school.code,
        address: school.address,
        city: school.city,
        state: school.state,
        country: school.country,
        phone: school.phone,
        email: school.email,
        logo: school.logo,
        website: school.website,
        plan: school.plan,
        studentLimit: school.studentLimit,
        subscriptionStartDate: school.subscriptionStartDate,
        subscriptionExpiryDate: school.subscriptionExpiryDate,
        subscriptionStatus: school.subscriptionStatus,
        status: school.status,
        enabledModules: school.enabledModules,
        createdBy: school.createdBy || null,
        updatedBy: school.updatedBy || null,
        createdAt: school.createdAt,
        updatedAt: school.updatedAt,
        usage: {
          totalStudents: 0,
          totalTeachers: 0,
          totalParents: 0,
          totalAdmins: 0,
          storageUsedBytes: 0,
          storageUsedFormatted: "0 MB",
        },
      },
    });
  } catch (error: unknown) {
    console.error("Get school details error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to retrieve school details";
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const auth = await requireSystemAdmin(req);
  if (!auth.success) {
    return auth.response;
  }

  const { schoolId } = await params;

  if (!/^[0-9a-fA-F]{24}$/.test(schoolId)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_ID",
          message: "Invalid school identifier format",
        },
      },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const parseResult = updateSchoolSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed for update data",
            details: parseResult.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Server explicitly controls updatedBy and prevents client override of audit fields
    const updatedSchool = await School.findOneAndUpdate(
      { _id: schoolId, isDeleted: false },
      {
        $set: {
          ...parseResult.data,
          updatedBy: auth.user.id,
        },
      },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedSchool) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "School not found or has been removed",
          },
        },
        { status: 404 }
      );
    }

    // Record audit log entry
    await createAuditLog({
      userId: auth.user.id,
      userRole: auth.user.role,
      action: "SCHOOL_UPDATED",
      entityType: "SCHOOL",
      entityId: schoolId,
      schoolId: schoolId,
      metadata: {
        updatedFields: Object.keys(parseResult.data),
      },
    });

    return NextResponse.json({
      success: true,
      message: "School updated successfully",
      data: {
        id: updatedSchool._id.toString(),
        name: updatedSchool.name,
        code: updatedSchool.code,
        address: updatedSchool.address,
        city: updatedSchool.city,
        state: updatedSchool.state,
        country: updatedSchool.country,
        phone: updatedSchool.phone,
        email: updatedSchool.email,
        logo: updatedSchool.logo,
        website: updatedSchool.website,
        plan: updatedSchool.plan,
        studentLimit: updatedSchool.studentLimit,
        subscriptionStartDate: updatedSchool.subscriptionStartDate,
        subscriptionExpiryDate: updatedSchool.subscriptionExpiryDate,
        subscriptionStatus: updatedSchool.subscriptionStatus,
        status: updatedSchool.status,
        enabledModules: updatedSchool.enabledModules,
        updatedAt: updatedSchool.updatedAt,
      },
    });
  } catch (error: unknown) {
    console.error("Update school error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update school";
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const auth = await requireSystemAdmin(req);
  if (!auth.success) {
    return auth.response;
  }

  const { schoolId } = await params;

  if (!/^[0-9a-fA-F]{24}$/.test(schoolId)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_ID",
          message: "Invalid school identifier format",
        },
      },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    // Soft delete: set isDeleted = true, deletedAt = new Date(), updatedBy = auth.user.id
    // Operational status is NOT changed to DELETED (DELETED is not an operational status)
    const deletedSchool = await School.findOneAndUpdate(
      { _id: schoolId, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          updatedBy: auth.user.id,
        },
      },
      { new: true }
    );

    if (!deletedSchool) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "School not found or already deleted",
          },
        },
        { status: 404 }
      );
    }

    // Record audit log entry
    await createAuditLog({
      userId: auth.user.id,
      userRole: auth.user.role,
      action: "SCHOOL_DELETED",
      entityType: "SCHOOL",
      entityId: schoolId,
      schoolId: schoolId,
      metadata: {
        name: deletedSchool.name,
        code: deletedSchool.code,
        statusAtDeletion: deletedSchool.status,
      },
    });

    return NextResponse.json({
      success: true,
      message: `School '${deletedSchool.name}' (${deletedSchool.code}) has been safely archived.`,
      data: {
        id: deletedSchool._id.toString(),
        isDeleted: true,
        deletedAt: deletedSchool.deletedAt,
        status: deletedSchool.status,
      },
    });
  } catch (error: unknown) {
    console.error("Delete school error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete school";
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}

