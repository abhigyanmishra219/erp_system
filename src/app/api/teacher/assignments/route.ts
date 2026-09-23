import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";
import { getTeacherScope } from "@/lib/auth/teacherScope";

export async function GET(req: NextRequest) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const { teacher, schoolId } = auth.context;

  const { searchParams } = new URL(req.url);
  const academicYearId = searchParams.get("academicYearId") || undefined;

  const scope = await getTeacherScope({
    schoolId,
    teacherId: teacher._id.toString(),
    academicYearId,
  });

  return NextResponse.json({
    success: true,
    data: scope,
  });
}
