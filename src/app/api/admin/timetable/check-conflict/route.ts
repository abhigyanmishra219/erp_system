import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { checkTimetableConflictSchema } from "@/lib/validation/timetable";
import { TimetableConflictService } from "@/lib/services/timetableConflictService";

export async function POST(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;

  try {
    await connectToDatabase();

    const body = await req.json();
    const parseResult = checkTimetableConflictSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: parseResult.error.issues[0]?.message || "Validation error",
            issues: parseResult.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const {
      academicYearId,
      classId,
      sectionId,
      teacherId,
      dayOfWeek,
      startTime,
      endTime,
      excludeEntryId,
    } = parseResult.data;

    const result = await TimetableConflictService.checkConflict({
      schoolId,
      academicYearId,
      classId,
      sectionId,
      teacherId,
      dayOfWeek,
      startTime,
      endTime,
      excludeEntryId,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to check timetable conflicts" } },
      { status: 500 }
    );
  }
}
