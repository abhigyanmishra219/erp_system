import { NextRequest, NextResponse } from "next/server";
import { requireSystemAdmin } from "@/lib/auth/requireSystemAdmin";
import connectToDatabase from "@/lib/db";
import School from "@/models/School";
import { updateSchoolStatusSchema } from "@/lib/validation/school";
import { createAuditLog } from "@/lib/audit";

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
    const parseResult = updateSchoolStatusSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid status value. Must be ACTIVE, INACTIVE, or SUSPENDED.",
            details: parseResult.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { status } = parseResult.data;

    await connectToDatabase();

    const existingSchool = await School.findOne({ _id: schoolId, isDeleted: false }).lean();

    if (!existingSchool) {
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

    const updatedSchool = await School.findOneAndUpdate(
      { _id: schoolId, isDeleted: false },
      { $set: { status, updatedBy: auth.user.id } },
      { new: true }
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
      action: "SCHOOL_STATUS_CHANGED",
      entityType: "SCHOOL",
      entityId: schoolId,
      schoolId: schoolId,
      metadata: {
        previousStatus: existingSchool.status,
        newStatus: status,
      },
    });

    return NextResponse.json({
      success: true,
      message: `School status updated to ${status}`,
      data: {
        id: updatedSchool._id.toString(),
        name: updatedSchool.name,
        code: updatedSchool.code,
        status: updatedSchool.status,
      },
    });
  } catch (error: unknown) {
    console.error("Update school status error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update school status";
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
