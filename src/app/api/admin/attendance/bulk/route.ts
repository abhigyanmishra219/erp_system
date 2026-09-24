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
import { bulkAttendanceSchema } from "@/lib/validation/attendance";
import { normalizeAttendanceDate, formatAttendanceDate } from "@/lib/utils/date";

export async function PATCH(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "ATTENDANCE");
  if (!subCheck.allowed) return subCheck.response!;

  const { user, schoolId } = auth.context;

  try {
    const body = await req.json();
    const validatedData = bulkAttendanceSchema.parse(body);

    await connectToDatabase();

    // 1. Validate Academic Year belongs to tenant
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

    // 2. Validate Class belongs to tenant and academic year
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

    // 3. Validate Section belongs to tenant, academic year, and class
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

    // 4. Validate all submitted students belong to this section & school
    const submittedStudentIds = validatedData.records.map((r) => r.studentId);
    const validStudents = await Student.find({
      _id: { $in: submittedStudentIds },
      schoolId,
      academicYearId: validatedData.academicYearId,
      classId: validatedData.classId,
      sectionId: validatedData.sectionId,
      status: { $in: ["ACTIVE", "INACTIVE"] }, // Transferred/Graduated excluded
    }).lean();

    const validStudentIdSet = new Set(validStudents.map((s) => s._id.toString()));
    const invalidStudentIds = submittedStudentIds.filter((id) => !validStudentIdSet.has(id));

    if (invalidStudentIds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_STUDENTS_SUBMITTED",
            message: `${invalidStudentIds.length} student(s) do not belong to this class and section.`,
            details: invalidStudentIds,
          },
        },
        { status: 400 }
      );
    }

    const normalizedDate = normalizeAttendanceDate(validatedData.date);

    // 5. Check if any existing attendance records for this date are locked
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
          error: {
            code: "ATTENDANCE_LOCKED",
            message: "Attendance for one or more students on this date is locked and cannot be updated.",
          },
        },
        { status: 403 }
      );
    }

    // 6. Build atomic bulk write operations (upsert to ensure 1 record per student + date)
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
              markedByRole: "ADMIN",
              isLocked: false,
              createdAt: now,
            },
          },
          upsert: true,
        },
      };
    });

    await Attendance.bulkWrite(bulkOps);

    // 7. Audit Logging (single consolidated bulk audit entry to prevent log pollution)
    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: createdCount > 0 ? "ATTENDANCE_BULK_CREATED" : "ATTENDANCE_BULK_UPDATED",
      entityType: "ATTENDANCE_BULK",
      entityId: `${validatedData.sectionId}_${formatAttendanceDate(normalizedDate)}`,
      schoolId,
      metadata: {
        academicYearId: validatedData.academicYearId,
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
      message: `Successfully saved attendance for ${validatedData.records.length} students (${createdCount} created, ${updatedCount} updated).`,
      data: {
        date: formatAttendanceDate(normalizedDate),
        total: validatedData.records.length,
        createdCount,
        updatedCount,
      },
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed on submitted attendance data",
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
          message: error.message || "Failed to save bulk attendance",
        },
      },
      { status: 500 }
    );
  }
}

// Allow POST as well for convenience
export async function POST(req: NextRequest) {
  return PATCH(req);
}
