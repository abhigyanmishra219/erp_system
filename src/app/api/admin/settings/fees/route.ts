import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { updateFeeSettingsSchema } from "@/lib/validation/adminSetup";
import School from "@/models/School";
import AuditLog from "@/models/AuditLog";
import connectToDatabase from "@/lib/db";

const DEFAULT_FEE_SETTINGS = {
  categories: ["Tuition Fee", "Admission Fee", "Examination Fee", "Library Fee", "Transport Fee"],
  paymentFrequencies: ["MONTHLY", "QUARTERLY", "ANNUALLY"],
  lateFeeGraceDays: 7,
  lateFeeFineAmount: 100,
  lateFeeType: "FIXED" as const,
};

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { school } = auth.context;

  const feeSettings = school.feeSettings || DEFAULT_FEE_SETTINGS;

  return NextResponse.json({
    success: true,
    data: {
      feeSettings: {
        categories: feeSettings.categories?.length
          ? feeSettings.categories
          : DEFAULT_FEE_SETTINGS.categories,
        paymentFrequencies: feeSettings.paymentFrequencies?.length
          ? feeSettings.paymentFrequencies
          : DEFAULT_FEE_SETTINGS.paymentFrequencies,
        lateFeeGraceDays: feeSettings.lateFeeGraceDays ?? DEFAULT_FEE_SETTINGS.lateFeeGraceDays,
        lateFeeFineAmount: feeSettings.lateFeeFineAmount ?? DEFAULT_FEE_SETTINGS.lateFeeFineAmount,
        lateFeeType: feeSettings.lateFeeType || DEFAULT_FEE_SETTINGS.lateFeeType,
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
    const validatedData = updateFeeSettingsSchema.parse(body);

    await connectToDatabase();

    const updatedSchool = await School.findByIdAndUpdate(
      schoolId,
      {
        $set: {
          feeSettings: validatedData,
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

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "FEE_SETTINGS_UPDATED",
      entityType: "SCHOOL",
      entityId: schoolId,
      schoolId,
      metadata: {
        categoriesCount: validatedData.categories.length,
        lateFeeGraceDays: validatedData.lateFeeGraceDays,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Fee policy settings saved successfully",
      data: {
        feeSettings: updatedSchool.feeSettings,
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
          message: error instanceof Error ? error.message : "Failed to update fee settings",
        },
      },
      { status: 500 }
    );
  }
}
