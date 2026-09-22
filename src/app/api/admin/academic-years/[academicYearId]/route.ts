import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { updateAcademicYearSchema } from "@/lib/validation/adminSetup";
import AcademicYear from "@/models/AcademicYear";
import AuditLog from "@/models/AuditLog";
import connectToDatabase from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ academicYearId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { academicYearId } = await params;

  if (!mongoose.Types.ObjectId.isValid(academicYearId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid academic year ID" } },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const academicYear = await AcademicYear.findOne({
    _id: academicYearId,
    schoolId,
  }).lean();

  if (!academicYear) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Academic year not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: academicYear._id.toString(),
      name: academicYear.name,
      startDate: academicYear.startDate,
      endDate: academicYear.endDate,
      status: academicYear.status,
      createdAt: academicYear.createdAt,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ academicYearId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { academicYearId } = await params;

  if (!mongoose.Types.ObjectId.isValid(academicYearId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid academic year ID" } },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const validatedData = updateAcademicYearSchema.parse(body);

    await connectToDatabase();

    // Verify tenant ownership
    const existing = await AcademicYear.findOne({ _id: academicYearId, schoolId });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Academic year not found" } },
        { status: 404 }
      );
    }

    // If changing name, verify unique
    if (validatedData.name && validatedData.name !== existing.name) {
      const duplicate = await AcademicYear.findOne({
        _id: { $ne: academicYearId },
        schoolId,
        name: { $regex: new RegExp(`^${validatedData.name}$`, "i") },
      });
      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "DUPLICATE_NAME",
              message: `Academic year '${validatedData.name}' already exists for your school.`,
            },
          },
          { status: 409 }
        );
      }
    }

    // If activating, deactivate other years
    if (validatedData.status === "ACTIVE" && existing.status !== "ACTIVE") {
      await AcademicYear.updateMany(
        { schoolId, status: "ACTIVE" },
        { $set: { status: "INACTIVE", updatedBy: user.id } }
      );
    }

    const updateDoc: any = {
      updatedBy: user.id,
    };
    if (validatedData.name) updateDoc.name = validatedData.name;
    if (validatedData.startDate) updateDoc.startDate = validatedData.startDate;
    if (validatedData.endDate) updateDoc.endDate = validatedData.endDate;
    if (validatedData.status) updateDoc.status = validatedData.status;

    const updated = await AcademicYear.findByIdAndUpdate(
      academicYearId,
      { $set: updateDoc },
      { new: true }
    );

    // Audit log
    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "ACADEMIC_YEAR_UPDATED",
      entityType: "ACADEMIC_YEAR",
      entityId: academicYearId,
      schoolId,
      metadata: {
        updatedFields: Object.keys(validatedData),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Academic year updated successfully",
      data: {
        id: updated!._id.toString(),
        name: updated!.name,
        startDate: updated!.startDate,
        endDate: updated!.endDate,
        status: updated!.status,
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
          message: error instanceof Error ? error.message : "Failed to update academic year",
        },
      },
      { status: 500 }
    );
  }
}
