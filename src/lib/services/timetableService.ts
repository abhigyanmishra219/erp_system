import mongoose from "mongoose";
import TimetableEntry, { DayOfWeek, DAYS_OF_WEEK } from "@/models/TimetableEntry";
import Student from "@/models/Student";
import StudentParent from "@/models/StudentParent";
import Parent from "@/models/Parent";
import School from "@/models/School";
import { timeToMinutes } from "@/lib/validation/timetable";

export interface GroupedTimetableDay {
  dayOfWeek: DayOfWeek;
  isWorkingDay: boolean;
  entries: any[];
}

export class TimetableService {
  /**
   * Sort timetable entries chronologically by startTime
   */
  static sortEntriesChronologically(entries: any[]): any[] {
    return entries.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }

  /**
   * Group timetable entries by day of week
   */
  static groupEntriesByDay(
    entries: any[],
    workingDays: string[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
  ): Record<DayOfWeek, GroupedTimetableDay> {
    const grouped: Record<string, GroupedTimetableDay> = {};

    for (const day of DAYS_OF_WEEK) {
      const dayEntries = entries.filter((e) => e.dayOfWeek === day);
      grouped[day] = {
        dayOfWeek: day,
        isWorkingDay: workingDays.includes(day),
        entries: this.sortEntriesChronologically(dayEntries),
      };
    }

    return grouped as Record<DayOfWeek, GroupedTimetableDay>;
  }

  /**
   * Retrieve timetable for a specific class section
   */
  static async getClassSectionTimetable(
    schoolId: string,
    academicYearId: string,
    classId: string,
    sectionId: string
  ) {
    const school = await School.findById(schoolId).select("attendanceSettings").lean();
    const workingDays = (school as any)?.attendanceSettings?.workingDays || [
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
    ];

    const entries = await TimetableEntry.find({
      schoolId: new mongoose.Types.ObjectId(schoolId),
      academicYearId: new mongoose.Types.ObjectId(academicYearId),
      classId: new mongoose.Types.ObjectId(classId),
      sectionId: new mongoose.Types.ObjectId(sectionId),
      isActive: true,
    })
      .populate("subjectId", "name code")
      .populate("teacherId", "firstName middleName lastName teacherId email phone name")
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .lean();

    const formattedEntries = entries.map((e: any) => {
      if (e.teacherId && typeof e.teacherId === "object") {
        e.teacherId.name =
          e.teacherId.name ||
          [e.teacherId.firstName, e.teacherId.middleName, e.teacherId.lastName].filter(Boolean).join(" ") ||
          "Teacher";
      }
      return e;
    });

    const grouped = this.groupEntriesByDay(formattedEntries, workingDays);

    return {
      entries: this.sortEntriesChronologically(formattedEntries),
      grouped,
      workingDays,
    };
  }

  /**
   * Retrieve timetable for a specific teacher
   */
  static async getTeacherTimetable(
    schoolId: string,
    academicYearId: string,
    teacherId: string
  ) {
    const school = await School.findById(schoolId).select("attendanceSettings").lean();
    const workingDays = (school as any)?.attendanceSettings?.workingDays || [
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
    ];

    const entries = await TimetableEntry.find({
      schoolId: new mongoose.Types.ObjectId(schoolId),
      academicYearId: new mongoose.Types.ObjectId(academicYearId),
      teacherId: new mongoose.Types.ObjectId(teacherId),
      isActive: true,
    })
      .populate("subjectId", "name code")
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .populate("teacherId", "firstName middleName lastName teacherId email phone name")
      .lean();

    const formattedEntries = entries.map((e: any) => {
      if (e.teacherId && typeof e.teacherId === "object") {
        e.teacherId.name =
          e.teacherId.name ||
          [e.teacherId.firstName, e.teacherId.middleName, e.teacherId.lastName].filter(Boolean).join(" ") ||
          "Teacher";
      }
      return e;
    });

    const grouped = this.groupEntriesByDay(formattedEntries, workingDays);

    return {
      entries: this.sortEntriesChronologically(formattedEntries),
      grouped,
      workingDays,
    };
  }

  /**
   * Retrieve student timetable based on active enrollment
   */
  static async getStudentTimetable(schoolId: string, studentId: string) {
    const student = await Student.findOne({
      _id: studentId,
      schoolId: new mongoose.Types.ObjectId(schoolId),
      isActive: true,
    }).lean();

    if (!student) {
      throw new Error("Student not found in this school");
    }

    const studentFullName = `${student.firstName} ${student.lastName}`.trim();

    if (!student.classId || !student.sectionId || !student.academicYearId) {
      return {
        entries: [],
        grouped: this.groupEntriesByDay([]),
        student: { id: student._id.toString(), name: studentFullName },
      };
    }

    const timetable = await this.getClassSectionTimetable(
      schoolId,
      student.academicYearId.toString(),
      student.classId.toString(),
      student.sectionId.toString()
    );

    return {
      ...timetable,
      student: {
        id: student._id.toString(),
        name: studentFullName,
        admissionNumber: student.admissionNumber,
      },
    };
  }

  /**
   * Retrieve parent child timetable ensuring authorized link
   */
  static async getParentChildTimetable(
    schoolId: string,
    parentUserId: string,
    studentId: string
  ) {
    // Resolve Parent document from User ID
    const parentDoc = await Parent.findOne({
      userId: new mongoose.Types.ObjectId(parentUserId),
      schoolId: new mongoose.Types.ObjectId(schoolId),
    }).lean();

    if (!parentDoc) {
      throw new Error("Parent profile not found");
    }

    // Verify parent-student authorization link
    const link = await StudentParent.findOne({
      schoolId: new mongoose.Types.ObjectId(schoolId),
      parentId: parentDoc._id,
      studentId: new mongoose.Types.ObjectId(studentId),
    }).lean();

    if (!link) {
      throw new Error("You are not authorized to access this student's schedule");
    }

    return this.getStudentTimetable(schoolId, studentId);
  }
}
