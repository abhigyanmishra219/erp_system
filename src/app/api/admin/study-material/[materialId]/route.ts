import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import StudyMaterial from "@/models/StudyMaterial";
import AuditLog from "@/models/AuditLog";
import { updateStudyMaterialSchema } from "@/lib/validation/studyMaterial";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "STUDY_MATERIAL");
  if (!subCheck.allowed) return subCheck.response!;

  const { schoolId } = auth.context;
  const { materialId } = await params;

  if (!mongoose.Types.ObjectId.isValid(materialId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid material ID" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const material = await StudyMaterial.findOne({
      _id: materialId,
      schoolId,
    })
      .populate("academicYearId", "name status")
      .populate("classId", "name code")
      .populate("subjectId", "name code")
      .populate("teacherId", "firstName lastName email")
      .lean();

    if (!material || !material.isActive) {
      return NextResponse.json(
        { success: false, error: { code: "MATERIAL_NOT_FOUND", message: "Study material not found." } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { material },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch study material" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "STUDY_MATERIAL");
  if (!subCheck.allowed) return subCheck.response!;

  const { schoolId, user } = auth.context;
  const { materialId } = await params;

  if (!mongoose.Types.ObjectId.isValid(materialId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid material ID" } },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const validated = updateStudyMaterialSchema.parse(body);

    await connectToDatabase();

    const material = await StudyMaterial.findOne({ _id: materialId, schoolId });
    if (!material || !material.isActive) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Study material not found." } },
        { status: 404 }
      );
    }

    if (validated.topic) material.topic = validated.topic.trim();
    if (validated.title) material.title = validated.title.trim();
    if (validated.description !== undefined) material.description = validated.description;
    if (validated.type) material.type = validated.type;
    if (validated.url) material.url = validated.url.trim();
    if (validated.fileName !== undefined) material.fileName = validated.fileName;
    if (validated.fileSize !== undefined) material.fileSize = validated.fileSize;
    if (validated.mimeType !== undefined) material.mimeType = validated.mimeType;
    if (validated.isActive !== undefined) material.isActive = validated.isActive;

    material.updatedBy = user.id;
    await material.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "STUDY_MATERIAL_UPDATED",
      entityType: "STUDY_MATERIAL",
      entityId: material._id.toString(),
      schoolId,
      metadata: {
        materialId: material._id.toString(),
        title: material.title,
        updatedFields: Object.keys(validated),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Study material updated successfully",
      data: { material },
    });
  } catch (error: any) {
    if (error.issues) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Validation failed", details: error.issues } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to update study material" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "STUDY_MATERIAL");
  if (!subCheck.allowed) return subCheck.response!;

  const { schoolId, user } = auth.context;
  const { materialId } = await params;

  if (!mongoose.Types.ObjectId.isValid(materialId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid material ID" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const material = await StudyMaterial.findOne({ _id: materialId, schoolId });
    if (!material) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Study material not found." } },
        { status: 404 }
      );
    }

    material.isActive = false;
    material.updatedBy = user.id;
    await material.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "STUDY_MATERIAL_DELETED",
      entityType: "STUDY_MATERIAL",
      entityId: material._id.toString(),
      schoolId,
      metadata: {
        materialId: material._id.toString(),
        title: material.title,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Study material deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to delete study material" } },
      { status: 500 }
    );
  }
}
