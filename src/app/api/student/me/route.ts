import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/auth/requireStudent";

export async function GET(req: NextRequest) {
  const auth = await requireStudent(req);
  if (!auth.success) return auth.response;

  const { user, student, school, schoolId, classId, sectionId, academicYearId } = auth.context;

  return NextResponse.json({
    success: true,
    data: {
      user,
      student: {
        _id: student._id,
        admissionNumber: student.admissionNumber,
        rollNumber: student.rollNumber || "",
        firstName: student.firstName,
        lastName: student.lastName,
        name: `${student.firstName} ${student.lastName}`.trim(),
        email: student.email || "",
        phone: student.phone || "",
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        bloodGroup: student.bloodGroup || "",
        avatarUrl: student.avatarUrl || "",
        status: student.status,
        classId,
        className: (student.classId as any)?.name || "",
        sectionId,
        sectionName: (student.sectionId as any)?.name || "",
        academicYearId,
        academicYearName: (student.academicYearId as any)?.name || "",
      },
      school: {
        _id: school._id,
        name: school.name,
        logo: school.logo,
      },
    },
  });
}
