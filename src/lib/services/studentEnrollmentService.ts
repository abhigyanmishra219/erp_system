import mongoose from "mongoose";
import Student, { IStudent } from "@/models/Student";
import StudentEnrollment, { IStudentEnrollment } from "@/models/StudentEnrollment";
import User from "@/models/User";
import Parent from "@/models/Parent";
import StudentParent from "@/models/StudentParent";
import AcademicYear from "@/models/AcademicYear";
import Class from "@/models/Class";
import Section from "@/models/Section";
import AuditLog from "@/models/AuditLog";
import { normalizeEmail } from "@/lib/utils/email";
import { generateTemporaryPassword } from "@/lib/tempPassword";
import bcrypt from "bcryptjs";

/**
 * Ensures legacy student documents have corresponding StudentEnrollment records.
 * Non-destructive and idempotent.
 */
export async function syncLegacyStudentEnrollments(schoolId?: string): Promise<number> {
  const query: Record<string, unknown> = {
    schoolId: { $ne: null, $exists: true },
  };
  if (schoolId) {
    query.schoolId = new mongoose.Types.ObjectId(schoolId);
  }

  const legacyStudents = await Student.find(query).lean();
  let synced = 0;

  for (const s of legacyStudents) {
    if (!s.schoolId) continue;

    const existing = await StudentEnrollment.findOne({
      studentId: s._id,
      schoolId: s.schoolId,
    });

    if (!existing) {
      if (!s.academicYearId || !s.classId || !s.sectionId) continue;

      await StudentEnrollment.create({
        studentId: s._id,
        schoolId: s.schoolId,
        academicYearId: s.academicYearId as mongoose.Types.ObjectId | string,
        classId: s.classId as mongoose.Types.ObjectId | string,
        sectionId: s.sectionId as mongoose.Types.ObjectId | string,
        admissionNumber: s.admissionNumber || `ADM-${s._id.toString().slice(-6)}`,
        studentIdCode: s.studentId || s.admissionNumber || "",
        rollNumber: s.rollNumber || "",
        admissionDate: s.admissionDate || s.createdAt || new Date(),
        status: s.status || "ACTIVE",
        academicHistory: s.academicHistory || [],
        transferDetails: s.transferDetails,
        isDeleted: s.isDeleted || false,
        deletedAt: s.deletedAt || null,
        createdBy: s.createdBy || s._id,
        updatedBy: s.updatedBy || s._id,
        createdAt: s.createdAt || new Date(),
        updatedAt: s.updatedAt || new Date(),
      });
      synced++;
    }
  }

  return synced;
}

export interface StudentDirectoryFilters {
  page?: number;
  limit?: number;
  search?: string;
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  status?: string;
  gender?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Retrieves school-scoped student enrollments with global student profile populated.
 * Strictly guarantees multi-tenant isolation.
 */
export async function getSchoolStudentEnrollments(
  schoolId: string,
  filters: StudentDirectoryFilters = {}
) {
  // Sync legacy records if any exist
  await syncLegacyStudentEnrollments(schoolId);

  const page = Math.max(1, filters.page || 1);
  const limit = Math.max(1, Math.min(100, filters.limit || 10));
  const search = (filters.search || "").trim();
  const status = filters.status || "ALL";
  const gender = filters.gender || "ALL";
  const sortBy = filters.sortBy || "createdAt";
  const sortOrder = filters.sortOrder === "asc" ? 1 : -1;

  // Tenant-scoped filter: only current school and non-deleted enrollments
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrollmentQuery: Record<string, any> = {
    schoolId: new mongoose.Types.ObjectId(schoolId),
    isDeleted: { $ne: true },
  };

  if (status !== "ALL") {
    enrollmentQuery.status = status;
  }

  if (filters.academicYearId) {
    enrollmentQuery.academicYearId = new mongoose.Types.ObjectId(filters.academicYearId);
  }

  if (filters.classId) {
    enrollmentQuery.classId = new mongoose.Types.ObjectId(filters.classId);
  }

  if (filters.sectionId) {
    enrollmentQuery.sectionId = new mongoose.Types.ObjectId(filters.sectionId);
  }

  // If search or gender filter is applied, we may need to match on global Student identity
  if (search || gender !== "ALL") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const studentMatch: Record<string, any> = {};

    if (gender !== "ALL") {
      studentMatch.gender = gender;
    }

    if (search) {
      const searchRegex = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      studentMatch.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    // Also allow searching by admissionNumber or rollNumber on enrollment directly
    if (search) {
      const searchRegex = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );

      const matchingStudents = await Student.find(studentMatch).select("_id").lean();
      const matchingStudentIds = matchingStudents.map((s) => s._id);

      enrollmentQuery.$or = [
        { studentId: { $in: matchingStudentIds } },
        { admissionNumber: searchRegex },
        { rollNumber: searchRegex },
        { studentIdCode: searchRegex },
      ];
    } else {
      const matchingStudents = await Student.find(studentMatch).select("_id").lean();
      const matchingStudentIds = matchingStudents.map((s) => s._id);
      enrollmentQuery.studentId = { $in: matchingStudentIds };
    }
  }

  const skip = (page - 1) * limit;

  const [total, enrollments] = await Promise.all([
    StudentEnrollment.countDocuments(enrollmentQuery),
    StudentEnrollment.find(enrollmentQuery)
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "email isActive" },
      })
      .populate("academicYearId", "name status")
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  const students = enrollments
    .filter((e) => e.studentId != null)
    .map((e) => {
      const s = e.studentId as unknown as IStudent & { userId?: { _id: string; email: string; isActive: boolean } };
      return {
        id: s._id.toString(), // Global student ID for backwards compatibility
        enrollmentId: e._id.toString(),
        admissionNumber: e.admissionNumber,
        studentId: e.studentIdCode || e.admissionNumber,
        rollNumber: e.rollNumber || "",
        firstName: s.firstName,
        lastName: s.lastName || "",
        fullName: `${s.firstName} ${s.lastName || ""}`.trim(),
        email: s.email || "",
        phone: s.phone || "",
        dateOfBirth: s.dateOfBirth,
        gender: s.gender,
        bloodGroup: s.bloodGroup || "",
        avatarUrl: s.avatarUrl || "",
        academicYear: e.academicYearId,
        class: e.classId,
        section: e.sectionId,
        status: e.status,
        hasLoginAccount: !!(s.userId || s.userId?._id),
        user: s.userId,
        admissionDate: e.admissionDate,
        createdAt: e.createdAt,
      };
    });

  return {
    students,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Soft-deletes a student's enrollment from the current school.
 * Preserves the global Student record and enrollments in other schools.
 */
export async function deleteStudentEnrollment(
  schoolId: string,
  identifier: string,
  adminUser: { id: string; role: string }
) {
  // Sync legacy records if any exist
  await syncLegacyStudentEnrollments(schoolId);

  // Find enrollment by studentId or enrollmentId within the school
  const isObjectId = mongoose.Types.ObjectId.isValid(identifier);
  if (!isObjectId) {
    return { success: false, code: "NOT_FOUND", message: "Invalid student identifier." };
  }

  const enrollment = await StudentEnrollment.findOne({
    $or: [
      { studentId: new mongoose.Types.ObjectId(identifier) },
      { _id: new mongoose.Types.ObjectId(identifier) },
    ],
    schoolId: new mongoose.Types.ObjectId(schoolId),
    isDeleted: false,
  });

  if (!enrollment) {
    return {
      success: false,
      code: "NOT_FOUND",
      message: "Student enrollment not found in your school.",
    };
  }

  // Soft-delete ONLY this school enrollment
  enrollment.isDeleted = true;
  enrollment.deletedAt = new Date();
  enrollment.status = "INACTIVE";
  enrollment.updatedBy = adminUser.id;
  await enrollment.save();

  // Count remaining active enrollments for this global student across all schools
  const remainingActiveEnrollments = await StudentEnrollment.countDocuments({
    studentId: enrollment.studentId,
    isDeleted: false,
  });

  // Audit Log
  await AuditLog.create({
    userId: adminUser.id,
    userRole: adminUser.role as any,
    action: "STUDENT_DELETED",
    entityType: "STUDENT",
    entityId: enrollment.studentId.toString(),
    schoolId,
    metadata: {
      enrollmentId: enrollment._id.toString(),
      studentId: enrollment.studentId.toString(),
      admissionNumber: enrollment.admissionNumber,
      remainingActiveEnrollments,
    },
  });

  return {
    success: true,
    message: "Student enrollment removed successfully from this school.",
    remainingActiveEnrollments,
  };
}
