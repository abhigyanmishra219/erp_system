import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import TeacherAssignment from "@/models/TeacherAssignment";
import Teacher from "@/models/Teacher";
import ClassSubject from "@/models/ClassSubject";
import connectToDatabase from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { searchParams } = new URL(req.url);

  const academicYearId = searchParams.get("academicYearId");
  const classId = searchParams.get("classId");
  const sectionId = searchParams.get("sectionId");
  const subjectId = searchParams.get("subjectId");

  if (!academicYearId || !classId || !sectionId) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "MISSING_PARAMS",
          message: "academicYearId, classId, and sectionId are required to fetch available teachers.",
        },
      },
      { status: 400 }
    );
  }

  if (
    !mongoose.Types.ObjectId.isValid(academicYearId) ||
    !mongoose.Types.ObjectId.isValid(classId) ||
    !mongoose.Types.ObjectId.isValid(sectionId) ||
    (subjectId && !mongoose.Types.ObjectId.isValid(subjectId))
  ) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid ID parameter supplied." } },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const query: Record<string, any> = {
    schoolId,
    academicYearId,
    classId,
    sectionId,
    isActive: true,
  };

  const assignments = await TeacherAssignment.find(query)
    .populate({
      path: "teacherId",
      match: { schoolId, status: "ACTIVE" },
      select: "firstName lastName teacherId status",
    })
    .lean();

  const matchingTeachers: { id: string; name: string; teacherId: string }[] = [];
  const seenIds = new Set<string>();

  for (const a of assignments) {
    const teacher = a.teacherId as any;
    if (!teacher || !teacher._id) continue;

    const matchesSubject =
      !subjectId ||
      !a.subjectId ||
      a.subjectId.toString() === subjectId ||
      a.assignmentType === "CLASS_TEACHER" ||
      a.assignmentType === "BOTH" ||
      a.isClassTeacher;

    if (matchesSubject) {
      const tId = teacher._id.toString();
      if (!seenIds.has(tId)) {
        seenIds.add(tId);
        matchingTeachers.push({
          id: tId,
          name: `${teacher.firstName} ${teacher.lastName}`.trim(),
          teacherId: teacher.teacherId || "",
        });
      }
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      teachers: matchingTeachers,
    },
  });
}
