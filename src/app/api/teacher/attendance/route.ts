import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";
import { requireModule } from "@/lib/subscription-guard";
import { getTeacherScope, verifyTeacherSectionScope } from "@/lib/auth/teacherScope";
import connectToDatabase from "@/lib/db";
import Attendance from "@/models/Attendance";
import Student from "@/models/Student";
import AcademicYear from "@/models/AcademicYear";
import Class from "@/models/Class";
import Section from "@/models/Section";
import { createAuditLog } from "@/lib/audit";
import { bulkAttendanceSchema } from "@/lib/validation/attendance";
import { normalizeAttendanceDate, formatAttendanceDate } from "@/lib/utils/date";

export async function GET(req: NextRequest) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "ATTENDANCE");
  if (!subCheck.allowed) return subCheck.response!;

  const { teacher, schoolId } = auth.context;
  const teacherIdStr = teacher._id.toString();

  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");
  const sectionId = searchParams.get("sectionId");
  const dateParam = searchParams.get("date") || new Date().toISOString();
  const academicYearIdParam = searchParams.get("academicYearId");

  // 1. Get Teacher Scope
  const scope = await getTeacherScope({
    schoolId,
    teacherId: teacherIdStr,
    academicYearId: academicYearIdParam || undefined,
  });

  const { assignedClasses } = scope;

  // Build filter options
  const classesMap = new Map<string, { classId: string; className: string }>();
  const sectionsMap = new Map<string, { sectionId: string; sectionName: string; classId: string; isClassTeacher: boolean }>();

  assignedClasses.forEach((ac) => {
    if (ac.classId) {
      classesMap.set(ac.classId, { classId: ac.classId, className: ac.className });
    }
    if (ac.sectionId) {
      sectionsMap.set(ac.sectionId, {
        sectionId: ac.sectionId,
        sectionName: ac.sectionName,
        classId: ac.classId,
        isClassTeacher: ac.isClassTeacher,
      });
    }
  });

  const filterOptions = {
    classes: Array.from(classesMap.values()),
    sections: Array.from(sectionsMap.values()),
  };

  // If no specific class & section selected, return available options
  if (!classId || !sectionId) {
    return NextResponse.json({
      success: true,
      data: {
        filterOptions,
        students: [],
        date: dateParam,
        summary: {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          leave: 0,
          unmarked: 0,
          isSubmitted: false,
        },
      },
    });
  }

  // 2. Validate Teacher Assignment Scope strictly
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
        error: "Access Denied: You are not assigned to this class and section.",
      },
      { status: 403 }
    );
  }

  // 3. Resolve Academic Year
  let academicYear = null;
  if (academicYearIdParam) {
    academicYear = await AcademicYear.findOne({ _id: academicYearIdParam, schoolId }).lean();
  }
  if (!academicYear) {
    academicYear = await AcademicYear.findOne({ schoolId, status: "ACTIVE" }).lean();
  }

  const normalizedDate = normalizeAttendanceDate(dateParam);

  // 4. Fetch Students in this Class and Section
  const studentQuery: Record<string, any> = {
    schoolId,
    classId,
    sectionId,
    status: { $in: ["ACTIVE", "INACTIVE"] },
  };
  if (academicYear) {
    studentQuery.academicYearId = academicYear._id;
  }

  const students = await Student.find(studentQuery)
    .sort({ rollNumber: 1, firstName: 1, lastName: 1 })
    .lean();

  const studentIds = students.map((s) => s._id);

  // 5. Fetch Existing Attendance Records for this date
  const attendanceQuery: Record<string, any> = {
    schoolId,
    classId,
    sectionId,
    studentId: { $in: studentIds },
    date: normalizedDate,
  };
  if (academicYear) {
    attendanceQuery.academicYearId = academicYear._id;
  }

  const existingRecords = await Attendance.find(attendanceQuery).lean();
  const existingMap = new Map(existingRecords.map((r) => [r.studentId.toString(), r]));

  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let leaveCount = 0;
  let unmarkedCount = 0;

  const studentRoster = students.map((s: any) => {
    const sId = s._id.toString();
    const record = existingMap.get(sId);
    const status = record?.status || null;

    if (status === "PRESENT") presentCount++;
    else if (status === "ABSENT") absentCount++;
    else if (status === "LATE") lateCount++;
    else if (status === "LEAVE") leaveCount++;
    else unmarkedCount++;

    return {
      studentId: sId,
      admissionNumber: s.admissionNumber,
      rollNumber: s.rollNumber || "—",
      firstName: s.firstName,
      lastName: s.lastName,
      fullName: `${s.firstName} ${s.lastName}`.trim(),
      gender: s.gender,
      avatarUrl: s.avatarUrl || "",
      status: status || "PRESENT", // Default to PRESENT for easy marking
      existingStatus: status,
      remarks: record?.remarks || "",
      isLocked: record?.isLocked || false,
      markedByRole: record?.markedByRole || null,
    };
  });

  const isSubmitted = existingRecords.length > 0;

  return NextResponse.json({
    success: true,
    data: {
      filterOptions,
      date: formatAttendanceDate(normalizedDate),
      academicYear: academicYear
        ? {
            _id: academicYear._id.toString(),
            name: academicYear.name,
          }
        : null,
      students: studentRoster,
      summary: {
        total: students.length,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        leave: leaveCount,
        unmarked: unmarkedCount,
        isSubmitted,
      },
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "ATTENDANCE");
  if (!subCheck.allowed) return subCheck.response!;

  const { user, teacher, schoolId } = auth.context;
  const teacherIdStr = teacher._id.toString();

  try {
    const body = await req.json();
    const validatedData = bulkAttendanceSchema.parse(body);

    await connectToDatabase();

    // 1. Validate Teacher Assignment Scope
    const isAuthorized = await verifyTeacherSectionScope({
      schoolId,
      teacherId: teacherIdStr,
      classId: validatedData.classId,
      sectionId: validatedData.sectionId,
    });

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: "Access Denied: You do not have permission to submit attendance for this class and section.",
        },
        { status: 403 }
      );
    }

    // 2. Validate Class & Section belong to school
    const [targetClass, targetSection, academicYear] = await Promise.all([
      Class.findOne({ _id: validatedData.classId, schoolId }).lean(),
      Section.findOne({ _id: validatedData.sectionId, schoolId }).lean(),
      AcademicYear.findOne({ _id: validatedData.academicYearId, schoolId }).lean(),
    ]);

    if (!targetClass || !targetSection || !academicYear) {
      return NextResponse.json(
        { success: false, error: "Invalid academic year, class, or section selected." },
        { status: 400 }
      );
    }

    // 3. Validate all submitted students belong to this section & school
    const submittedStudentIds = validatedData.records.map((r) => r.studentId);
    const validStudents = await Student.find({
      _id: { $in: submittedStudentIds },
      schoolId,
      classId: validatedData.classId,
      sectionId: validatedData.sectionId,
      status: { $in: ["ACTIVE", "INACTIVE"] },
    }).lean();

    const validStudentIdSet = new Set(validStudents.map((s) => s._id.toString()));
    const invalidStudentIds = submittedStudentIds.filter((id) => !validStudentIdSet.has(id));

    if (invalidStudentIds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid submission: ${invalidStudentIds.length} student(s) do not belong to this class and section.`,
        },
        { status: 400 }
      );
    }

    const normalizedDate = normalizeAttendanceDate(validatedData.date);

    // 4. Check for locked records
    const existingRecords = await Attendance.find({
      schoolId,
      academicYearId: validatedData.academicYearId,
      studentId: { $in: submittedStudentIds },
      date: normalizedDate,
    }).lean();

    const lockedRecords = existingRecords.filter((rec) => rec.isLocked);
    if (lockedRecords.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Attendance for one or more students on this date is locked and cannot be modified.",
        },
        { status: 403 }
      );
    }

    // 5. Bulk Upsert (Prevents duplicates for same student + date + session)
    const now = new Date();
    const existingRecordMap = new Map(existingRecords.map((r) => [r.studentId.toString(), r]));

    let createdCount = 0;
    let updatedCount = 0;

    const bulkOps = validatedData.records.map((record) => {
      const isExisting = existingRecordMap.has(record.studentId);
      if (isExisting) {
        updatedCount++;
      } else {
        createdCount++;
      }

      return {
        updateOne: {
          filter: {
            schoolId,
            academicYearId: validatedData.academicYearId,
            studentId: record.studentId,
            date: normalizedDate,
          },
          update: {
            $set: {
              classId: validatedData.classId,
              sectionId: validatedData.sectionId,
              status: record.status,
              remarks: record.remarks || "",
              editedBy: isExisting ? user.id : null,
              editedAt: isExisting ? now : null,
              updatedAt: now,
            },
            $setOnInsert: {
              markedBy: user.id,
              markedByRole: "TEACHER",
              isLocked: false,
              createdAt: now,
            },
          },
          upsert: true,
        },
      };
    });

    await Attendance.bulkWrite(bulkOps);

    // 6. Audit Log
    await createAuditLog({
      userId: user.id,
      userRole: "TEACHER",
      action: createdCount > 0 ? "ATTENDANCE_BULK_CREATED" : "ATTENDANCE_BULK_UPDATED",
      entityType: "ATTENDANCE",
      entityId: `${validatedData.sectionId}_${formatAttendanceDate(normalizedDate)}`,
      schoolId,
      metadata: {
        teacherId: teacherIdStr,
        classId: validatedData.classId,
        sectionId: validatedData.sectionId,
        date: formatAttendanceDate(normalizedDate),
        totalRecords: validatedData.records.length,
        createdCount,
        updatedCount,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Attendance saved successfully for ${validatedData.records.length} students (${createdCount} created, ${updatedCount} updated).`,
      data: {
        date: formatAttendanceDate(normalizedDate),
        total: validatedData.records.length,
        createdCount,
        updatedCount,
      },
    });
  } catch (error: any) {
    console.error("Teacher attendance submit error:", error);
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Validation failed on submitted attendance data.", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit attendance." },
      { status: 500 }
    );
  }
}
