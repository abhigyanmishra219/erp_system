import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import Attendance from "@/models/Attendance";
import Student from "@/models/Student";
import AcademicYear from "@/models/AcademicYear";
import { normalizeAttendanceDate, formatAttendanceDate, getMonthDateRange } from "@/lib/utils/date";
import { calculateAttendanceSummary } from "@/lib/utils/attendance";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "ATTENDANCE");
  if (!subCheck.allowed) return subCheck.response!;

  const { school, schoolId } = auth.context;
  const { studentId } = await params;

  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid student ID" } },
      { status: 400 }
    );
  }

  try {
    const url = new URL(req.url);
    const academicYearId = url.searchParams.get("academicYearId") || "";
    const classId = url.searchParams.get("classId") || "";
    const sectionId = url.searchParams.get("sectionId") || "";
    const startDateParam = url.searchParams.get("startDate") || "";
    const endDateParam = url.searchParams.get("endDate") || "";
    const monthParam = url.searchParams.get("month") ? parseInt(url.searchParams.get("month")!, 10) : undefined;
    const yearParam = url.searchParams.get("year") ? parseInt(url.searchParams.get("year")!, 10) : undefined;

    await connectToDatabase();

    // 1. Verify student exists and belongs to tenant
    const student = await Student.findOne({
      _id: studentId,
      schoolId,
    })
      .populate("classId", "name code")
      .populate("sectionId", "name code")
      .populate("academicYearId", "name startDate endDate status")
      .lean();

    if (!student) {
      return NextResponse.json(
        { success: false, error: { code: "STUDENT_NOT_FOUND", message: "Student not found in this school." } },
        { status: 404 }
      );
    }

    // 2. Validate student enrollment in requested academic context if specified
    if (classId || sectionId || academicYearId) {
      const currentYearId = student.academicYearId
        ? ((student.academicYearId as any)._id || student.academicYearId).toString()
        : "";
      const currentClassId = student.classId
        ? ((student.classId as any)._id || student.classId).toString()
        : "";
      const currentSectionId = student.sectionId
        ? ((student.sectionId as any)._id || student.sectionId).toString()
        : "";

      const currentMatchesYear = !academicYearId || currentYearId === academicYearId;
      const currentMatchesClass = !classId || currentClassId === classId;
      const currentMatchesSection = !sectionId || currentSectionId === sectionId;
      const matchesCurrent = currentMatchesYear && currentMatchesClass && currentMatchesSection;

      const matchesHistory = (student.academicHistory || []).some((h: any) => {
        const hYearId = h.academicYearId ? h.academicYearId.toString() : "";
        const hClassId = h.classId ? h.classId.toString() : "";
        const hSectionId = h.sectionId ? h.sectionId.toString() : "";
        const hMatchesYear = !academicYearId || hYearId === academicYearId;
        const hMatchesClass = !classId || hClassId === classId;
        const hMatchesSection = !sectionId || hSectionId === sectionId;
        return hMatchesYear && hMatchesClass && hMatchesSection;
      });

      if (!matchesCurrent && !matchesHistory) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "STUDENT_CONTEXT_MISMATCH",
              message: "Selected student does not belong to the selected class and section.",
            },
          },
          { status: 400 }
        );
      }
    }

    // 3. Build strict attendance filter query
    const filter: Record<string, any> = {
      schoolId,
      studentId: student._id,
    };

    if (academicYearId && mongoose.Types.ObjectId.isValid(academicYearId)) {
      filter.academicYearId = academicYearId;
    } else if (student.academicYearId) {
      filter.academicYearId = (student.academicYearId as any)._id || student.academicYearId;
    }

    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      filter.classId = classId;
    }

    if (sectionId && mongoose.Types.ObjectId.isValid(sectionId)) {
      filter.sectionId = sectionId;
    }

    if (monthParam && yearParam) {
      const { startDate, endDate } = getMonthDateRange(yearParam, monthParam);
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (startDateParam || endDateParam) {
      filter.date = {};
      if (startDateParam) filter.date.$gte = normalizeAttendanceDate(startDateParam);
      if (endDateParam) filter.date.$lte = normalizeAttendanceDate(endDateParam);
    }

    // 4. Fetch all matching attendance records sorted newest to oldest
    const records = await Attendance.find(filter)
      .populate("classId", "name code")
      .populate("sectionId", "name code")
      .populate("markedBy", "name email role")
      .sort({ date: -1 })
      .lean();

    // 4. Calculate overall summary statistics
    const workingDays = school.attendanceSettings?.workingDays;
    const overallSummary = calculateAttendanceSummary(records, {
      workingDays,
      admissionDate: student.admissionDate,
    });

    // 5. Compute Monthly Breakdown (group by YYYY-MM)
    const monthlyMap: Record<string, any[]> = {};
    for (const rec of records) {
      const d = new Date(rec.date);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      if (!monthlyMap[key]) monthlyMap[key] = [];
      monthlyMap[key].push(rec);
    }

    const MONTH_NAMES = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    const monthlyBreakdown = Object.entries(monthlyMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, monthRecords]) => {
        const [yearStr, monthStr] = key.split("-");
        const monthNum = parseInt(monthStr, 10);
        const yearNum = parseInt(yearStr, 10);
        const summary = calculateAttendanceSummary(monthRecords, { workingDays });

        return {
          key,
          year: yearNum,
          month: monthNum,
          monthName: MONTH_NAMES[monthNum - 1],
          ...summary,
        };
      });

    // 6. Format daily log
    const dailyRecords = records.map((rec: any) => ({
      id: rec._id.toString(),
      _id: rec._id.toString(),
      date: formatAttendanceDate(new Date(rec.date)),
      status: rec.status,
      remarks: rec.remarks || "",
      isLocked: !!rec.isLocked,
      markedBy: rec.markedBy ? { name: rec.markedBy.name } : null,
      class: rec.classId ? { id: rec.classId._id?.toString(), name: rec.classId.name } : null,
      section: rec.sectionId ? { id: rec.sectionId._id?.toString(), name: rec.sectionId.name } : null,
      createdAt: rec.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: student._id.toString(),
          name: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          rollNumber: student.rollNumber || "",
          gender: student.gender,
          avatarUrl: student.avatarUrl || "",
          admissionDate: student.admissionDate,
          class: student.classId ? { id: (student.classId as any)._id?.toString(), name: (student.classId as any).name } : null,
          section: student.sectionId ? { id: (student.sectionId as any)._id?.toString(), name: (student.sectionId as any).name } : null,
        },
        summary: overallSummary,
        monthlyBreakdown,
        records: dailyRecords,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: error.message || "Failed to fetch student attendance history",
        },
      },
      { status: 500 }
    );
  }
}
