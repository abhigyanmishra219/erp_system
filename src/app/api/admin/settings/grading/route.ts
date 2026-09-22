import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { updateGradingSettingsSchema } from "@/lib/validation/adminSetup";
import School from "@/models/School";
import AuditLog from "@/models/AuditLog";
import connectToDatabase from "@/lib/db";

const DEFAULT_GRADING_SCALES = [
  { grade: "A+", minPercentage: 90, maxPercentage: 100, gradePoint: 10, description: "Outstanding" },
  { grade: "A", minPercentage: 80, maxPercentage: 89.99, gradePoint: 9, description: "Excellent" },
  { grade: "B+", minPercentage: 70, maxPercentage: 79.99, gradePoint: 8, description: "Very Good" },
  { grade: "B", minPercentage: 60, maxPercentage: 69.99, gradePoint: 7, description: "Good" },
  { grade: "C", minPercentage: 50, maxPercentage: 59.99, gradePoint: 6, description: "Average" },
  { grade: "D", minPercentage: 40, maxPercentage: 49.99, gradePoint: 5, description: "Pass" },
  { grade: "F", minPercentage: 0, maxPercentage: 39.99, gradePoint: 0, description: "Fail" },
];

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { school } = auth.context;

  const gradingSettings = school.gradingSettings || {
    gradingType: "PERCENTAGE",
    scales: DEFAULT_GRADING_SCALES,
  };

  return NextResponse.json({
    success: true,
    data: {
      gradingSettings: {
        gradingType: gradingSettings.gradingType || "PERCENTAGE",
        scales: gradingSettings.scales && gradingSettings.scales.length > 0
          ? gradingSettings.scales
          : DEFAULT_GRADING_SCALES,
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
    const validatedData = updateGradingSettingsSchema.parse(body);

    await connectToDatabase();

    const updatedSchool = await School.findByIdAndUpdate(
      schoolId,
      {
        $set: {
          gradingSettings: validatedData,
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
      action: "GRADING_SETTINGS_UPDATED",
      entityType: "SCHOOL",
      entityId: schoolId,
      schoolId,
      metadata: {
        gradingType: validatedData.gradingType,
        scalesCount: validatedData.scales.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Grading system configuration saved",
      data: {
        gradingSettings: updatedSchool.gradingSettings,
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
          message: error instanceof Error ? error.message : "Failed to update grading settings",
        },
      },
      { status: 500 }
    );
  }
}
