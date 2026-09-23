import mongoose from "mongoose";
import Student from "@/models/Student";
import Teacher from "@/models/Teacher";
import Parent from "@/models/Parent";
import StudentParent from "@/models/StudentParent";
import Notice, { INotice } from "@/models/Notice";
import { UserRole } from "@/lib/constants/roles";

export interface ResolvedRecipient {
  userId: string;
  role: UserRole;
}

export class NoticeAudienceService {
  /**
   * Resolves the list of eligible User IDs within the school who should receive notifications for this notice.
   * Multi-child parents and users with multiple roles are automatically deduplicated.
   */
  public static async resolveNoticeRecipients(
    notice: INotice | (any & { schoolId: string | mongoose.Types.ObjectId })
  ): Promise<string[]> {
    const schoolId = notice.schoolId;
    const targetType = notice.targetType;
    const recipientUserIds = new Set<string>();

    if (targetType === "SCHOOL") {
      // 1. All active teachers
      const teachers = await Teacher.find({
        schoolId,
        status: "ACTIVE",
        userId: { $ne: null },
      })
        .select("userId")
        .lean();

      for (const t of teachers) {
        if (t.userId) recipientUserIds.add(t.userId.toString());
      }

      // 2. All active students
      const students = await Student.find({
        schoolId,
        status: "ACTIVE",
        userId: { $ne: null },
      })
        .select("userId")
        .lean();

      for (const s of students) {
        if (s.userId) recipientUserIds.add(s.userId.toString());
      }

      // 3. All active parents
      const parents = await Parent.find({
        schoolId,
        status: "ACTIVE",
        userId: { $ne: null },
      })
        .select("userId")
        .lean();

      for (const p of parents) {
        if (p.userId) recipientUserIds.add(p.userId.toString());
      }
    } else if (targetType === "TEACHERS") {
      const teachers = await Teacher.find({
        schoolId,
        status: "ACTIVE",
        userId: { $ne: null },
      })
        .select("userId")
        .lean();

      for (const t of teachers) {
        if (t.userId) recipientUserIds.add(t.userId.toString());
      }
    } else if (targetType === "STUDENTS") {
      const students = await Student.find({
        schoolId,
        status: "ACTIVE",
        userId: { $ne: null },
      })
        .select("userId")
        .lean();

      for (const s of students) {
        if (s.userId) recipientUserIds.add(s.userId.toString());
      }
    } else if (targetType === "PARENTS") {
      const parents = await Parent.find({
        schoolId,
        status: "ACTIVE",
        userId: { $ne: null },
      })
        .select("userId")
        .lean();

      for (const p of parents) {
        if (p.userId) recipientUserIds.add(p.userId.toString());
      }
    } else if (targetType === "CLASS") {
      if (!notice.targetClassId) return [];

      // Students in this class
      const students = await Student.find({
        schoolId,
        classId: notice.targetClassId,
        status: "ACTIVE",
      })
        .select("_id userId")
        .lean();

      const studentIds: mongoose.Types.ObjectId[] = [];
      for (const s of students) {
        if (s.userId) recipientUserIds.add(s.userId.toString());
        studentIds.push(s._id as mongoose.Types.ObjectId);
      }

      // Linked parents of these students
      if (studentIds.length > 0) {
        const studentParentLinks = await StudentParent.find({
          schoolId,
          studentId: { $in: studentIds },
        })
          .populate<{ parentId: { _id: string; userId?: string; status: string } }>(
            "parentId",
            "userId status"
          )
          .lean();

        for (const link of studentParentLinks) {
          const parentObj = link.parentId;
          if (parentObj && parentObj.status !== "INACTIVE" && parentObj.userId) {
            recipientUserIds.add(parentObj.userId.toString());
          }
        }
      }
    } else if (targetType === "SECTION") {
      if (!notice.targetSectionId) return [];

      // Students in this section
      const students = await Student.find({
        schoolId,
        sectionId: notice.targetSectionId,
        status: "ACTIVE",
      })
        .select("_id userId")
        .lean();

      const studentIds: mongoose.Types.ObjectId[] = [];
      for (const s of students) {
        if (s.userId) recipientUserIds.add(s.userId.toString());
        studentIds.push(s._id as mongoose.Types.ObjectId);
      }

      // Linked parents of these students
      if (studentIds.length > 0) {
        const studentParentLinks = await StudentParent.find({
          schoolId,
          studentId: { $in: studentIds },
        })
          .populate<{ parentId: { _id: string; userId?: string; status: string } }>(
            "parentId",
            "userId status"
          )
          .lean();

        for (const link of studentParentLinks) {
          const parentObj = link.parentId;
          if (parentObj && parentObj.status !== "INACTIVE" && parentObj.userId) {
            recipientUserIds.add(parentObj.userId.toString());
          }
        }
      }
    }

    return Array.from(recipientUserIds);
  }

  /**
   * Evaluates if a given user can view a notice.
   */
  public static async canUserViewNotice(
    user: { id: string; role: UserRole; schoolId: string },
    notice: INotice
  ): Promise<boolean> {
    // 1. Strict tenant isolation
    if (notice.schoolId.toString() !== user.schoolId.toString()) {
      return false;
    }

    // 2. Admin & System Admin can view all notices within their school
    if (user.role === "ADMIN" || user.role === "SYSTEM_ADMIN") {
      return true;
    }

    // 3. Draft/Archived notices are hidden from regular portal users
    if (notice.status !== "PUBLISHED") {
      return false;
    }

    // 4. Check expiration
    if (notice.expiresAt && new Date(notice.expiresAt) < new Date()) {
      return false;
    }

    // 5. Check Audience eligibility
    if (notice.targetType === "SCHOOL") {
      return true;
    }

    if (notice.targetType === "TEACHERS") {
      return user.role === "TEACHER";
    }

    if (notice.targetType === "STUDENTS") {
      return user.role === "STUDENT";
    }

    if (notice.targetType === "PARENTS") {
      return user.role === "PARENT";
    }

    if (notice.targetType === "CLASS") {
      if (user.role === "STUDENT") {
        const student = await Student.findOne({
          schoolId: user.schoolId,
          userId: user.id,
          status: "ACTIVE",
        }).lean();
        return student?.classId?.toString() === notice.targetClassId?.toString();
      }

      if (user.role === "PARENT") {
        const parent = await Parent.findOne({
          schoolId: user.schoolId,
          userId: user.id,
        }).lean();
        if (!parent) return false;

        const childrenLinks = await StudentParent.find({
          schoolId: user.schoolId,
          parentId: parent._id,
        }).lean();
        const studentIds = childrenLinks.map((l) => l.studentId);

        const matchingStudent = await Student.findOne({
          _id: { $in: studentIds },
          classId: notice.targetClassId,
          status: "ACTIVE",
        }).lean();

        return !!matchingStudent;
      }
    }

    if (notice.targetType === "SECTION") {
      if (user.role === "STUDENT") {
        const student = await Student.findOne({
          schoolId: user.schoolId,
          userId: user.id,
          status: "ACTIVE",
        }).lean();
        return student?.sectionId?.toString() === notice.targetSectionId?.toString();
      }

      if (user.role === "PARENT") {
        const parent = await Parent.findOne({
          schoolId: user.schoolId,
          userId: user.id,
        }).lean();
        if (!parent) return false;

        const childrenLinks = await StudentParent.find({
          schoolId: user.schoolId,
          parentId: parent._id,
        }).lean();
        const studentIds = childrenLinks.map((l) => l.studentId);

        const matchingStudent = await Student.findOne({
          _id: { $in: studentIds },
          sectionId: notice.targetSectionId,
          status: "ACTIVE",
        }).lean();

        return !!matchingStudent;
      }
    }

    return false;
  }
}
