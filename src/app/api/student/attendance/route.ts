import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/auth/requireStudent";
import connectToDatabase from "@/lib/db";
import Attendance from "@/models/Attendance";
import AcademicYear from "@/models/AcademicYear";
import Class from "@/models/Class";
import Section from "@/models/Section";
import { calculateAttendanceSummary } from "@/lib/utils/attendance";
import { getDayOfWeek } from "@/lib/utils/date";

export async function GET(req: NextRequest) {
  const auth = await requireStudent(req);
  if (!auth.success) return auth.response;

  const { student, schoolId, classId, sectionId, academicYearId } = auth.context;

  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const requestedYearId = searchParams.get("academicYearId");
  const filterMonth = searchParams.get("month"); // e.g. "2026-09" or "9"
  const filterStatus = searchParams.get("status"); // e.g. "PRESENT", "ABSENT"

  // 1. Resolve Academic Year Context
  let targetYearId = academicYearId || student.academicYearId;

  if (requestedYearId) {
    // Verify requested academic year belongs to this school
    const validYear = await AcademicYear.findOne({
      _id: requestedYearId,
      schoolId,
    }).lean();

    if (validYear) {
      targetYearId = validYear._id;
    }
  }

  // 2. Fetch Academic Details (Class, Section, Academic Year)
  const [classDoc, sectionDoc, currentYearDoc, allSchoolYears] = await Promise.all([
    Class.findById(classId).select("name code").lean(),
    Section.findById(sectionId).select("name").lean(),
    AcademicYear.findById(targetYearId).select("name startDate endDate status").lean(),
    AcademicYear.find({ schoolId }).select("name startDate endDate status").sort({ startDate: -1 }).lean(),
  ]);

  // 3. Query all attendance records for this student and selected academic year
  // STRICTLY scoped to student._id and schoolId
  const attendanceQuery: Record<string, any> = {
    schoolId,
    studentId: student._id,
    academicYearId: targetYearId,
  };

  const rawRecords = await Attendance.find(attendanceQuery)
    .sort({ date: -1 })
    .lean();

  // 4. Overall Attendance Summary using standard utility
  const overallSummary = calculateAttendanceSummary(
    rawRecords.map((r: any) => ({
      date: r.date,
      status: r.status,
      remarks: r.remarks,
    }))
  );

  // 5. Monthly Attendance Aggregation
  const monthlyGroups = new Map<string, any[]>();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  rawRecords.forEach((r: any) => {
    const d = new Date(r.date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const monthKey = `${yyyy}-${mm}`;

    if (!monthlyGroups.has(monthKey)) {
      monthlyGroups.set(monthKey, []);
    }
    monthlyGroups.get(monthKey)!.push(r);
  });

  const monthlyBreakdown: Array<{
    monthKey: string;
    monthName: string;
    year: number;
    month: number;
    totalMarked: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    leaveCount: number;
    attendedCount: number;
    percentage: number;
  }> = [];

  monthlyGroups.forEach((records, monthKey) => {
    const [yearStr, monthStr] = monthKey.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const monthName = `${monthNames[month - 1]} ${year}`;

    const summary = calculateAttendanceSummary(
      records.map((r: any) => ({
        date: r.date,
        status: r.status,
        remarks: r.remarks,
      }))
    );

    monthlyBreakdown.push({
      monthKey,
      monthName,
      year,
      month,
      totalMarked: summary.totalMarked,
      presentCount: summary.presentCount,
      absentCount: summary.absentCount,
      lateCount: summary.lateCount,
      leaveCount: summary.leaveCount,
      attendedCount: summary.attendedCount,
      percentage: summary.percentage,
    });
  });

  // Sort monthly breakdown descending by monthKey
  monthlyBreakdown.sort((a, b) => b.monthKey.localeCompare(a.monthKey));

  // 6. Filtered History / Logs
  let filteredRecords = rawRecords;

  if (filterMonth) {
    filteredRecords = filteredRecords.filter((r: any) => {
      const d = new Date(r.date);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const monthKey = `${yyyy}-${mm}`;
      return monthKey === filterMonth || String(d.getMonth() + 1) === filterMonth;
    });
  }

  if (filterStatus) {
    filteredRecords = filteredRecords.filter((r: any) => r.status === filterStatus.toUpperCase());
  }

  const history = filteredRecords.map((r: any) => ({
    _id: r._id.toString(),
    date: r.date,
    dayOfWeek: getDayOfWeek(new Date(r.date)),
    status: r.status,
    remarks: r.remarks || "",
  }));

  return NextResponse.json({
    success: true,
    data: {
      academicContext: {
        academicYear: {
          _id: targetYearId ? targetYearId.toString() : "",
          name: currentYearDoc?.name || "N/A",
          status: currentYearDoc?.status || "ACTIVE",
        },
        class: {
          _id: classId ? classId.toString() : "",
          name: classDoc?.name || "N/A",
          code: classDoc?.code || "",
        },
        section: {
          _id: sectionId ? sectionId.toString() : "",
          name: sectionDoc?.name || "N/A",
        },
        availableAcademicYears: allSchoolYears.map((y: any) => ({
          _id: y._id.toString(),
          name: y.name,
          status: y.status,
          isCurrent: y._id.toString() === targetYearId.toString(),
        })),
      },
      summary: overallSummary,
      monthlyBreakdown,
      history,
    },
  });
}

export async function POST() {
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
}
export async function PUT() {
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
}
export async function PATCH() {
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
}
export async function DELETE() {
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
}

