import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireStudent } from "@/lib/auth/requireStudent";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import StudyMaterial, { StudyMaterialType } from "@/models/StudyMaterial";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  const auth = await requireStudent(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "STUDY_MATERIAL");
  if (!subCheck.allowed) return subCheck.response;

  const { student, schoolId } = auth.context;
  const { materialId } = await params;

  if (!materialId || !mongoose.Types.ObjectId.isValid(materialId)) {
    return NextResponse.json(
      { success: false, error: "Invalid study material ID provided." },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const material = await StudyMaterial.findOne({
    _id: materialId,
    schoolId,
    classId: student.classId,
    isActive: true,
  })
    .populate("academicYearId", "name status")
    .populate("classId", "name code")
    .populate("subjectId", "name code type")
    .populate("teacherId", "firstName lastName email")
    .lean();

  if (!material) {
    return NextResponse.json(
      {
        success: false,
        error: "Study material not found or not available for your class.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      _id: (material as any)._id.toString(),
      title: (material as any).title,
      description: (material as any).description || "",
      topic: (material as any).topic || "General",
      type: (material as any).type as StudyMaterialType,
      url: (material as any).url,
      fileName: (material as any).fileName || "",
      fileSize: (material as any).fileSize || null,
      mimeType: (material as any).mimeType || "",
      class: {
        _id: (material as any).classId?._id?.toString() || (material as any).classId?.toString() || "",
        name: (material as any).classId?.name || "Class",
        code: (material as any).classId?.code || "",
      },
      subject: {
        _id: (material as any).subjectId?._id?.toString() || (material as any).subjectId?.toString() || "",
        name: (material as any).subjectId?.name || "Subject",
        code: (material as any).subjectId?.code || "",
        type: (material as any).subjectId?.type || "THEORY",
      },
      teacher: (material as any).teacherId
        ? {
            _id: (material as any).teacherId._id?.toString() || (material as any).teacherId.toString(),
            name: `${(material as any).teacherId.firstName || ""} ${(material as any).teacherId.lastName || ""}`.trim() || "Faculty",
            email: (material as any).teacherId.email || "",
          }
        : null,
      academicYear: {
        _id: (material as any).academicYearId?._id?.toString() || (material as any).academicYearId?.toString() || "",
        name: (material as any).academicYearId?.name || "Academic Year",
      },
      createdAt: (material as any).createdAt,
      updatedAt: (material as any).updatedAt,
    },
  });
}

// Student cannot mutate study material
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed. Students have read-only access to study materials.",
    },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed. Students have read-only access to study materials.",
    },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed. Students have read-only access to study materials.",
    },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed. Students have read-only access to study materials.",
    },
    { status: 405 }
  );
}
