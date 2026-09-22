import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Teacher from "@/models/Teacher";
import Assignment from "@/models/Assignment";
import StudyMaterial from "@/models/StudyMaterial";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { teacherId } = await params;

  if (!mongoose.Types.ObjectId.isValid(teacherId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid teacher ID" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const teacher = await Teacher.findOne({ _id: teacherId, schoolId }).lean();
    if (!teacher) {
      return NextResponse.json(
        { success: false, error: { code: "TEACHER_NOT_FOUND", message: "Teacher not found." } },
        { status: 404 }
      );
    }

    const [assignments, materials] = await Promise.all([
      Assignment.find({ schoolId, teacherId: teacher._id, isActive: true })
        .populate("classId", "name code")
        .populate("sectionId", "name")
        .populate("subjectId", "name code")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      StudyMaterial.find({ schoolId, teacherId: teacher._id, isActive: true })
        .populate("classId", "name code")
        .populate("subjectId", "name code")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        teacher: {
          id: teacher._id.toString(),
          name: `${teacher.firstName} ${teacher.lastName}`,
        },
        assignments: assignments.map((a: any) => ({
          id: a._id.toString(),
          title: a.title,
          class: a.classId ? { name: a.classId.name } : null,
          section: a.sectionId ? { name: a.sectionId.name } : null,
          subject: a.subjectId ? { name: a.subjectId.name } : null,
          dueDate: a.dueDate,
          status: a.status,
          createdAt: a.createdAt,
        })),
        studyMaterials: materials.map((m: any) => ({
          id: m._id.toString(),
          title: m.title,
          topic: m.topic,
          type: m.type,
          class: m.classId ? { name: m.classId.name } : null,
          subject: m.subjectId ? { name: m.subjectId.name } : null,
          url: m.url,
          createdAt: m.createdAt,
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch teacher materials" } },
      { status: 500 }
    );
  }
}
