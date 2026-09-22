import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Teacher from "@/models/Teacher";
import TeacherAssignment from "@/models/TeacherAssignment";
import AcademicYear from "@/models/AcademicYear";
import Class from "@/models/Class";
import Section from "@/models/Section";
import Subject from "@/models/Subject";
import ClassSubject from "@/models/ClassSubject";
import AuditLog from "@/models/AuditLog";
import { createTeacherAssignmentSchema } from "@/lib/validation/teacher";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { teacherId } = await params;

  try {
    await connectToDatabase();

    const teacher = await Teacher.findOne({ _id: teacherId, schoolId });
    if (!teacher) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Teacher not found" } },
        { status: 404 }
      );
    }

    const assignments = await TeacherAssignment.find({
      schoolId,
      teacherId: teacher._id,
    })
      .populate("academicYearId", "name status startDate endDate")
      .populate("classId", "name code")
      .populate("sectionId", "name capacity")
      .populate("subjectId", "name code subjectType")
      .sort({ isActive: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        assignments: assignments.map((a) => ({
          id: a._id.toString(),
          academicYear: a.academicYearId,
          class: a.classId,
          section: a.sectionId,
          subject: a.subjectId,
          assignmentType: a.assignmentType,
          isClassTeacher: a.isClassTeacher,
          isActive: a.isActive,
          createdAt: a.createdAt,
        })),
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/admin/teachers/[teacherId]/assignments error:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch assignments" } },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { teacherId } = await params;

  try {
    const body = await req.json();
    const validatedData = createTeacherAssignmentSchema.parse(body);

    await connectToDatabase();

    // 1. Validate Teacher
    const teacher = await Teacher.findOne({ _id: teacherId, schoolId });
    if (!teacher) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Teacher not found or does not belong to this school." } },
        { status: 404 }
      );
    }

    if (teacher.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TEACHER_INACTIVE",
            message: "Cannot assign academic duties to an inactive teacher. Please activate the teacher first.",
          },
        },
        { status: 400 }
      );
    }

    // 2. Validate Academic Year
    const academicYear = await AcademicYear.findOne({
      _id: validatedData.academicYearId,
      schoolId,
    });
    if (!academicYear) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_ACADEMIC_YEAR", message: "Selected Academic Year is invalid or does not belong to this school." },
        },
        { status: 400 }
      );
    }

    // 3. Validate Class
    const classDoc = await Class.findOne({
      _id: validatedData.classId,
      schoolId,
    });
    if (!classDoc) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_CLASS", message: "Selected Class is invalid or does not belong to this school." },
        },
        { status: 400 }
      );
    }

    if (
      classDoc.academicYearId &&
      classDoc.academicYearId.toString() !== academicYear._id.toString()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CLASS_YEAR_MISMATCH",
            message: `Selected Class '${classDoc.name}' does not belong to Academic Year '${academicYear.name}'.`,
          },
        },
        { status: 400 }
      );
    }

    // 4. Validate Section belongs to Class and School
    const sectionDoc = await Section.findOne({
      _id: validatedData.sectionId,
      schoolId,
      classId: classDoc._id,
    });
    if (!sectionDoc) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_SECTION",
            message: `Selected Section is invalid or does not belong to Class '${classDoc.name}'.`,
          },
        },
        { status: 400 }
      );
    }

    // 5. Validate Subject if provided
    let subjectDoc = null;
    if (validatedData.subjectId) {
      subjectDoc = await Subject.findOne({
        _id: validatedData.subjectId,
        schoolId,
      });

      if (!subjectDoc) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "INVALID_SUBJECT", message: "Selected Subject is invalid or not found in this school." },
          },
          { status: 400 }
        );
      }

      // Check if subject is associated with the selected class via ClassSubject
      const classSubject = await ClassSubject.findOne({
        schoolId,
        classId: classDoc._id,
        subjectId: subjectDoc._id,
        isActive: true,
      });

      if (!classSubject) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "SUBJECT_NOT_IN_CLASS",
              message: `${subjectDoc.name} is not assigned to ${classDoc.name} for academic year ${academicYear.name}. Please assign the subject to the class first in Subjects & Curriculum.`,
            },
          },
          { status: 400 }
        );
      }
    }

    // 6. Check duplicate active assignment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const duplicateQuery: Record<string, any> = {
      schoolId,
      teacherId: teacher._id,
      academicYearId: academicYear._id,
      classId: classDoc._id,
      sectionId: sectionDoc._id,
      isActive: true,
    };

    if (validatedData.subjectId) {
      duplicateQuery.subjectId = validatedData.subjectId;
    } else {
      duplicateQuery.subjectId = null;
    }

    const existingAssignment = await TeacherAssignment.findOne(duplicateQuery);
    if (existingAssignment) {
      const subjectLabel = subjectDoc ? subjectDoc.name : "Class Teacher";
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_ASSIGNMENT",
            message: `This teacher is already assigned to ${subjectLabel} for ${classDoc.name} - Section ${sectionDoc.name} in academic year ${academicYear.name}.`,
          },
        },
        { status: 409 }
      );
    }

    // 7. Validate Teacher Class Teacher uniqueness (A teacher can be Class Teacher of ONLY ONE section per academic year)
    if (validatedData.isClassTeacher) {
      const existingTeacherClassTeacher = await TeacherAssignment.findOne({
        schoolId,
        academicYearId: academicYear._id,
        teacherId: teacher._id,
        isClassTeacher: true,
        isActive: true,
      })
        .populate("classId", "name")
        .populate("sectionId", "name")
        .populate("academicYearId", "name");

      if (existingTeacherClassTeacher) {
        const prevClass = (existingTeacherClassTeacher.classId as any)?.name || "another class";
        const prevSection = (existingTeacherClassTeacher.sectionId as any)?.name || "another section";
        const yrName = (existingTeacherClassTeacher.academicYearId as any)?.name || academicYear.name;
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "TEACHER_ALREADY_CLASS_TEACHER",
              message: `This teacher is already the Class Teacher of ${prevClass} - Section ${prevSection} for academic year ${yrName}. A teacher can be assigned as Class Teacher to only one section per academic year.`,
            },
          },
          { status: 409 }
        );
      }

      // Rule A: Check if this section already has another teacher as Class Teacher and reassign/demote them
      const existingClassTeacher = await TeacherAssignment.findOne({
        schoolId,
        academicYearId: academicYear._id,
        classId: classDoc._id,
        sectionId: sectionDoc._id,
        isClassTeacher: true,
        isActive: true,
      }).populate("teacherId", "firstName lastName");

      if (existingClassTeacher) {
        // Demote existing class teacher
        existingClassTeacher.isClassTeacher = false;
        if (existingClassTeacher.assignmentType === "CLASS_TEACHER") {
          existingClassTeacher.isActive = false;
        } else if (existingClassTeacher.assignmentType === "BOTH") {
          existingClassTeacher.assignmentType = "SUBJECT_TEACHER";
        }
        await existingClassTeacher.save();

        await AuditLog.create({
          userId: user.id,
          userRole: user.role,
          action: "CLASS_TEACHER_REASSIGNED",
          entityType: "TEACHER_ASSIGNMENT",
          entityId: existingClassTeacher._id.toString(),
          schoolId,
          metadata: {
            previousTeacherId: existingClassTeacher.teacherId?.toString(),
            newTeacherId: teacher._id.toString(),
            academicYearId: academicYear._id.toString(),
            classId: classDoc._id.toString(),
            sectionId: sectionDoc._id.toString(),
          },
        });
      }
    }

    // Determine assignmentType
    let assignmentType: "SUBJECT_TEACHER" | "CLASS_TEACHER" | "BOTH" = "SUBJECT_TEACHER";
    if (validatedData.isClassTeacher && validatedData.subjectId) {
      assignmentType = "BOTH";
    } else if (validatedData.isClassTeacher && !validatedData.subjectId) {
      assignmentType = "CLASS_TEACHER";
    }

    const newAssignment = new TeacherAssignment({
      schoolId,
      teacherId: teacher._id,
      academicYearId: academicYear._id,
      classId: classDoc._id,
      sectionId: sectionDoc._id,
      subjectId: subjectDoc ? subjectDoc._id : null,
      assignmentType,
      isClassTeacher: validatedData.isClassTeacher ?? false,
      isActive: true,
      createdBy: user.id,
      updatedBy: user.id,
    });

    await newAssignment.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "TEACHER_ASSIGNMENT_CREATED",
      entityType: "TEACHER_ASSIGNMENT",
      entityId: newAssignment._id.toString(),
      schoolId,
      metadata: {
        teacherId: teacher._id.toString(),
        academicYearId: academicYear._id.toString(),
        classId: classDoc._id.toString(),
        sectionId: sectionDoc._id.toString(),
        subjectId: subjectDoc ? subjectDoc._id.toString() : null,
        isClassTeacher: newAssignment.isClassTeacher,
        assignmentType,
      },
    });

    if (newAssignment.isClassTeacher) {
      await AuditLog.create({
        userId: user.id,
        userRole: user.role,
        action: "CLASS_TEACHER_ASSIGNED",
        entityType: "TEACHER_ASSIGNMENT",
        entityId: newAssignment._id.toString(),
        schoolId,
        metadata: {
          teacherId: teacher._id.toString(),
          academicYearId: academicYear._id.toString(),
          classId: classDoc._id.toString(),
          sectionId: sectionDoc._id.toString(),
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Teacher assignment created successfully",
        data: {
          assignment: {
            id: newAssignment._id.toString(),
            teacherId: newAssignment.teacherId,
            academicYear: { id: academicYear._id.toString(), name: academicYear.name },
            class: { id: classDoc._id.toString(), name: classDoc.name },
            section: { id: sectionDoc._id.toString(), name: sectionDoc.name },
            subject: subjectDoc ? { id: subjectDoc._id.toString(), name: subjectDoc.name } : null,
            isClassTeacher: newAssignment.isClassTeacher,
            assignmentType: newAssignment.assignmentType,
            isActive: newAssignment.isActive,
          },
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("POST /api/admin/teachers/[teacherId]/assignments error:", err);
    if (err && typeof err === "object" && "issues" in err) {
      const issues = (err as { issues: { message: string; path: (string | number)[] }[] }).issues;
      const firstMessage = issues?.[0]?.message || "Validation failed";
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: firstMessage,
            details: issues,
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
          message: err instanceof Error ? err.message : "Failed to create assignment",
        },
      },
      { status: 500 }
    );
  }
}
