import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import TeacherAssignment, { ITeacherAssignment } from "@/models/TeacherAssignment";
import Class from "@/models/Class";
import Section from "@/models/Section";
import Subject from "@/models/Subject";
import AcademicYear from "@/models/AcademicYear";

export interface TeacherScopeDetails {
  academicYearId?: string;
  assignedClasses: Array<{
    classId: string;
    className: string;
    sectionId: string;
    sectionName: string;
    subjectId?: string;
    subjectName?: string;
    isClassTeacher: boolean;
    assignmentType: "SUBJECT_TEACHER" | "CLASS_TEACHER" | "BOTH";
  }>;
  classIds: string[];
  sectionIds: string[];
  subjectIds: string[];
  classTeacherSectionIds: string[];
}

/**
 * Retrieves full academic assignment scope for a teacher within a school.
 */
export async function getTeacherScope(params: {
  schoolId: string;
  teacherId: string;
  academicYearId?: string;
}): Promise<TeacherScopeDetails> {
  const { schoolId, teacherId, academicYearId } = params;
  await connectToDatabase();

  const query: Record<string, any> = {
    schoolId,
    teacherId,
    isActive: true,
  };

  if (academicYearId) {
    query.academicYearId = academicYearId;
  }

  const assignments: ITeacherAssignment[] = await TeacherAssignment.find(query)
    .populate("classId", "name code")
    .populate("sectionId", "name")
    .populate("subjectId", "name code")
    .lean();

  const classIds = new Set<string>();
  const sectionIds = new Set<string>();
  const subjectIds = new Set<string>();
  const classTeacherSectionIds = new Set<string>();

  const assignedClasses = assignments.map((a: any) => {
    const cId = a.classId?._id?.toString() || a.classId?.toString();
    const sId = a.sectionId?._id?.toString() || a.sectionId?.toString();
    const subId = a.subjectId?._id?.toString() || a.subjectId?.toString() || undefined;

    if (cId) classIds.add(cId);
    if (sId) sectionIds.add(sId);
    if (subId) subjectIds.add(subId);
    if (a.isClassTeacher || a.assignmentType === "CLASS_TEACHER" || a.assignmentType === "BOTH") {
      if (sId) classTeacherSectionIds.add(sId);
    }

    return {
      classId: cId,
      className: a.classId?.name || "Class",
      sectionId: sId,
      sectionName: a.sectionId?.name || "Section",
      subjectId: subId,
      subjectName: a.subjectId?.name,
      isClassTeacher: !!a.isClassTeacher,
      assignmentType: a.assignmentType,
    };
  });

  return {
    academicYearId,
    assignedClasses,
    classIds: Array.from(classIds),
    sectionIds: Array.from(sectionIds),
    subjectIds: Array.from(subjectIds),
    classTeacherSectionIds: Array.from(classTeacherSectionIds),
  };
}

/**
 * Validates if a teacher has active assignment to a specific class.
 */
export async function verifyTeacherClassScope(params: {
  schoolId: string;
  teacherId: string;
  classId: string;
  academicYearId?: string;
}): Promise<boolean> {
  const { schoolId, teacherId, classId, academicYearId } = params;
  await connectToDatabase();

  const query: Record<string, any> = {
    schoolId,
    teacherId,
    classId,
    isActive: true,
  };

  if (academicYearId) {
    query.academicYearId = academicYearId;
  }

  const count = await TeacherAssignment.countDocuments(query);
  return count > 0;
}

/**
 * Validates if a teacher has active assignment to a specific section.
 */
export async function verifyTeacherSectionScope(params: {
  schoolId: string;
  teacherId: string;
  classId: string;
  sectionId: string;
  academicYearId?: string;
}): Promise<boolean> {
  const { schoolId, teacherId, classId, sectionId, academicYearId } = params;
  await connectToDatabase();

  const query: Record<string, any> = {
    schoolId,
    teacherId,
    classId,
    sectionId,
    isActive: true,
  };

  if (academicYearId) {
    query.academicYearId = academicYearId;
  }

  const count = await TeacherAssignment.countDocuments(query);
  return count > 0;
}

/**
 * Validates if a teacher has authorization to teach a specific subject in a class and section.
 * (Subject teachers teaching the subject OR class teachers with all-subject authority).
 */
export async function verifyTeacherSubjectScope(params: {
  schoolId: string;
  teacherId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  academicYearId?: string;
}): Promise<boolean> {
  const { schoolId, teacherId, classId, sectionId, subjectId, academicYearId } = params;
  await connectToDatabase();

  const query: Record<string, any> = {
    schoolId,
    teacherId,
    classId,
    sectionId,
    isActive: true,
  };

  if (academicYearId) {
    query.academicYearId = academicYearId;
  }

  const assignments = await TeacherAssignment.find(query).lean();
  if (assignments.length === 0) return false;

  return assignments.some((a: any) => {
    // Exact subject match
    if (a.subjectId && a.subjectId.toString() === subjectId.toString()) {
      return true;
    }
    // Class Teacher authority covers all subjects in the section if no specific subject assigned
    if (a.isClassTeacher || a.assignmentType === "CLASS_TEACHER" || a.assignmentType === "BOTH") {
      return !a.subjectId || a.subjectId.toString() === subjectId.toString();
    }
    return false;
  });
}

/**
 * Validates if a teacher is the designated Class Teacher for a section.
 */
export async function isTeacherClassTeacher(params: {
  schoolId: string;
  teacherId: string;
  classId: string;
  sectionId: string;
  academicYearId?: string;
}): Promise<boolean> {
  const { schoolId, teacherId, classId, sectionId, academicYearId } = params;
  await connectToDatabase();

  const query: Record<string, any> = {
    schoolId,
    teacherId,
    classId,
    sectionId,
    isActive: true,
    $or: [{ isClassTeacher: true }, { assignmentType: "CLASS_TEACHER" }, { assignmentType: "BOTH" }],
  };

  if (academicYearId) {
    query.academicYearId = academicYearId;
  }

  const count = await TeacherAssignment.countDocuments(query);
  return count > 0;
}
