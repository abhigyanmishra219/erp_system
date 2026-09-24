import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import Attendance from "@/models/Attendance";
import Student from "@/models/Student";
import Section from "@/models/Section";
import Class from "@/models/Class";
import AcademicYear from "@/models/AcademicYear";
import { getMonthDateRange, getDaysInMonth, formatAttendanceDate } from "@/lib/utils/date";
import { calculateAttendanceSummary } from "@/lib/utils/attendance";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "ATTENDANCE");
  if (!subCheck.allowed) return subCheck.response!;

  const { school, schoolId } = auth.context;

  try {
    const url = new URL(req.url);
    const academicYearId = url.searchParams.get("academicYearId");
    const classId = url.searchParams.get("classId");
    const sectionId = url.searchParams.get("sectionId");
    const now = new Date();
    const month = parseInt(url.searchParams.get("month") || String(now.getUTCMonth() + 1), 10);
    const year = parseInt(url.searchParams.get("year") || String(now.getUTCFullYear()), 10);

    if (!academicYearId || !classId || !sectionId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_REQUIRED_FILTERS",
            message: "academicYearId, classId, and sectionId are required query parameters.",
          },
        },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(academicYearId) || !mongoose.Types.ObjectId.isValid(classId) || !mongoose.Types.ObjectId.isValid(sectionId)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ID", message: "Invalid ID format provided" } },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // 1. Verify section belongs to tenant, academic year, and class
    const section = await Section.findOne({
      _id: sectionId,
      schoolId,
      academicYearId,
      classId,
    }).lean();

    if (!section) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "SECTION_NOT_FOUND", message: "Section not found in this school and class." },
        },
        { status: 404 }
      );
    }

    const [targetClass, academicYear] = await Promise.all([
      Class.findOne({ _id: classId, schoolId }).lean(),
      AcademicYear.findOne({ _id: academicYearId, schoolId }).lean(),
    ]);

    // 2. Determine month date range
    const { startDate, endDate } = getMonthDateRange(year, month);
    const totalDaysInMonth = getDaysInMonth(year, month);

    // 3. Fetch all active/inactive students in this section
    const students = await Student.find({
      schoolId,
      academicYearId,
      classId,
      sectionId,
      status: { $in: ["ACTIVE", "INACTIVE"] },
    })
      .sort({ rollNumber: 1, firstName: 1, lastName: 1 })
      .lean();

    const studentIds = students.map((s) => s._id);

    // 4. Fetch all attendance records for this section in the target month
    const records = await Attendance.find({
      schoolId,
      academicYearId,
      classId,
      sectionId,
      studentId: { $in: studentIds },
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    // Group records by studentId
    const studentRecordsMap = new Map<string, any[]>();
    for (const rec of records) {
      const sId = rec.studentId.toString();
      if (!studentRecordsMap.has(sId)) {
        studentRecordsMap.set(sId, []);
      }
      studentRecordsMap.get(sId)!.push(rec);
    }

    const workingDays = school.attendanceSettings?.workingDays;

    let sectionTotalMarked = 0;
    let sectionPresentCount = 0;
    let sectionAbsentCount = 0;
    let sectionLateCount = 0;
    let sectionLeaveCount = 0;

    const studentRows = students.map((student: any) => {
      const sId = student._id.toString();
      const studentRecs = studentRecordsMap.get(sId) || [];

      // Day-by-day status map: dayNumber -> status (e.g., 1 -> 'PRESENT', 22 -> 'ABSENT')
      const dailyMap: Record<number, string> = {};
      for (const rec of studentRecs) {
        const d = new Date(rec.date);
        const dayNum = d.getUTCDate();
        dailyMap[dayNum] = rec.status;
      }

      const summary = calculateAttendanceSummary(studentRecs, {
        workingDays,
        admissionDate: student.admissionDate,
      });

      sectionTotalMarked += summary.totalMarked;
      sectionPresentCount += summary.presentCount;
      sectionAbsentCount += summary.absentCount;
      sectionLateCount += summary.lateCount;
      sectionLeaveCount += summary.leaveCount;

      return {
        studentId: sId,
        name: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        rollNumber: student.rollNumber || "",
        gender: student.gender,
        avatarUrl: student.avatarUrl || "",
        dailyMap,
        summary,
      };
    });

    const sectionAttended = sectionPresentCount + sectionLateCount;
    const sectionPercentage =
      sectionTotalMarked > 0 ? Number(((sectionAttended / sectionTotalMarked) * 100).toFixed(1)) : 0;

    return NextResponse.json({
      success: true,
      data: {
        year,
        month,
        totalDaysInMonth,
        academicYear: academicYear ? { id: academicYear._id.toString(), name: academicYear.name } : null,
        class: targetClass ? { id: targetClass._id.toString(), name: targetClass.name, code: targetClass.code } : null,
        section: { id: section._id.toString(), name: section.name, code: section.code },
        sectionSummary: {
          totalStudents: students.length,
          totalMarked: sectionTotalMarked,
          presentCount: sectionPresentCount,
          absentCount: sectionAbsentCount,
          lateCount: sectionLateCount,
          leaveCount: sectionLeaveCount,
          percentage: sectionPercentage,
        },
        students: studentRows,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: error.message || "Failed to fetch monthly attendance matrix",
        },
      },
      { status: 500 }
    );
  }
}
