import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
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
import { updateTimetableEntrySchema } from "@/lib/validation/timetable";
import { TimetableConflictService } from "@/lib/services/timetableConflictService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { entryId } = await params;

  if (!mongoose.Types.ObjectId.isValid(entryId)) {
    return NextResponse.json(
      { success: false, error: { message: "Invalid timetable entry ID format" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const entry: any = await TimetableEntry.findOne({
      _id: entryId,
      schoolId,
      isActive: true,
    })
      .populate("academicYearId", "name status")
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .populate("subjectId", "name code")
      .populate("teacherId", "firstName middleName lastName teacherId email phone name")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .lean();

    if (!entry) {
      return NextResponse.json(
        { success: false, error: { message: "Timetable entry not found in this school" } },
        { status: 404 }
      );
    }

    if (entry.teacherId && typeof entry.teacherId === "object") {
      entry.teacherId.name =
        entry.teacherId.name ||
        [entry.teacherId.firstName, entry.teacherId.middleName, entry.teacherId.lastName].filter(Boolean).join(" ") ||
        "Teacher";
    }

    return NextResponse.json({
      success: true,
      data: { entry },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to fetch timetable entry" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId, user } = auth.context;
  const userId = user.id;
  const role = user.role;
  const { entryId } = await params;

  if (!mongoose.Types.ObjectId.isValid(entryId)) {
    return NextResponse.json(
      { success: false, error: { message: "Invalid timetable entry ID format" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const existingEntry = await TimetableEntry.findOne({
      _id: entryId,
      schoolId,
      isActive: true,
    });

    if (!existingEntry) {
      return NextResponse.json(
        { success: false, error: { message: "Timetable entry not found" } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parseResult = updateTimetableEntrySchema.safeParse(body);
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
      isActive,
    } = parseResult.data;

    const finalAcademicYearId = academicYearId || existingEntry.academicYearId.toString();
    const finalClassId = classId || existingEntry.classId.toString();
    const finalSectionId = sectionId || existingEntry.sectionId.toString();
    const finalSubjectId = subjectId || existingEntry.subjectId.toString();
    const finalTeacherId = teacherId || existingEntry.teacherId.toString();
    const finalDayOfWeek = dayOfWeek || existingEntry.dayOfWeek;
    const finalStartTime = startTime || existingEntry.startTime;
    const finalEndTime = endTime || existingEntry.endTime;

    // Validate relationships if any changed
    if (academicYearId) {
      const yearExists = await AcademicYear.exists({ _id: finalAcademicYearId, schoolId });
      if (!yearExists) {
        return NextResponse.json(
          { success: false, error: { message: "Selected academic year does not belong to this school" } },
          { status: 400 }
        );
      }
    }

    if (classId || academicYearId) {
      const classDoc = await Class.findOne({
        _id: finalClassId,
        schoolId,
        academicYearId: finalAcademicYearId,
        isActive: true,
      }).lean();
      if (!classDoc) {
        return NextResponse.json(
          { success: false, error: { message: "Selected class does not belong to the selected academic year in this school" } },
          { status: 400 }
        );
      }
    }

    if (sectionId || classId) {
      const sectionDoc = await Section.findOne({
        _id: finalSectionId,
        classId: finalClassId,
        schoolId,
        isActive: true,
      }).lean();
      if (!sectionDoc) {
        return NextResponse.json(
          { success: false, error: { message: "Selected section does not belong to the selected class" } },
          { status: 400 }
        );
      }
    }

    if (subjectId) {
      const subjectDoc = await Subject.findOne({ _id: finalSubjectId, schoolId, isActive: true }).lean();
      if (!subjectDoc) {
        return NextResponse.json(
          { success: false, error: { message: "Selected subject does not belong to this school" } },
          { status: 400 }
        );
      }
    }

    if (teacherId) {
      const teacherDoc = await Teacher.findById(finalTeacherId).lean();
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

      if (teacherDoc.userId) {
        const userAccount = await User.findById(teacherDoc.userId).select("isActive").lean();
        if (userAccount && userAccount.isActive === false) {
          return NextResponse.json(
            { success: false, error: { message: "Selected teacher user account is inactive." } },
            { status: 400 }
          );
        }
      }

      // Check TeacherAssignment
      const sectionHasAssignments = await TeacherAssignment.exists({
        schoolId,
        academicYearId: finalAcademicYearId,
        classId: finalClassId,
        sectionId: finalSectionId,
        isActive: true,
      });

      if (sectionHasAssignments) {
        const isAssigned = await TeacherAssignment.exists({
          schoolId,
          teacherId: finalTeacherId,
          academicYearId: finalAcademicYearId,
          classId: finalClassId,
          sectionId: finalSectionId,
          isActive: true,
          $or: [
            { subjectId: new mongoose.Types.ObjectId(finalSubjectId) },
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
    }

    // Re-check conflicts (excluding current entry)
    const conflictResult = await TimetableConflictService.checkConflict({
      schoolId,
      academicYearId: finalAcademicYearId,
      classId: finalClassId,
      sectionId: finalSectionId,
      subjectId: finalSubjectId,
      teacherId: finalTeacherId,
      dayOfWeek: finalDayOfWeek,
      startTime: finalStartTime,
      endTime: finalEndTime,
      excludeEntryId: entryId,
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

    // Apply updates
    if (academicYearId) existingEntry.academicYearId = finalAcademicYearId as any;
    if (classId) existingEntry.classId = finalClassId as any;
    if (sectionId) existingEntry.sectionId = finalSectionId as any;
    if (subjectId) existingEntry.subjectId = finalSubjectId as any;
    if (teacherId) existingEntry.teacherId = finalTeacherId as any;
    if (dayOfWeek) existingEntry.dayOfWeek = finalDayOfWeek;
    if (startTime) existingEntry.startTime = finalStartTime;
    if (endTime) existingEntry.endTime = finalEndTime;
    if (room !== undefined) existingEntry.room = room;
    if (isActive !== undefined) existingEntry.isActive = isActive;
    existingEntry.updatedBy = userId as any;

    await existingEntry.save();

    await AuditLog.create({
      userId,
      userRole: role,
      action: "TIMETABLE_UPDATED",
      entityType: "TIMETABLE",
      entityId: entryId,
      schoolId,
      metadata: {
        entryId,
        updatedFields: Object.keys(body),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Timetable entry updated successfully",
      data: { entry: existingEntry },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to update timetable entry" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId, user } = auth.context;
  const userId = user.id;
  const role = user.role;
  const { entryId } = await params;

  if (!mongoose.Types.ObjectId.isValid(entryId)) {
    return NextResponse.json(
      { success: false, error: { message: "Invalid timetable entry ID format" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const entry = await TimetableEntry.findOneAndUpdate(
      { _id: entryId, schoolId, isActive: true },
      {
        $set: {
          isActive: false,
          updatedBy: userId,
        },
      },
      { new: true }
    );

    if (!entry) {
      return NextResponse.json(
        { success: false, error: { message: "Timetable entry not found" } },
        { status: 404 }
      );
    }

    await AuditLog.create({
      userId,
      userRole: role,
      action: "TIMETABLE_DELETED",
      entityType: "TIMETABLE",
      entityId: entryId,
      schoolId,
      metadata: { entryId },
    });

    return NextResponse.json({
      success: true,
      message: "Timetable entry deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to delete timetable entry" } },
      { status: 500 }
    );
  }
}
