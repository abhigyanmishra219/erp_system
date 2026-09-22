import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { updateSectionSchema } from "@/lib/validation/adminSetup";
import Section from "@/models/Section";
import AuditLog from "@/models/AuditLog";
import connectToDatabase from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { sectionId } = await params;

  if (!mongoose.Types.ObjectId.isValid(sectionId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid section ID" } },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const section = await Section.findOne({ _id: sectionId, schoolId })
    .populate("classId", "name code")
    .populate("academicYearId", "name")
    .lean();

  if (!section) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Section not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: section._id.toString(),
      name: section.name,
      code: section.code || "",
      capacity: section.capacity,
      classId: (section.classId as any)?._id?.toString() || section.classId.toString(),
      className: (section.classId as any)?.name || "Unknown Class",
      academicYearId: (section.academicYearId as any)?._id?.toString() || section.academicYearId.toString(),
      academicYearName: (section.academicYearId as any)?.name || "Unknown Year",
      isActive: section.isActive,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { sectionId } = await params;

  if (!mongoose.Types.ObjectId.isValid(sectionId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid section ID" } },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const validatedData = updateSectionSchema.parse(body);

    await connectToDatabase();

    const existing = await Section.findOne({ _id: sectionId, schoolId });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Section not found" } },
        { status: 404 }
      );
    }

    if (validatedData.name && validatedData.name !== existing.name) {
      const duplicate = await Section.findOne({
        _id: { $ne: sectionId },
        schoolId,
        classId: existing.classId,
        academicYearId: existing.academicYearId,
        name: { $regex: new RegExp(`^${validatedData.name}$`, "i") },
      });
      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "DUPLICATE_SECTION",
              message: `A section named '${validatedData.name}' already exists in this class.`,
            },
          },
          { status: 409 }
        );
      }
    }

    const updateDoc: any = {
      updatedBy: user.id,
    };
    if (validatedData.name !== undefined) updateDoc.name = validatedData.name;
    if (validatedData.code !== undefined) updateDoc.code = validatedData.code;
    if (validatedData.capacity !== undefined) updateDoc.capacity = validatedData.capacity;
    if (validatedData.isActive !== undefined) updateDoc.isActive = validatedData.isActive;

    const updated = await Section.findByIdAndUpdate(
      sectionId,
      { $set: updateDoc },
      { new: true }
    );

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "SECTION_UPDATED",
      entityType: "SECTION",
      entityId: sectionId,
      schoolId,
      metadata: {
        updatedFields: Object.keys(validatedData),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Section updated successfully",
      data: {
        id: updated!._id.toString(),
        name: updated!.name,
        code: updated!.code,
        capacity: updated!.capacity,
        isActive: updated!.isActive,
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
          message: error instanceof Error ? error.message : "Failed to update section",
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { sectionId } = await params;

  if (!mongoose.Types.ObjectId.isValid(sectionId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid section ID" } },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const section = await Section.findOne({ _id: sectionId, schoolId });
  if (!section) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Section not found" } },
      { status: 404 }
    );
  }

  // Soft deactivation
  section.isActive = false;
  section.updatedBy = user.id;
  await section.save();

  await AuditLog.create({
    userId: user.id,
    userRole: user.role,
    action: "SECTION_DEACTIVATED",
    entityType: "SECTION",
    entityId: sectionId,
    schoolId,
    metadata: {
      name: section.name,
    },
  });

  return NextResponse.json({
    success: true,
    message: `Section '${section.name}' has been deactivated.`,
  });
}
