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
  { params }: { params: Promise<{ classId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { classId } = await params;

  if (!mongoose.Types.ObjectId.isValid(classId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid class ID" } },
      { status: 400 }
    );
  }

  try {
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date") || formatAttendanceDate(new Date());
    const academicYearId = url.searchParams.get("academicYearId") || "";

    const normalizedDate = normalizeAttendanceDate(dateParam);

    await connectToDatabase();

    const targetClass = await Class.findOne({ _id: classId, schoolId }).lean();
    if (!targetClass) {
      return NextResponse.json(
        { success: false, error: { code: "CLASS_NOT_FOUND", message: "Class not found in this school." } },
        { status: 404 }
      );
    }

    const effectiveAcademicYearId = (academicYearId && mongoose.Types.ObjectId.isValid(academicYearId))
      ? academicYearId
      : targetClass.academicYearId.toString();

    const academicYear = await AcademicYear.findOne({ _id: effectiveAcademicYearId, schoolId }).lean();

    // Fetch all active sections in this class
    const sections = await Section.find({
      schoolId,
      academicYearId: effectiveAcademicYearId,
      classId,
      isActive: true,
    })
      .sort({ name: 1 })
      .lean();

    // Fetch all students and attendance for these sections
    const sectionSummaries = await Promise.all(
      sections.map(async (sec: any) => {
        const totalStudents = await Student.countDocuments({
          schoolId,
          academicYearId: effectiveAcademicYearId,
          classId,
          sectionId: sec._id,
          status: { $in: ["ACTIVE", "INACTIVE"] },
        });

        const records = await Attendance.find({
          schoolId,
          academicYearId: effectiveAcademicYearId,
          classId,
          sectionId: sec._id,
          date: normalizedDate,
        }).lean();

        let present = 0;
        let absent = 0;
        let late = 0;
        let leave = 0;

        for (const r of records) {
          if (r.status === "PRESENT") present++;
          else if (r.status === "ABSENT") absent++;
          else if (r.status === "LATE") late++;
          else if (r.status === "LEAVE") leave++;
        }

        const totalMarked = present + absent + late + leave;
        const unmarked = Math.max(0, totalStudents - totalMarked);
        const attended = present + late;
        const percentage = totalMarked > 0 ? Number(((attended / totalMarked) * 100).toFixed(1)) : 0;

        return {
          sectionId: sec._id.toString(),
          name: sec.name,
          code: sec.code,
          capacity: sec.capacity,
          totalStudents,
          totalMarked,
          presentCount: present,
          absentCount: absent,
          lateCount: late,
          leaveCount: leave,
          unmarkedCount: unmarked,
          percentage,
        };
      })
    );

    let classTotalStudents = 0;
    let classTotalMarked = 0;
    let classPresent = 0;
    let classAbsent = 0;
    let classLate = 0;
    let classLeave = 0;

    for (const s of sectionSummaries) {
      classTotalStudents += s.totalStudents;
      classTotalMarked += s.totalMarked;
      classPresent += s.presentCount;
      classAbsent += s.absentCount;
      classLate += s.lateCount;
      classLeave += s.leaveCount;
    }

    const classUnmarked = Math.max(0, classTotalStudents - classTotalMarked);
    const classAttended = classPresent + classLate;
    const classPercentage =
      classTotalMarked > 0 ? Number(((classAttended / classTotalMarked) * 100).toFixed(1)) : 0;

    return NextResponse.json({
      success: true,
      data: {
        date: formatAttendanceDate(normalizedDate),
        academicYear: academicYear ? { id: academicYear._id.toString(), name: academicYear.name } : null,
        class: { id: targetClass._id.toString(), name: targetClass.name, code: targetClass.code },
        classSummary: {
          totalStudents: classTotalStudents,
          totalMarked: classTotalMarked,
          presentCount: classPresent,
          absentCount: classAbsent,
          lateCount: classLate,
          leaveCount: classLeave,
          unmarkedCount: classUnmarked,
          percentage: classPercentage,
        },
        sections: sectionSummaries,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: error.message || "Failed to fetch class attendance overview",
        },
      },
      { status: 500 }
    );
  }
}
