import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Attendance from "@/models/Attendance";
import Student from "@/models/Student";
import Section from "@/models/Section";
import Class from "@/models/Class";
import AcademicYear from "@/models/AcademicYear";
import { normalizeAttendanceDate, formatAttendanceDate } from "@/lib/utils/date";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { sectionId } = await params;

  if (!mongoose.Types.ObjectId.isValid(sectionId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid section ID" } },
      { status: 400 }
    );
  }

  try {
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date") || formatAttendanceDate(new Date());
    const academicYearId = url.searchParams.get("academicYearId") || "";

    const normalizedDate = normalizeAttendanceDate(dateParam);

    await connectToDatabase();

    // 1. Verify section belongs to tenant
    const sectionQuery: Record<string, any> = { _id: sectionId, schoolId };
    if (academicYearId && mongoose.Types.ObjectId.isValid(academicYearId)) {
      sectionQuery.academicYearId = academicYearId;
    }

    const section = await Section.findOne(sectionQuery).lean();
    if (!section) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "SECTION_NOT_FOUND", message: "Section not found in this school." },
        },
        { status: 404 }
      );
    }

    const effectiveAcademicYearId = section.academicYearId.toString();

    // 2. Fetch class and academic year info
    const [targetClass, academicYear] = await Promise.all([
      Class.findOne({ _id: section.classId, schoolId }).lean(),
      AcademicYear.findOne({ _id: effectiveAcademicYearId, schoolId }).lean(),
    ]);

    // 3. Fetch all eligible students in this section
    const students = await Student.find({
      schoolId,
      academicYearId: effectiveAcademicYearId,
      classId: section.classId,
      sectionId: section._id,
      status: { $in: ["ACTIVE", "INACTIVE"] },
    })
      .sort({ rollNumber: 1, firstName: 1, lastName: 1 })
      .lean();

    const studentIds = students.map((s) => s._id);

    // 4. Fetch attendance records for this date
    const attendanceRecords = await Attendance.find({
      schoolId,
      academicYearId: effectiveAcademicYearId,
      classId: section.classId,
      sectionId: section._id,
      date: normalizedDate,
      studentId: { $in: studentIds },
    })
      .populate("markedBy", "name email role")
      .populate("editedBy", "name email role")
      .lean();

    const attendanceMap = new Map<string, any>();
    for (const rec of attendanceRecords) {
      attendanceMap.set(rec.studentId.toString(), rec);
    }

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;
    let unmarkedCount = 0;

    const studentAttendanceList = students.map((student: any) => {
      const rec = attendanceMap.get(student._id.toString());
      const status = rec ? rec.status : null;

      if (status === "PRESENT") presentCount++;
      else if (status === "ABSENT") absentCount++;
      else if (status === "LATE") lateCount++;
      else if (status === "LEAVE") leaveCount++;
      else unmarkedCount++;

      return {
        studentId: student._id.toString(),
        name: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        rollNumber: student.rollNumber || "",
        gender: student.gender,
        avatarUrl: student.avatarUrl || "",
        attendanceId: rec ? rec._id.toString() : null,
        status: status || null, // null indicates not marked yet
        remarks: rec ? rec.remarks || "" : "",
        isLocked: rec ? !!rec.isLocked : false,
        markedBy: rec?.markedBy ? { name: rec.markedBy.name } : null,
        editedBy: rec?.editedBy ? { name: rec.editedBy.name } : null,
        updatedAt: rec ? rec.updatedAt : null,
      };
    });

    const totalStudents = students.length;
    const totalMarked = presentCount + absentCount + lateCount + leaveCount;
    const attendedCount = presentCount + lateCount;
    const percentage = totalMarked > 0 ? Number(((attendedCount / totalMarked) * 100).toFixed(1)) : 0;

    return NextResponse.json({
      success: true,
      data: {
        date: formatAttendanceDate(normalizedDate),
        academicYear: academicYear ? { id: academicYear._id.toString(), name: academicYear.name } : null,
        class: targetClass ? { id: targetClass._id.toString(), name: targetClass.name, code: targetClass.code } : null,
        section: { id: section._id.toString(), name: section.name, code: section.code, capacity: section.capacity },
        summary: {
          totalStudents,
          totalMarked,
          presentCount,
          absentCount,
          lateCount,
          leaveCount,
          unmarkedCount,
          percentage,
        },
        students: studentAttendanceList,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: error.message || "Failed to fetch section attendance",
        },
      },
      { status: 500 }
    );
  }
}
