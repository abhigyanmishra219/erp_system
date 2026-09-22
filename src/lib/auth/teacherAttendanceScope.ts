import mongoose from "mongoose";
import TeacherAssignment from "@/models/TeacherAssignment";
import Teacher from "@/models/Teacher";
import connectToDatabase from "@/lib/db";

export interface TeacherAttendanceScopeResult {
  hasAccess: boolean;
  reason?: string;
  isClassTeacher?: boolean;
}

/**
 * Validates whether a Teacher user has authorization to access/mark attendance
 * for a specific class and section in an academic year within their tenant school.
 *
 * Uses TeacherAssignment as the single source of truth.
 */
export async function verifyTeacherAttendanceScope(params: {
  schoolId: string;
  userId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
}): Promise<TeacherAttendanceScopeResult> {
  const { schoolId, userId, academicYearId, classId, sectionId } = params;

  await connectToDatabase();

  // 1. Locate the Teacher profile associated with this userId
  const teacher = await Teacher.findOne({
    schoolId,
    userId,
    status: "ACTIVE",
  }).lean();

  if (!teacher) {
    return {
      hasAccess: false,
      reason: "Active teacher profile not found for this user account.",
    };
  }

  // 2. Query active TeacherAssignment for this teacher, academic year, class, and section
  const assignment = await TeacherAssignment.findOne({
    schoolId,
    teacherId: teacher._id,
    academicYearId,
    classId,
    sectionId,
    isActive: true,
  }).lean();

  if (!assignment) {
    return {
      hasAccess: false,
      reason: "Teacher is not assigned to this class and section for the selected academic year.",
    };
  }

  return {
    hasAccess: true,
    isClassTeacher: !!assignment.isClassTeacher || assignment.assignmentType === "CLASS_TEACHER" || assignment.assignmentType === "BOTH",
  };
}

/**
 * Retrieves all assigned classes and sections for a teacher in a given academic year.
 */
export async function getTeacherAssignedSections(params: {
  schoolId: string;
  userId: string;
  academicYearId: string;
}) {
  const { schoolId, userId, academicYearId } = params;

  await connectToDatabase();

  const teacher = await Teacher.findOne({
    schoolId,
    userId,
    status: "ACTIVE",
  }).lean();

  if (!teacher) {
    return [];
  }

  const assignments = await TeacherAssignment.find({
    schoolId,
    teacherId: teacher._id,
    academicYearId,
    isActive: true,
  })
    .populate("classId", "name code")
    .populate("sectionId", "name code capacity")
    .lean();

  return assignments;
}
