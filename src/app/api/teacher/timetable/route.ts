import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";
import connectToDatabase from "@/lib/db";
import AcademicYear from "@/models/AcademicYear";
import TimetableEntry, { DAYS_OF_WEEK } from "@/models/TimetableEntry";

const DAYS_MAP = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

export async function GET(req: NextRequest) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const { teacher, schoolId } = auth.context;

  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const requestedYearId = searchParams.get("academicYearId");

  // Resolve active academic year if not specified
  let activeYear = null;
  if (requestedYearId) {
    activeYear = await AcademicYear.findOne({
      _id: requestedYearId,
      schoolId,
    }).lean();
  }
  if (!activeYear) {
    activeYear = await AcademicYear.findOne({
      schoolId,
      status: "ACTIVE",
    }).lean();
  }

  const academicYearId = activeYear?._id?.toString();

  // Strict Security Rule: Never allow client-supplied teacherId
  // Always query strictly by teacher._id from the authenticated JWT session
  const query: Record<string, any> = {
    schoolId,
    teacherId: teacher._id,
    isActive: true,
  };

  if (academicYearId) {
    query.academicYearId = academicYearId;
  }

  const rawEntries = await TimetableEntry.find(query)
    .populate("classId", "name code")
    .populate("sectionId", "name")
    .populate("subjectId", "name code")
    .sort({ startTime: 1 })
    .lean();

  const formattedEntries = rawEntries.map((entry: any) => ({
    _id: entry._id.toString(),
    academicYearId: entry.academicYearId?.toString(),
    dayOfWeek: entry.dayOfWeek,
    startTime: entry.startTime,
    endTime: entry.endTime,
    room: entry.room || "Standard Classroom",
    classId: entry.classId?._id?.toString() || entry.classId?.toString(),
    className: entry.classId?.name || "Class",
    classCode: entry.classId?.code || "",
    sectionId: entry.sectionId?._id?.toString() || entry.sectionId?.toString(),
    sectionName: entry.sectionId?.name || "Section",
    subjectId: entry.subjectId?._id?.toString() || entry.subjectId?.toString(),
    subjectName: entry.subjectId?.name || "Subject",
    subjectCode: entry.subjectId?.code || "",
  }));

  // Group by day of week
  const weekly: Record<string, typeof formattedEntries> = {};
  DAYS_OF_WEEK.forEach((day) => {
    weekly[day] = [];
  });

  formattedEntries.forEach((entry) => {
    if (weekly[entry.dayOfWeek]) {
      weekly[entry.dayOfWeek].push(entry);
    }
  });

  // Sort each day's entries by startTime
  Object.keys(weekly).forEach((day) => {
    weekly[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  // Current Day & Today's Schedule
  const todayDate = new Date();
  const todayDayOfWeek = DAYS_MAP[todayDate.getDay()];
  const todayClasses = weekly[todayDayOfWeek] || [];

  // Summary Metrics
  const distinctClasses = new Set(formattedEntries.map((e) => e.classId)).size;
  const distinctSubjects = new Set(formattedEntries.map((e) => e.subjectId)).size;
  const distinctRooms = new Set(formattedEntries.map((e) => e.room).filter(Boolean)).size;

  return NextResponse.json({
    success: true,
    data: {
      todayDayOfWeek,
      todayClasses,
      weekly,
      allEntries: formattedEntries,
      academicYear: activeYear
        ? {
            _id: activeYear._id.toString(),
            name: activeYear.name,
            status: activeYear.status,
          }
        : null,
      summary: {
        totalWeeklyPeriods: formattedEntries.length,
        todayPeriodsCount: todayClasses.length,
        distinctClassesCount: distinctClasses,
        distinctSubjectsCount: distinctSubjects,
        distinctRoomsCount: distinctRooms,
      },
    },
  });
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Timetable modification is restricted to Administrators. Teachers have read-only access.",
    },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: "Timetable modification is restricted to Administrators. Teachers have read-only access.",
    },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    {
      success: false,
      error: "Timetable modification is restricted to Administrators. Teachers have read-only access.",
    },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: "Timetable modification is restricted to Administrators. Teachers have read-only access.",
    },
    { status: 405 }
  );
}
