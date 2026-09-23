import mongoose from "mongoose";
import TimetableEntry, { DayOfWeek } from "@/models/TimetableEntry";
import Teacher from "@/models/Teacher";
import Class from "@/models/Class";
import Section from "@/models/Section";
import Subject from "@/models/Subject";
import { timeToMinutes } from "@/lib/validation/timetable";

export interface ConflictItem {
  type: "TEACHER" | "SECTION" | "EXACT_DUPLICATE";
  message: string;
  conflictingEntryId?: string;
  details?: {
    teacherName?: string;
    className?: string;
    sectionName?: string;
    subjectName?: string;
    startTime?: string;
    endTime?: string;
    dayOfWeek?: string;
  };
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflicts: ConflictItem[];
}

export interface ConflictCheckParams {
  schoolId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  subjectId?: string;
  teacherId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  excludeEntryId?: string;
}

export class TimetableConflictService {
  /**
   * Evaluates whether two time intervals overlap.
   * Formula: start1 < end2 && end1 > start2
   */
  static hasTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    const s1 = timeToMinutes(start1);
    const e1 = timeToMinutes(end1);
    const s2 = timeToMinutes(start2);
    const e2 = timeToMinutes(end2);
    return s1 < e2 && e1 > s2;
  }

  /**
   * Check for any scheduling conflicts (Teacher double-booking or Section double-booking)
   */
  static async checkConflict(params: ConflictCheckParams): Promise<ConflictCheckResult> {
    const {
      schoolId,
      academicYearId,
      classId,
      sectionId,
      subjectId,
      teacherId,
      dayOfWeek,
      startTime,
      endTime,
      excludeEntryId,
    } = params;

    const conflicts: ConflictItem[] = [];

    // Query active entries on the same day for this school and academic year
    const baseFilter: any = {
      schoolId: new mongoose.Types.ObjectId(schoolId),
      academicYearId: new mongoose.Types.ObjectId(academicYearId),
      dayOfWeek,
      isActive: true,
    };

    if (excludeEntryId && mongoose.Types.ObjectId.isValid(excludeEntryId)) {
      baseFilter._id = { $ne: new mongoose.Types.ObjectId(excludeEntryId) };
    }

    // 1. Query potential Teacher conflicts (same teacher, same day)
    const teacherEntries = await TimetableEntry.find({
      ...baseFilter,
      teacherId: new mongoose.Types.ObjectId(teacherId),
    })
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .populate("subjectId", "name code")
      .populate("teacherId", "firstName middleName lastName name")
      .lean();

    for (const entry of teacherEntries) {
      if (this.hasTimeOverlap(startTime, endTime, entry.startTime, entry.endTime)) {
        const teacherObj = entry.teacherId as any;
        const teacherName =
          teacherObj?.name ||
          [teacherObj?.firstName, teacherObj?.middleName, teacherObj?.lastName].filter(Boolean).join(" ") ||
          "Teacher";
        const className = (entry.classId as any)?.name || "Class";
        const sectionName = (entry.sectionId as any)?.name || "Section";
        const subjectName = (entry.subjectId as any)?.name || "Subject";

        conflicts.push({
          type: "TEACHER",
          message: `${teacherName} is already assigned to ${className} - ${sectionName} (${subjectName}) from ${entry.startTime} to ${entry.endTime}.`,
          conflictingEntryId: entry._id.toString(),
          details: {
            teacherName,
            className,
            sectionName,
            subjectName,
            startTime: entry.startTime,
            endTime: entry.endTime,
            dayOfWeek: entry.dayOfWeek,
          },
        });
      }
    }

    // 2. Query potential Class/Section conflicts (same section, same day)
    const sectionEntries = await TimetableEntry.find({
      ...baseFilter,
      classId: new mongoose.Types.ObjectId(classId),
      sectionId: new mongoose.Types.ObjectId(sectionId),
    })
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .populate("subjectId", "name code")
      .populate("teacherId", "firstName middleName lastName name")
      .lean();

    for (const entry of sectionEntries) {
      // If this entry was already flagged under teacher conflict, avoid duplicate reporting
      if (conflicts.some((c) => c.conflictingEntryId === entry._id.toString())) {
        continue;
      }

      if (this.hasTimeOverlap(startTime, endTime, entry.startTime, entry.endTime)) {
        const className = (entry.classId as any)?.name || "Class";
        const sectionName = (entry.sectionId as any)?.name || "Section";
        const subjectName = (entry.subjectId as any)?.name || "Subject";
        const teacherObj = entry.teacherId as any;
        const teacherName =
          teacherObj?.name ||
          [teacherObj?.firstName, teacherObj?.middleName, teacherObj?.lastName].filter(Boolean).join(" ") ||
          "Teacher";

        conflicts.push({
          type: "SECTION",
          message: `Class ${className} - ${sectionName} already has a scheduled slot for ${subjectName} (${teacherName}) from ${entry.startTime} to ${entry.endTime}.`,
          conflictingEntryId: entry._id.toString(),
          details: {
            teacherName,
            className,
            sectionName,
            subjectName,
            startTime: entry.startTime,
            endTime: entry.endTime,
            dayOfWeek: entry.dayOfWeek,
          },
        });
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  }
}
