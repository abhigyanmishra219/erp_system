import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Student from "@/models/Student";
import AcademicYear from "@/models/AcademicYear";
import Class from "@/models/Class";
import Section from "@/models/Section";
import AuditLog from "@/models/AuditLog";
import { promoteStudentsSchema } from "@/lib/validation/studentParent";

export async function POST(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;

  try {
    const body = await req.json();
    const validatedData = promoteStudentsSchema.parse(body);

    await connectToDatabase();

    // Verify source and target academic years, classes, and sections
    const [
      sourceAy,
      targetAy,
      sourceClass,
      targetClass,
      targetSection,
    ] = await Promise.all([
      AcademicYear.findOne({ _id: validatedData.sourceAcademicYearId, schoolId }),
      AcademicYear.findOne({ _id: validatedData.targetAcademicYearId, schoolId }),
      Class.findOne({ _id: validatedData.sourceClassId, schoolId }),
      Class.findOne({ _id: validatedData.targetClassId, schoolId }),
      Section.findOne({
        _id: validatedData.targetSectionId,
        schoolId,
        classId: validatedData.targetClassId,
      }),
    ]);

    if (!sourceAy || !targetAy) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_ACADEMIC_YEAR", message: "Source or target academic year is invalid." },
        },
        { status: 400 }
      );
    }

    if (!sourceClass || !targetClass) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_CLASS", message: "Source or target class is invalid." },
        },
        { status: 400 }
      );
    }

    if (!targetSection) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_SECTION", message: "Target section is invalid." },
        },
        { status: 400 }
      );
    }

    // Find all selected students belonging to school
    const students = await Student.find({
      _id: { $in: validatedData.studentIds },
      schoolId,
    });

    if (!students || students.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NO_STUDENTS_FOUND", message: "No valid students found to promote." },
        },
        { status: 400 }
      );
    }

    let promotedCount = 0;

    for (const student of students) {
      // Mark previous academic history record end date
      if (student.academicHistory && student.academicHistory.length > 0) {
        const lastRec = student.academicHistory[student.academicHistory.length - 1];
        if (!lastRec.endDate) {
          lastRec.endDate = new Date();
        }
      }

      // Append new academic record
      student.academicHistory.push({
        academicYearId: targetAy._id,
        classId: targetClass._id,
        sectionId: targetSection._id,
        rollNumber: student.rollNumber || "",
        yearName: targetAy.name,
        className: targetClass.name,
        sectionName: targetSection.name,
        status: validatedData.statusAction,
        startDate: new Date(),
      });

      // Update current placement
      student.academicYearId = targetAy._id;
      student.classId = targetClass._id;
      student.sectionId = targetSection._id;
      student.status = validatedData.statusAction;
      student.updatedBy = user.id;

      await student.save();
      promotedCount++;
    }

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "STUDENT_PROMOTED",
      entityType: "STUDENT",
      entityId: targetClass._id.toString(),
      schoolId,
      metadata: {
        studentCount: promotedCount,
        sourceAcademicYear: sourceAy.name,
        targetAcademicYear: targetAy.name,
        sourceClass: sourceClass.name,
        targetClass: targetClass.name,
        targetSection: targetSection.name,
        action: validatedData.statusAction,
        studentIds: students.map((s) => s._id.toString()),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        promotedCount,
        targetClass: targetClass.name,
        targetSection: targetSection.name,
        targetAcademicYear: targetAy.name,
        status: validatedData.statusAction,
      },
    });
  } catch (err: unknown) {
    console.error("POST /api/admin/students/promote error:", err);
    if (err && typeof err === "object" && "issues" in err) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: (err as { issues: unknown[] }).issues,
          },
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to process student promotion" },
      },
      { status: 500 }
    );
  }
}
