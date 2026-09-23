import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";
import { getTeacherScope } from "@/lib/auth/teacherScope";

export async function GET(req: NextRequest) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const { user, teacher, school, schoolId } = auth.context;

  // Retrieve current active scope
  const scope = await getTeacherScope({
    schoolId,
    teacherId: teacher._id.toString(),
  });

  return NextResponse.json({
    success: true,
    data: {
      user,
      teacher: {
        _id: teacher._id,
        teacherId: teacher.teacherId,
        employeeId: teacher.employeeId,
        firstName: teacher.firstName,
        middleName: teacher.middleName,
        lastName: teacher.lastName,
        photo: teacher.photo,
        email: teacher.email,
        phone: teacher.phone,
        department: teacher.department,
        designation: teacher.designation,
        joiningDate: teacher.joiningDate,
        qualification: teacher.qualification,
        gender: teacher.gender,
        status: teacher.status,
      },
      school: {
        _id: school._id,
        name: school.name,
        logo: school.logo,
      },
      scope,
    },
  });
}
