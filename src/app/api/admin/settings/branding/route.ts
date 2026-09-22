import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { updateBrandingSchema } from "@/lib/validation/adminSetup";
import School from "@/models/School";
import AuditLog from "@/models/AuditLog";
import connectToDatabase from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { school } = auth.context;

  return NextResponse.json({
    success: true,
    data: {
      schoolName: school.name,
      branding: school.branding || {
        logo: school.logo || "",
        favicon: "",
        primaryColor: "#4f46e5",
        secondaryColor: "#06b6d4",
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
    const validatedData = updateBrandingSchema.parse(body);

    await connectToDatabase();

    const updatedSchool = await School.findByIdAndUpdate(
      schoolId,
      {
        $set: {
          branding: validatedData,
          logo: validatedData.logo || "",
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

    // Record audit log
    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "SCHOOL_BRANDING_UPDATED",
      entityType: "SCHOOL",
      entityId: schoolId,
      schoolId: schoolId,
      metadata: {
        branding: validatedData,
      },
    });

    return NextResponse.json({
      success: true,
      message: "School branding updated successfully",
      data: {
        branding: updatedSchool.branding,
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
          message: error instanceof Error ? error.message : "Failed to update branding",
        },
      },
      { status: 500 }
    );
  }
}
