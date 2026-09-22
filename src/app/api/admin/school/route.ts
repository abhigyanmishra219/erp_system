import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { updateSchoolProfileSchema } from "@/lib/validation/adminSetup";
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
      id: school._id.toString(),
      name: school.name,
      address: school.address || "",
      city: school.city || "",
      state: school.state || "",
      country: school.country || "India",
      phone: school.phone || "",
      email: school.email || "",
      website: school.website || "",
      logo: school.logo || school.branding?.logo || "",
      branding: school.branding || {
        logo: "",
        favicon: "",
        primaryColor: "",
        secondaryColor: "",
      },
      plan: school.plan,
      studentLimit: school.studentLimit,
      subscriptionStatus: school.subscriptionStatus,
      subscriptionExpiryDate: school.subscriptionExpiryDate,
      status: school.status,
      enabledModules: school.enabledModules || [],
      createdAt: school.createdAt,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;

  try {
    const body = await req.json();
    const validatedData = updateSchoolProfileSchema.parse(body);

    await connectToDatabase();

    const updatedSchool = await School.findByIdAndUpdate(
      schoolId,
      {
        $set: {
          name: validatedData.name,
          address: validatedData.address,
          city: validatedData.city,
          state: validatedData.state,
          country: validatedData.country,
          phone: validatedData.phone,
          email: validatedData.email,
          website: validatedData.website,
          updatedBy: user.id,
        },
      },
      { new: true, runValidators: true }
    );

    if (!updatedSchool) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "School record not found" } },
        { status: 404 }
      );
    }

    // Record audit log
    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "SCHOOL_PROFILE_UPDATED",
      entityType: "SCHOOL",
      entityId: schoolId,
      schoolId: schoolId,
      metadata: {
        updatedFields: Object.keys(validatedData),
      },
    });

    return NextResponse.json({
      success: true,
      message: "School profile updated successfully",
      data: {
        id: updatedSchool._id.toString(),
        name: updatedSchool.name,
        address: updatedSchool.address,
        city: updatedSchool.city,
        state: updatedSchool.state,
        country: updatedSchool.country,
        phone: updatedSchool.phone,
        email: updatedSchool.email,
        website: updatedSchool.website,
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
          message: error instanceof Error ? error.message : "Failed to update school profile",
        },
      },
      { status: 500 }
    );
  }
}
