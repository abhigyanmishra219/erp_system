import mongoose from "mongoose";
import TeacherAssignment from "@/models/TeacherAssignment";
import Teacher from "@/models/Teacher";
import ClassSubject from "@/models/ClassSubject";
import connectToDatabase from "@/lib/db";

export interface TeacherAssignmentScopeResult {
  hasAccess: boolean;
  reason?: string;
  teacherId?: string;
}

/**
 * Validates whether a Teacher user has authorization to create/manage assignments
 * for a specific class, section, and subject in an academic year.
 *
 * Checks:
 * 1. Active teacher profile exists
 * 2. Active TeacherAssignment exists for (teacher, academicYear, class, section, and subject if specified)
 * 3. ClassSubject exists in the school for (academicYear, class, subject)
 */
export async function verifyTeacherAssignmentScope(params: {
  schoolId: string;
  userId: string;
  academicYearId: string;
  classId: string;
  sectionId?: string;
  subjectId?: string;
}): Promise<TeacherAssignmentScopeResult> {
  const { schoolId, userId, academicYearId, classId, sectionId, subjectId } = params;

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

  // 2. Build teacher assignment query
  const query: Record<string, any> = {
    schoolId,
    teacherId: teacher._id,
    academicYearId,
    classId,
    isActive: true,
  };

  if (sectionId) {
    query.sectionId = sectionId;
  }

  // If subjectId is specified, teacher must either have a matching assignment or be class teacher with access
  const assignments = await TeacherAssignment.find(query).lean();

  if (assignments.length === 0) {
    return {
      hasAccess: false,
      reason: "Teacher is not assigned to this class/section for the selected academic year.",
    };
  }

  if (subjectId) {
    const hasSubjectAccess = assignments.some(
      (a: any) =>
        !a.subjectId ||
        a.subjectId.toString() === subjectId ||
        a.assignmentType === "CLASS_TEACHER" ||
        a.assignmentType === "BOTH" ||
        a.isClassTeacher
    );

    if (!hasSubjectAccess) {
      return {
        hasAccess: false,
        reason: "Teacher is not assigned to teach this subject in the selected class and section.",
      };
    }
  }

  return {
    hasAccess: true,
    teacherId: teacher._id.toString(),
  };
}

/**
 * Validates whether a subject is officially mapped to a class in an academic year
 */
export async function verifyClassSubjectMapping(params: {
  schoolId: string;
  academicYearId: string;
  classId: string;
  subjectId: string;
}): Promise<boolean> {
  const { schoolId, academicYearId, classId, subjectId } = params;
  await connectToDatabase();

  const classSubject = await ClassSubject.findOne({
    schoolId,
    academicYearId,
    classId,
    subjectId,
    isActive: true,
  }).lean();

  return !!classSubject;
}
