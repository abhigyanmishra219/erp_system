import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTeacher } from "@/lib/auth/requireTeacher";
import { requireModule } from "@/lib/subscription-guard";
import { verifyTeacherSectionScope } from "@/lib/auth/teacherScope";
import connectToDatabase from "@/lib/db";
import Attendance from "@/models/Attendance";
import Student from "@/models/Student";
import Section from "@/models/Section";
import Class from "@/models/Class";
import AcademicYear from "@/models/AcademicYear";
import { getMonthDateRange, getDaysInMonth, normalizeAttendanceDate, formatAttendanceDate } from "@/lib/utils/date";

export async function GET(req: NextRequest) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "ATTENDANCE");
  if (!subCheck.allowed) return subCheck.response!;

  const { teacher, schoolId } = auth.context;
  const teacherIdStr = teacher._id.toString();

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") || "daily";
  const classId = url.searchParams.get("classId");
  const sectionId = url.searchParams.get("sectionId");
  const academicYearId = url.searchParams.get("academicYearId");

  if (!classId || !sectionId) {
    return NextResponse.json(
      { success: false, error: "classId and sectionId are required parameters." },
      { status: 400 }
    );
  }

  if (!mongoose.Types.ObjectId.isValid(classId) || !mongoose.Types.ObjectId.isValid(sectionId)) {
    return NextResponse.json(
      { success: false, error: "Invalid class or section ID format." },
      { status: 400 }
    );
  }

  await connectToDatabase();

  // 1. Strictly Validate Teacher Assignment Scope
  const isAuthorized = await verifyTeacherSectionScope({
    schoolId,
    teacherId: teacherIdStr,
    classId,
    sectionId,
  });

  if (!isAuthorized) {
    return NextResponse.json(
      {
        success: false,
        error: "Access Denied: You do not have permission to view attendance history for this class and section.",
      },
      { status: 403 }
    );
  }

  // 2. Fetch Class & Section Details
  const [targetClass, targetSection] = await Promise.all([
    Class.findOne({ _id: classId, schoolId }).lean(),
    Section.findOne({ _id: sectionId, schoolId }).lean(),
  ]);

  if (!targetClass || !targetSection) {
    return NextResponse.json(
      { success: false, error: "Class or section not found." },
      { status: 404 }
    );
  }

  // --------------------------------------------------------------------------
  // MODE 1: DAILY ATTENDANCE HISTORY
  // --------------------------------------------------------------------------
  if (mode === "daily") {
    const dateParam = url.searchParams.get("date") || new Date().toISOString();
    const normalizedDate = normalizeAttendanceDate(dateParam);

    const students = await Student.find({
      schoolId,
      classId,
      sectionId,
      status: { $in: ["ACTIVE", "INACTIVE"] },
    })
      .sort({ rollNumber: 1, firstName: 1, lastName: 1 })
      .lean();

    const studentIds = students.map((s) => s._id);

    const records = await Attendance.find({
      schoolId,
      classId,
      sectionId,
      studentId: { $in: studentIds },
      date: normalizedDate,
    })
      .populate("markedBy", "name email")
      .populate("editedBy", "name email")
      .lean();

    const recordMap = new Map(records.map((r: any) => [r.studentId.toString(), r]));

    let present = 0;
    let absent = 0;
    let late = 0;
    let leave = 0;

    const studentRows = students.map((s: any) => {
      const sId = s._id.toString();
      const rec = recordMap.get(sId);
      const status = rec?.status || "UNMARKED";

      if (status === "PRESENT") present++;
      else if (status === "ABSENT") absent++;
      else if (status === "LATE") late++;
      else if (status === "LEAVE") leave++;

      return {
        studentId: sId,
        admissionNumber: s.admissionNumber,
        rollNumber: s.rollNumber || "—",
        firstName: s.firstName,
        lastName: s.lastName,
        fullName: `${s.firstName} ${s.lastName}`.trim(),
        avatarUrl: s.avatarUrl || "",
        status,
        remarks: rec?.remarks || "",
        markedByRole: rec?.markedByRole || null,
        markedByName: (rec?.markedBy as any)?.name || "Teacher",
        editedAt: rec?.editedAt || null,
        isLocked: rec?.isLocked || false,
      };
    });

    const total = students.length;
    const attended = present + late;
    const percentage = total > 0 && records.length > 0 ? Math.round((attended / records.length) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        mode: "daily",
        date: formatAttendanceDate(normalizedDate),
        className: targetClass.name,
        sectionName: targetSection.name,
        summary: {
          total,
          markedCount: records.length,
          present,
          absent,
          late,
          leave,
          percentage,
        },
        students: studentRows,
      },
    });
  }

  // --------------------------------------------------------------------------
  // MODE 2: MONTHLY REGISTER MATRIX
  // --------------------------------------------------------------------------
  if (mode === "monthly") {
    const now = new Date();
    const month = parseInt(url.searchParams.get("month") || String(now.getUTCMonth() + 1), 10);
    const year = parseInt(url.searchParams.get("year") || String(now.getUTCFullYear()), 10);

    const { startDate, endDate } = getMonthDateRange(year, month);
    const totalDaysInMonth = getDaysInMonth(year, month);

    const students = await Student.find({
      schoolId,
      classId,
      sectionId,
      status: { $in: ["ACTIVE", "INACTIVE"] },
    })
      .sort({ rollNumber: 1, firstName: 1, lastName: 1 })
      .lean();

    const studentIds = students.map((s) => s._id);

    const records = await Attendance.find({
      schoolId,
      classId,
      sectionId,
      studentId: { $in: studentIds },
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    const studentRecordsMap = new Map<string, any[]>();
    for (const rec of records) {
      const sId = rec.studentId.toString();
      if (!studentRecordsMap.has(sId)) {
        studentRecordsMap.set(sId, []);
      }
      studentRecordsMap.get(sId)!.push(rec);
    }

    let sectionTotalPresent = 0;
    let sectionTotalAbsent = 0;
    let sectionTotalLate = 0;
    let sectionTotalLeave = 0;

    const studentRows = students.map((student: any) => {
      const sId = student._id.toString();
      const studentRecs = studentRecordsMap.get(sId) || [];

      const dailyMap: Record<number, string> = {};
      let pCount = 0;
      let aCount = 0;
      let lCount = 0;
      let lvCount = 0;

      for (const rec of studentRecs) {
        const d = new Date(rec.date);
        const dayNum = d.getUTCDate();
        dailyMap[dayNum] = rec.status;

        if (rec.status === "PRESENT") {
          pCount++;
          sectionTotalPresent++;
        } else if (rec.status === "ABSENT") {
          aCount++;
          sectionTotalAbsent++;
        } else if (rec.status === "LATE") {
          lCount++;
          sectionTotalLate++;
        } else if (rec.status === "LEAVE") {
          lvCount++;
          sectionTotalLeave++;
        }
      }

      const totalMarked = studentRecs.length;
      const attended = pCount + lCount;
      const percentage = totalMarked > 0 ? Math.round((attended / totalMarked) * 100) : 0;

      return {
        studentId: sId,
        fullName: `${student.firstName} ${student.lastName}`.trim(),
        admissionNumber: student.admissionNumber,
        rollNumber: student.rollNumber || "—",
        gender: student.gender,
        avatarUrl: student.avatarUrl || "",
        dailyMap,
        summary: {
          totalMarked,
          presentCount: pCount,
          absentCount: aCount,
          lateCount: lCount,
          leaveCount: lvCount,
          percentage,
        },
      };
    });

    const totalMarkedRecords = records.length;
    const totalAttended = sectionTotalPresent + sectionTotalLate;
    const sectionPercentage =
      totalMarkedRecords > 0 ? Math.round((totalAttended / totalMarkedRecords) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        mode: "monthly",
        year,
        month,
        totalDaysInMonth,
        className: targetClass.name,
        sectionName: targetSection.name,
        sectionSummary: {
          totalStudents: students.length,
          totalMarked: totalMarkedRecords,
          presentCount: sectionTotalPresent,
          absentCount: sectionTotalAbsent,
          lateCount: sectionTotalLate,
          leaveCount: sectionTotalLeave,
          percentage: sectionPercentage,
        },
        students: studentRows,
      },
    });
  }

  // --------------------------------------------------------------------------
  // MODE 3: INDIVIDUAL STUDENT HISTORY
  // --------------------------------------------------------------------------
  if (mode === "student") {
    const studentId = url.searchParams.get("studentId");
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return NextResponse.json(
        { success: false, error: "studentId query parameter is required for student history mode." },
        { status: 400 }
      );
    }

    const student = await Student.findOne({
      _id: studentId,
      schoolId,
      classId,
      sectionId,
    }).lean();

    if (!student) {
      return NextResponse.json(
        { success: false, error: "Student not found in this class and section." },
        { status: 404 }
      );
    }

    const records = await Attendance.find({
      schoolId,
      studentId,
    })
      .sort({ date: -1 })
      .lean();

    let present = 0;
    let absent = 0;
    let late = 0;
    let leave = 0;

    const formattedRecords = records.map((r: any) => {
      if (r.status === "PRESENT") present++;
      else if (r.status === "ABSENT") absent++;
      else if (r.status === "LATE") late++;
      else if (r.status === "LEAVE") leave++;

      return {
        _id: r._id.toString(),
        date: formatAttendanceDate(new Date(r.date)),
        status: r.status,
        remarks: r.remarks || "",
        markedByRole: r.markedByRole || "TEACHER",
        isLocked: r.isLocked || false,
      };
    });

    const totalDays = records.length;
    const attended = present + late;
    const percentage = totalDays > 0 ? Math.round((attended / totalDays) * 100) : 100;

    return NextResponse.json({
      success: true,
      data: {
        mode: "student",
        student: {
          _id: student._id.toString(),
          fullName: `${student.firstName} ${student.lastName}`.trim(),
          admissionNumber: student.admissionNumber,
          rollNumber: student.rollNumber || "—",
          className: targetClass.name,
          sectionName: targetSection.name,
          avatarUrl: student.avatarUrl || "",
        },
        summary: {
          totalDays,
          present,
          absent,
          late,
          leave,
          percentage,
        },
        records: formattedRecords,
      },
    });
  }

  return NextResponse.json(
    { success: false, error: "Invalid history mode requested." },
    { status: 400 }
  );
}
