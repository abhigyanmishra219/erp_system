import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import Assignment from "@/models/Assignment";
import AssignmentSubmission from "@/models/AssignmentSubmission";
import AcademicYear from "@/models/AcademicYear";
import Class from "@/models/Class";
import Section from "@/models/Section";
import Subject from "@/models/Subject";
import Teacher from "@/models/Teacher";
import TeacherAssignment from "@/models/TeacherAssignment";
import Student from "@/models/Student";
import AuditLog from "@/models/AuditLog";
import { createAssignmentSchema } from "@/lib/validation/assignment";
import { normalizeAttendanceDate } from "@/lib/utils/date";
import { verifyTeacherAssignmentScope, verifyClassSubjectMapping } from "@/lib/auth/teacherAssignmentScope";
import { FileStorageService } from "@/lib/services/fileStorage";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "ASSIGNMENTS");
  if (!subCheck.allowed) return subCheck.response!;

  const { schoolId, user } = auth.context;

  try {
    const url = new URL(req.url);
    const academicYearId = url.searchParams.get("academicYearId") || "";
    const classId = url.searchParams.get("classId") || "";
    const sectionId = url.searchParams.get("sectionId") || "";
    const subjectId = url.searchParams.get("subjectId") || "";
    const teacherId = url.searchParams.get("teacherId") || "";
    const status = url.searchParams.get("status") || "ALL";
    const search = (url.searchParams.get("search") || "").trim();
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get("limit") || "20", 10)));

    await connectToDatabase();

    const filter: Record<string, any> = {
      schoolId,
      isActive: true,
    };

    if (academicYearId && mongoose.Types.ObjectId.isValid(academicYearId)) {
      filter.academicYearId = academicYearId;
    }
    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      filter.classId = classId;
    }
    if (sectionId && mongoose.Types.ObjectId.isValid(sectionId)) {
      filter.sectionId = sectionId;
    }
    if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
      filter.subjectId = subjectId;
    }
    if (teacherId && mongoose.Types.ObjectId.isValid(teacherId)) {
      filter.teacherId = teacherId;
    }
    if (status !== "ALL") {
      filter.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      filter.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    // Teacher Role Scope Restriction
    if ((user.role as string) === "TEACHER") {
      const teacher = await Teacher.findOne({ schoolId, userId: user.id, status: "ACTIVE" }).lean();
      if (teacher) {
        filter.teacherId = teacher._id;
      }
    }

    const skip = (page - 1) * limit;

    const [total, assignments] = await Promise.all([
      Assignment.countDocuments(filter),
      Assignment.find(filter)
        .populate("academicYearId", "name status")
        .populate("classId", "name code")
        .populate("sectionId", "name code capacity")
        .populate("subjectId", "name code")
        .populate("teacherId", "firstName lastName teacherId")
        .sort({ dueDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Aggregate submission stats for each assignment
    const assignmentIds = assignments.map((a) => a._id);
    const submissions = await AssignmentSubmission.find({
      schoolId,
      assignmentId: { $in: assignmentIds },
    }).lean();

    const submissionStatsMap = new Map<string, { total: number; submitted: number; late: number; reviewed: number }>();
    for (const sub of submissions) {
      const aId = sub.assignmentId.toString();
      if (!submissionStatsMap.has(aId)) {
        submissionStatsMap.set(aId, { total: 0, submitted: 0, late: 0, reviewed: 0 });
      }
      const stats = submissionStatsMap.get(aId)!;
      stats.total++;
      if (sub.status === "SUBMITTED") stats.submitted++;
      else if (sub.status === "LATE") stats.late++;
      else if (sub.status === "REVIEWED") stats.reviewed++;
    }

    const formattedAssignments = assignments.map((a: any) => {
      const stats = submissionStatsMap.get(a._id.toString()) || { total: 0, submitted: 0, late: 0, reviewed: 0 };
      return {
        id: a._id.toString(),
        title: a.title,
        description: a.description,
        academicYear: a.academicYearId ? { id: a.academicYearId._id?.toString(), name: a.academicYearId.name } : null,
        class: a.classId ? { id: a.classId._id?.toString(), name: a.classId.name, code: a.classId.code } : null,
        section: a.sectionId ? { id: a.sectionId._id?.toString(), name: a.sectionId.name } : null,
        subject: a.subjectId ? { id: a.subjectId._id?.toString(), name: a.subjectId.name, code: a.subjectId.code } : null,
        teacher: a.teacherId ? { id: a.teacherId._id?.toString(), name: `${a.teacherId.firstName} ${a.teacherId.lastName}` } : null,
        assignedDate: a.assignedDate,
        dueDate: a.dueDate,
        maximumMarks: a.maximumMarks,
        attachmentsCount: a.attachments?.length || 0,
        status: a.status,
        submissionStats: stats,
        createdAt: a.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        assignments: formattedAssignments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch assignments" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "ASSIGNMENTS");
  if (!subCheck.allowed) return subCheck.response!;

  const { schoolId, user } = auth.context;

  try {
    const body = await req.json();
    const validated = createAssignmentSchema.parse(body);

    await connectToDatabase();

    // 1. Verify Academic Year, Class, Section, Subject belong to school
    const [academicYear, classDoc, sectionDoc, subjectDoc] = await Promise.all([
      AcademicYear.findOne({ _id: validated.academicYearId, schoolId }).lean(),
      Class.findOne({ _id: validated.classId, schoolId }).lean(),
      Section.findOne({ _id: validated.sectionId, schoolId, classId: validated.classId }).lean(),
      Subject.findOne({ _id: validated.subjectId, schoolId }).lean(),
    ]);

    if (!academicYear) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ACADEMIC_YEAR", message: "Selected academic year is invalid or does not belong to this school." } },
        { status: 400 }
      );
    }
    if (!classDoc) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_CLASS", message: "Selected class is invalid." } },
        { status: 400 }
      );
    }
    if (!sectionDoc) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_SECTION", message: "Selected section does not belong to the selected class." } },
        { status: 400 }
      );
    }
    if (!subjectDoc) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_SUBJECT", message: "Selected subject is invalid or does not belong to this school." } },
        { status: 400 }
      );
    }

    // 2. Verify Subject is mapped to Class
    const isSubjectMapped = await verifyClassSubjectMapping({
      schoolId,
      academicYearId: validated.academicYearId,
      classId: validated.classId,
      subjectId: validated.subjectId,
    });

    if (!isSubjectMapped) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "SUBJECT_NOT_ASSIGNED_TO_CLASS",
            message: "Selected subject is not assigned to this class.",
          },
        },
        { status: 400 }
      );
    }

    // 3. Resolve Teacher Profile
    let effectiveTeacherId = validated.teacherId;

    if ((user.role as string) === "TEACHER") {
      const teacherProfile = await Teacher.findOne({ schoolId, userId: user.id, status: "ACTIVE" }).lean();
      if (!teacherProfile) {
        return NextResponse.json(
          { success: false, error: { code: "TEACHER_NOT_FOUND", message: "Active teacher profile not found for this user account." } },
          { status: 403 }
        );
      }
      effectiveTeacherId = teacherProfile._id.toString();

      // Enforce Teacher Assignment Scope
      const scopeCheck = await verifyTeacherAssignmentScope({
        schoolId,
        userId: user.id,
        academicYearId: validated.academicYearId,
        classId: validated.classId,
        sectionId: validated.sectionId,
        subjectId: validated.subjectId,
      });

      if (!scopeCheck.hasAccess) {
        return NextResponse.json(
          { success: false, error: { code: "TEACHER_SCOPE_DENIED", message: scopeCheck.reason || "You are not authorized to create assignments for this class, section, and subject." } },
          { status: 403 }
        );
      }
    } else {
      // Admin creating: teacherId must be explicitly provided and authorized
      if (!effectiveTeacherId) {
        return NextResponse.json(
          { success: false, error: { code: "TEACHER_REQUIRED", message: "Please select an assigned teacher for this assignment." } },
          { status: 400 }
        );
      }

      const teacherDoc = await Teacher.findOne({ _id: effectiveTeacherId, schoolId, status: "ACTIVE" }).lean();
      if (!teacherDoc) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_TEACHER", message: "Selected teacher is invalid or does not belong to this school." } },
          { status: 400 }
        );
      }

      // Verify that this teacher actually has an active TeacherAssignment for this academicYear/class/section/subject
      const teacherAssignment = await TeacherAssignment.findOne({
        schoolId,
        teacherId: effectiveTeacherId,
        academicYearId: validated.academicYearId,
        classId: validated.classId,
        sectionId: validated.sectionId,
        isActive: true,
        $or: [
          { subjectId: validated.subjectId },
          { subjectId: null },
          { assignmentType: { $in: ["CLASS_TEACHER", "BOTH"] } },
          { isClassTeacher: true },
        ],
      }).lean();

      if (!teacherAssignment) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "TEACHER_NOT_ASSIGNED_TO_SUBJECT",
              message: `Selected teacher (${teacherDoc.firstName} ${teacherDoc.lastName}) is not assigned to teach this subject in the selected class and section.`,
            },
          },
          { status: 400 }
        );
      }
    }

    // 4. Sanitize Attachments
    const sanitizedAttachments = (validated.attachments || []).map((att) =>
      FileStorageService.sanitizeAttachment(att)
    );

    // 5. Create Assignment Document
    const assignedDate = normalizeAttendanceDate(validated.assignedDate);
    const dueDate = normalizeAttendanceDate(validated.dueDate);

    const newAssignment = new Assignment({
      schoolId,
      academicYearId: validated.academicYearId,
      classId: validated.classId,
      sectionId: validated.sectionId,
      subjectId: validated.subjectId,
      teacherId: effectiveTeacherId,
      title: validated.title,
      description: validated.description,
      assignedDate,
      dueDate,
      maximumMarks: validated.maximumMarks ?? null,
      attachments: sanitizedAttachments,
      status: validated.status || "PUBLISHED",
      isActive: true,
      createdBy: user.id,
      updatedBy: user.id,
    });

    await newAssignment.save();

    // 6. Audit Log
    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "ASSIGNMENT_CREATED",
      entityType: "ASSIGNMENT",
      entityId: newAssignment._id.toString(),
      schoolId,
      metadata: {
        assignmentId: newAssignment._id.toString(),
        title: newAssignment.title,
        classId: validated.classId,
        sectionId: validated.sectionId,
        subjectId: validated.subjectId,
        assignedDate: validated.assignedDate,
        dueDate: validated.dueDate,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Assignment created successfully",
        data: {
          assignment: {
            id: newAssignment._id.toString(),
            title: newAssignment.title,
            description: newAssignment.description,
            status: newAssignment.status,
            dueDate: newAssignment.dueDate,
          },
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.issues) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid assignment data", details: error.issues } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to create assignment" } },
      { status: 500 }
    );
  }
}
