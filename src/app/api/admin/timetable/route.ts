import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { requireModule } from "@/lib/subscription-guard";
import TimetableEntry from "@/models/TimetableEntry";
import AcademicYear from "@/models/AcademicYear";
import Class from "@/models/Class";
import Section from "@/models/Section";
import Subject from "@/models/Subject";
import ClassSubject from "@/models/ClassSubject";
import Teacher from "@/models/Teacher";
import TeacherAssignment from "@/models/TeacherAssignment";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
import { createTimetableEntrySchema } from "@/lib/validation/timetable";
import { TimetableConflictService } from "@/lib/services/timetableConflictService";
import { TimetableService } from "@/lib/services/timetableService";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "TIMETABLE");
  if (!subCheck.allowed) return subCheck.response;

  const { schoolId } = auth.context;

  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId");
    const classId = searchParams.get("classId");
    const sectionId = searchParams.get("sectionId");
    const teacherId = searchParams.get("teacherId");
    const dayOfWeek = searchParams.get("dayOfWeek");

    const query: any = {
      schoolId: new mongoose.Types.ObjectId(schoolId),
      isActive: true,
    };

    if (academicYearId && mongoose.Types.ObjectId.isValid(academicYearId)) {
      query.academicYearId = new mongoose.Types.ObjectId(academicYearId);
    }
    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      query.classId = new mongoose.Types.ObjectId(classId);
    }
    if (sectionId && mongoose.Types.ObjectId.isValid(sectionId)) {
      query.sectionId = new mongoose.Types.ObjectId(sectionId);
    }
    if (teacherId && mongoose.Types.ObjectId.isValid(teacherId)) {
      query.teacherId = new mongoose.Types.ObjectId(teacherId);
    }
    if (dayOfWeek && dayOfWeek !== "ALL") {
      query.dayOfWeek = dayOfWeek;
    }

    const rawEntries = await TimetableEntry.find(query)
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .populate("subjectId", "name code")
      .populate("teacherId", "firstName middleName lastName teacherId email phone name")
      .populate("academicYearId", "name status")
      .lean();

    const formattedEntries = rawEntries.map((e: any) => {
      if (e.teacherId && typeof e.teacherId === "object") {
        e.teacherId.name =
          e.teacherId.name ||
          [e.teacherId.firstName, e.teacherId.middleName, e.teacherId.lastName].filter(Boolean).join(" ") ||
          "Teacher";
      }
      return e;
    });

    const sortedEntries = TimetableService.sortEntriesChronologically(formattedEntries);

    // If class & section or teacher are provided, also return structured group format
    const grouped = TimetableService.groupEntriesByDay(sortedEntries);

    return NextResponse.json({
      success: true,
      data: {
        entries: sortedEntries,
        grouped,
        total: sortedEntries.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to fetch timetable entries" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "TIMETABLE");
  if (!subCheck.allowed) return subCheck.response;

  const { schoolId, user } = auth.context;
  const userId = user.id;
  const role = user.role;

  try {
    await connectToDatabase();

    const body = await req.json();
    const parseResult = createTimetableEntrySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: parseResult.error.issues[0]?.message || "Validation error",
            issues: parseResult.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const {
      academicYearId,
      classId,
      sectionId,
      subjectId,
      teacherId,
      dayOfWeek,
      startTime,
      endTime,
      room,
    } = parseResult.data;

    // 1. Validate Academic Year belongs to this school
    const academicYear = await AcademicYear.findOne({
      _id: academicYearId,
      schoolId,
    }).lean();

    if (!academicYear) {
      return NextResponse.json(
        { success: false, error: { message: "Selected academic year does not belong to this school" } },
        { status: 400 }
      );
    }

    // 2. Validate Class belongs to school & academic year
    const classDoc = await Class.findOne({
      _id: classId,
      schoolId,
      academicYearId,
      isActive: true,
    }).lean();

    if (!classDoc) {
      return NextResponse.json(
        { success: false, error: { message: "Selected class does not belong to the selected academic year in this school" } },
        { status: 400 }
      );
    }

    // 3. Validate Section belongs to class & academic year
    const sectionDoc = await Section.findOne({
      _id: sectionId,
      classId,
      schoolId,
      academicYearId,
      isActive: true,
    }).lean();

    if (!sectionDoc) {
      return NextResponse.json(
        { success: false, error: { message: "Selected section does not belong to the selected class" } },
        { status: 400 }
      );
    }

    // 4. Validate Subject belongs to school
    const subjectDoc = await Subject.findOne({
      _id: subjectId,
      schoolId,
      isActive: true,
    }).lean();

    if (!subjectDoc) {
      return NextResponse.json(
        { success: false, error: { message: "Selected subject does not belong to this school" } },
        { status: 400 }
      );
    }

    // Validate ClassSubject assignment (if class curriculum is defined)
    const classSubject = await ClassSubject.findOne({
      schoolId,
      classId,
      subjectId,
      isActive: true,
    }).lean();

    if (!classSubject) {
      // Check if any ClassSubject exists for this class; if curriculum has been mapped, enforce it
      const classHasSubjects = await ClassSubject.exists({ schoolId, classId, isActive: true });
      if (classHasSubjects) {
        return NextResponse.json(
          { success: false, error: { message: `Subject "${subjectDoc.name}" is not assigned to Class "${classDoc.name}" curriculum` } },
          { status: 400 }
        );
      }
    }

    // 5. Validate Teacher belongs to school, is active, and is assigned to class/subject
    const teacherDoc = await Teacher.findById(teacherId).lean();

    if (!teacherDoc) {
      return NextResponse.json(
        { success: false, error: { message: "Selected teacher was not found." } },
        { status: 404 }
      );
    }

    if (teacherDoc.schoolId.toString() !== schoolId.toString()) {
      return NextResponse.json(
        { success: false, error: { message: "Selected teacher does not belong to this school." } },
        { status: 403 }
      );
    }

    if (teacherDoc.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: { message: "Selected teacher is inactive." } },
        { status: 400 }
      );
    }

    // Check linked user account if present
    if (teacherDoc.userId) {
      const userAccount = await User.findById(teacherDoc.userId).select("isActive").lean();
      if (userAccount && userAccount.isActive === false) {
        return NextResponse.json(
          { success: false, error: { message: "Selected teacher user account is inactive." } },
          { status: 400 }
        );
      }
    }

    // Validate Teacher Assignment (A3 Academic Teacher Assignment)
    const sectionHasAssignments = await TeacherAssignment.exists({
      schoolId,
      academicYearId,
      classId,
      sectionId,
      isActive: true,
    });

    if (sectionHasAssignments) {
      const isAssigned = await TeacherAssignment.exists({
        schoolId,
        teacherId,
        academicYearId,
        classId,
        sectionId,
        isActive: true,
        $or: [
          { subjectId: new mongoose.Types.ObjectId(subjectId) },
          { subjectId: null },
          { subjectId: { $exists: false } },
          { assignmentType: { $in: ["CLASS_TEACHER", "BOTH"] } },
          { isClassTeacher: true },
        ],
      });

      if (!isAssigned) {
        return NextResponse.json(
          { success: false, error: { message: "Selected teacher is not assigned to this class, section, or subject." } },
          { status: 400 }
        );
      }
    }

    // 6. Perform Conflict Check
    const conflictResult = await TimetableConflictService.checkConflict({
      schoolId,
      academicYearId,
      classId,
      sectionId,
      subjectId,
      teacherId,
      dayOfWeek,
      startTime,
      endTime,
    });

    if (conflictResult.hasConflict) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: conflictResult.conflicts[0].message,
            conflicts: conflictResult.conflicts,
          },
        },
        { status: 409 }
      );
    }

    // 7. Create Timetable Entry
    const entry = await TimetableEntry.create({
      schoolId,
      academicYearId,
      classId,
      sectionId,
      subjectId,
      teacherId,
      dayOfWeek,
      startTime,
      endTime,
      room: room || "",
      createdBy: userId,
      updatedBy: userId,
    });

    await AuditLog.create({
      userId,
      userRole: role,
      action: "TIMETABLE_CREATED",
      entityType: "TIMETABLE",
      entityId: entry._id.toString(),
      schoolId,
      metadata: {
        entryId: entry._id.toString(),
        academicYearId,
        classId,
        sectionId,
        subjectId,
        teacherId,
        dayOfWeek,
        startTime,
        endTime,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Timetable entry created successfully",
        data: { entry },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to create timetable entry" } },
      { status: 500 }
    );
  }
}
