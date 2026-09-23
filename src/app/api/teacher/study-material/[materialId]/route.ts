import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTeacher } from "@/lib/auth/requireTeacher";
import { verifyTeacherClassSubjectScope } from "@/lib/auth/teacherScope";
import connectToDatabase from "@/lib/db";
import StudyMaterial from "@/models/StudyMaterial";
import { createAuditLog } from "@/lib/audit";
import { updateStudyMaterialSchema } from "@/lib/validation/studyMaterial";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const { materialId } = await params;
  if (!mongoose.Types.ObjectId.isValid(materialId)) {
    return NextResponse.json(
      { success: false, error: "Invalid material ID format" },
      { status: 400 }
    );
  }

  const { teacher, schoolId } = auth.context;
  const teacherIdStr = teacher._id.toString();

  await connectToDatabase();

  const material = await StudyMaterial.findOne({
    _id: materialId,
    schoolId,
    isActive: true,
  })
    .populate("academicYearId", "name status")
    .populate("classId", "name code")
    .populate("subjectId", "name code")
    .populate("teacherId", "firstName lastName email")
    .lean();

  if (!material) {
    return NextResponse.json(
      { success: false, error: "Study material not found" },
      { status: 404 }
    );
  }

  // Check access authorization: Teacher must either be the creator OR have active assignment for this class & subject
  const matTeacherIdStr = (material.teacherId as any)?._id?.toString() || material.teacherId?.toString();
  const isOwner = matTeacherIdStr === teacherIdStr;
  const isAuthorizedScope = await verifyTeacherClassSubjectScope({
    schoolId,
    teacherId: teacherIdStr,
    classId: (material.classId as any)?._id?.toString() || material.classId?.toString(),
    subjectId: (material.subjectId as any)?._id?.toString() || material.subjectId?.toString(),
    academicYearId: (material.academicYearId as any)?._id?.toString() || material.academicYearId?.toString(),
  });

  if (!isOwner && !isAuthorizedScope) {
    return NextResponse.json(
      { success: false, error: "Access denied: You are not authorized to view this material." },
      { status: 403 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      _id: material._id.toString(),
      title: material.title,
      description: material.description || "",
      topic: material.topic,
      type: material.type,
      url: material.url,
      fileName: material.fileName || "",
      fileSize: material.fileSize || null,
      mimeType: material.mimeType || "",
      classId: (material.classId as any)?._id?.toString() || material.classId?.toString(),
      className: (material.classId as any)?.name || "Class",
      subjectId: (material.subjectId as any)?._id?.toString() || material.subjectId?.toString(),
      subjectName: (material.subjectId as any)?.name || "Subject",
      academicYearId: (material.academicYearId as any)?._id?.toString() || material.academicYearId?.toString(),
      academicYearName: (material.academicYearId as any)?.name || "",
      teacherId: (material.teacherId as any)?._id?.toString() || material.teacherId?.toString(),
      teacherName: material.teacherId
        ? `${(material.teacherId as any).firstName} ${(material.teacherId as any).lastName}`.trim()
        : "Teacher",
      isOwner,
      createdAt: material.createdAt,
      updatedAt: material.updatedAt,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const { materialId } = await params;
  if (!mongoose.Types.ObjectId.isValid(materialId)) {
    return NextResponse.json(
      { success: false, error: "Invalid material ID format" },
      { status: 400 }
    );
  }

  const { teacher, schoolId, user } = auth.context;
  const teacherIdStr = teacher._id.toString();

  try {
    const body = await req.json();
    const parseResult = updateStudyMaterialSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const updates = parseResult.data;

    await connectToDatabase();

    const material = await StudyMaterial.findOne({
      _id: materialId,
      schoolId,
      isActive: true,
    });

    if (!material) {
      return NextResponse.json(
        { success: false, error: "Study material not found" },
        { status: 404 }
      );
    }

    // Only the creator can modify their material
    if (material.teacherId.toString() !== teacherIdStr) {
      return NextResponse.json(
        { success: false, error: "Access denied: You can only edit materials created by yourself." },
        { status: 403 }
      );
    }

    if (updates.title !== undefined) material.title = updates.title.trim();
    if (updates.topic !== undefined) material.topic = updates.topic.trim();
    if (updates.description !== undefined) material.description = updates.description.trim();
    if (updates.type !== undefined) material.type = updates.type;
    if (updates.url !== undefined) material.url = updates.url.trim();
    if (updates.fileName !== undefined) material.fileName = updates.fileName.trim();
    if (updates.fileSize !== undefined) material.fileSize = updates.fileSize;
    if (updates.mimeType !== undefined) material.mimeType = updates.mimeType.trim();
    if (updates.isActive !== undefined) material.isActive = updates.isActive;

    material.updatedBy = user._id;
    await material.save();

    // Audit Log
    await createAuditLog({
      schoolId,
      userId: user._id.toString(),
      userRole: "TEACHER",
      action: "STUDY_MATERIAL_UPDATED",
      entityType: "STUDY_MATERIAL",
      entityId: material._id.toString(),
      metadata: { title: material.title, topic: material.topic },
    });

    return NextResponse.json({
      success: true,
      message: "Study material updated successfully",
      data: material,
    });
  } catch (err: any) {
    console.error("PATCH /api/teacher/study-material/[materialId] error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update study material" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const { materialId } = await params;
  if (!mongoose.Types.ObjectId.isValid(materialId)) {
    return NextResponse.json(
      { success: false, error: "Invalid material ID format" },
      { status: 400 }
    );
  }

  const { teacher, schoolId, user } = auth.context;
  const teacherIdStr = teacher._id.toString();

  try {
    await connectToDatabase();

    const material = await StudyMaterial.findOne({
      _id: materialId,
      schoolId,
      isActive: true,
    });

    if (!material) {
      return NextResponse.json(
        { success: false, error: "Study material not found" },
        { status: 404 }
      );
    }

    // Only the creator can delete their material
    if (material.teacherId.toString() !== teacherIdStr) {
      return NextResponse.json(
        { success: false, error: "Access denied: You can only delete materials created by yourself." },
        { status: 403 }
      );
    }

    material.isActive = false;
    material.updatedBy = user._id;
    await material.save();

    // Audit Log
    await createAuditLog({
      schoolId,
      userId: user._id.toString(),
      userRole: "TEACHER",
      action: "STUDY_MATERIAL_DELETED",
      entityType: "STUDY_MATERIAL",
      entityId: material._id.toString(),
      metadata: { title: material.title, topic: material.topic },
    });

    return NextResponse.json({
      success: true,
      message: "Study material removed successfully",
    });
  } catch (err: any) {
    console.error("DELETE /api/teacher/study-material/[materialId] error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete study material" },
      { status: 500 }
    );
  }
}
