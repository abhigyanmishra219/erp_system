import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import Attendance from "@/models/Attendance";
import Student from "@/models/Student";
import AcademicYear from "@/models/AcademicYear";
import Class from "@/models/Class";
import Section from "@/models/Section";
import AuditLog from "@/models/AuditLog";
import { markAttendanceSchema, attendanceQuerySchema } from "@/lib/validation/attendance";
import { normalizeAttendanceDate, formatAttendanceDate } from "@/lib/utils/date";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "ATTENDANCE");
  if (!subCheck.allowed) return subCheck.response!;

  const { schoolId } = auth.context;

  try {
    const url = new URL(req.url);
    const params = {
      academicYearId: url.searchParams.get("academicYearId") || undefined,
      classId: url.searchParams.get("classId") || undefined,
      sectionId: url.searchParams.get("sectionId") || undefined,
      studentId: url.searchParams.get("studentId") || undefined,
      date: url.searchParams.get("date") || undefined,
      startDate: url.searchParams.get("startDate") || undefined,
      endDate: url.searchParams.get("endDate") || undefined,
      status: (url.searchParams.get("status") as any) || "ALL",
    };

    const validatedQuery = attendanceQuerySchema.parse(params);

    await connectToDatabase();

    // Tenant-isolated filter query
    const filter: Record<string, any> = { schoolId };

    if (validatedQuery.academicYearId) {
      filter.academicYearId = validatedQuery.academicYearId;
    }

    if (validatedQuery.classId) {
      filter.classId = validatedQuery.classId;
    }

    if (validatedQuery.sectionId) {
      filter.sectionId = validatedQuery.sectionId;
    }

    if (validatedQuery.studentId) {
      filter.studentId = validatedQuery.studentId;
    }

    if (validatedQuery.date) {
      const normalized = normalizeAttendanceDate(validatedQuery.date);
      filter.date = normalized;
    } else if (validatedQuery.startDate || validatedQuery.endDate) {
      filter.date = {};
      if (validatedQuery.startDate) {
        filter.date.$gte = normalizeAttendanceDate(validatedQuery.startDate);
      }
      if (validatedQuery.endDate) {
        filter.date.$lte = normalizeAttendanceDate(validatedQuery.endDate);
      }
    }

    if (validatedQuery.status && validatedQuery.status !== "ALL") {
      filter.status = validatedQuery.status;
    }

    const records = await Attendance.find(filter)
      .populate("studentId", "firstName lastName admissionNumber rollNumber gender avatarUrl")
      .populate("classId", "name code")
      .populate("sectionId", "name code")
      .populate("markedBy", "name email role")
      .populate("editedBy", "name email role")
      .sort({ date: -1, createdAt: -1 })
      .lean();

    const formattedRecords = records.map((rec: any) => ({
      id: rec._id.toString(),
      _id: rec._id.toString(),
      student: rec.studentId
        ? {
            id: rec.studentId._id?.toString(),
            name: `${rec.studentId.firstName} ${rec.studentId.lastName}`,
            admissionNumber: rec.studentId.admissionNumber,
            rollNumber: rec.studentId.rollNumber || "",
            gender: rec.studentId.gender,
            avatarUrl: rec.studentId.avatarUrl || "",
          }
        : null,
      class: rec.classId
        ? { id: rec.classId._id?.toString(), name: rec.classId.name, code: rec.classId.code }
        : null,
      section: rec.sectionId
        ? { id: rec.sectionId._id?.toString(), name: rec.sectionId.name, code: rec.sectionId.code }
        : null,
      date: rec.date ? formatAttendanceDate(new Date(rec.date)) : "",
      status: rec.status,
      remarks: rec.remarks || "",
      isLocked: !!rec.isLocked,
      markedBy: rec.markedBy ? { name: rec.markedBy.name, email: rec.markedBy.email } : null,
      editedBy: rec.editedBy ? { name: rec.editedBy.name, email: rec.editedBy.email } : null,
      editedAt: rec.editedAt,
      createdAt: rec.createdAt,
      updatedAt: rec.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        total: formattedRecords.length,
        attendance: formattedRecords,
      },
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters provided",
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: error.message || "Failed to retrieve attendance records",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "ATTENDANCE");
  if (!subCheck.allowed) return subCheck.response!;

  const { user, schoolId } = auth.context;

  try {
    const body = await req.json();
    const validatedData = markAttendanceSchema.parse(body);

    await connectToDatabase();

    // 1. Verify Academic Year belongs to tenant
    const academicYear = await AcademicYear.findOne({
      _id: validatedData.academicYearId,
      schoolId,
    }).lean();

    if (!academicYear) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_ACADEMIC_YEAR",
            message: "Selected academic year does not belong to this school.",
          },
        },
        { status: 400 }
      );
    }

    // 2. Verify Class belongs to tenant and academic year
    const targetClass = await Class.findOne({
      _id: validatedData.classId,
      schoolId,
      academicYearId: validatedData.academicYearId,
    }).lean();

    if (!targetClass) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CLASS",
            message: "Selected class does not belong to the selected academic year.",
          },
        },
        { status: 400 }
      );
    }

    // 3. Verify Section belongs to tenant, academic year, and class
    const targetSection = await Section.findOne({
      _id: validatedData.sectionId,
      schoolId,
      academicYearId: validatedData.academicYearId,
      classId: validatedData.classId,
    }).lean();

    if (!targetSection) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_SECTION",
            message: "Selected section does not belong to this class.",
          },
        },
        { status: 400 }
      );
    }

    // 4. Verify Student exists, belongs to tenant, academic year, class, and section
    const student = await Student.findOne({
      _id: validatedData.studentId,
      schoolId,
      academicYearId: validatedData.academicYearId,
      classId: validatedData.classId,
      sectionId: validatedData.sectionId,
    }).lean();

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "STUDENT_MISMATCH",
            message: "Selected student does not belong to this class and section.",
          },
        },
        { status: 400 }
      );
    }

    const normalizedDate = normalizeAttendanceDate(validatedData.date);

    // 5. Upsert: If attendance already exists, update it, preserving unique student + date rule
    const existingAttendance = await Attendance.findOne({
      schoolId,
      academicYearId: validatedData.academicYearId,
      studentId: validatedData.studentId,
      date: normalizedDate,
    });

    let attendanceDoc;
    let isNewRecord = false;
    const oldStatus = existingAttendance?.status;

    if (existingAttendance) {
      if (existingAttendance.isLocked) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "ATTENDANCE_LOCKED",
              message: "Attendance for this student on this date is locked and cannot be edited.",
            },
          },
          { status: 403 }
        );
      }

      existingAttendance.status = validatedData.status;
      existingAttendance.remarks = validatedData.remarks || "";
      existingAttendance.classId = validatedData.classId;
      existingAttendance.sectionId = validatedData.sectionId;
      existingAttendance.editedBy = user.id as any;
      existingAttendance.editedAt = new Date();
      await existingAttendance.save();
      attendanceDoc = existingAttendance;
    } else {
      attendanceDoc = await Attendance.create({
        schoolId,
        academicYearId: validatedData.academicYearId,
        classId: validatedData.classId,
        sectionId: validatedData.sectionId,
        studentId: validatedData.studentId,
        date: normalizedDate,
        status: validatedData.status,
        remarks: validatedData.remarks || "",
        markedBy: user.id,
        markedByRole: "ADMIN",
        isLocked: false,
      });
      isNewRecord = true;
    }

    // 6. Record Audit Log
    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: isNewRecord ? "ATTENDANCE_CREATED" : "ATTENDANCE_UPDATED",
      entityType: "ATTENDANCE",
      entityId: attendanceDoc._id.toString(),
      schoolId,
      metadata: {
        studentId: validatedData.studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        date: formatAttendanceDate(normalizedDate),
        classId: validatedData.classId,
        sectionId: validatedData.sectionId,
        status: validatedData.status,
        oldStatus: oldStatus || null,
        isNewRecord,
      },
    });

    return NextResponse.json({
      success: true,
      message: isNewRecord
        ? "Attendance marked successfully"
        : "Attendance record updated successfully",
      data: {
        id: attendanceDoc._id.toString(),
        studentId: validatedData.studentId,
        date: formatAttendanceDate(normalizedDate),
        status: attendanceDoc.status,
        remarks: attendanceDoc.remarks,
        isLocked: attendanceDoc.isLocked,
      },
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid attendance data provided",
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: error.message || "Failed to mark attendance",
        },
      },
      { status: 500 }
    );
  }
}
