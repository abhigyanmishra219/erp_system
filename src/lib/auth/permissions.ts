import { UserRole } from "@/lib/constants/roles";

export const PERMISSIONS = {
  // Student Management
  STUDENT_VIEW: "student.view",
  STUDENT_CREATE: "student.create",
  STUDENT_EDIT: "student.edit",
  STUDENT_DELETE: "student.delete",

  // Teacher / Staff Management
  TEACHER_VIEW: "teacher.view",
  TEACHER_CREATE: "teacher.create",
  TEACHER_EDIT: "teacher.edit",
  TEACHER_DELETE: "teacher.delete",

  // Parent Management
  PARENT_VIEW: "parent.view",
  PARENT_CREATE: "parent.create",
  PARENT_EDIT: "parent.edit",
  PARENT_DELETE: "parent.delete",

  // Academic Setup (Years, Classes, Sections, Subjects)
  ACADEMICS_VIEW: "academics.view",
  ACADEMICS_MANAGE: "academics.manage",

  // Attendance
  ATTENDANCE_VIEW: "attendance.view",
  ATTENDANCE_MARK: "attendance.mark",
  ATTENDANCE_EDIT: "attendance.edit",

  // Assignments & Study Material
  ASSIGNMENT_VIEW: "assignment.view",
  ASSIGNMENT_CREATE: "assignment.create",
  ASSIGNMENT_GRADE: "assignment.grade",

  // Exams & Marks
  EXAM_VIEW: "exam.view",
  EXAM_CREATE: "exam.create",
  MARKS_ENTER: "marks.enter",
  MARKS_EDIT: "marks.edit",
  MARKS_PUBLISH: "marks.publish",

  // Fees & Payments
  FEES_VIEW: "fees.view",
  FEES_CREATE: "fees.create",
  PAYMENT_RECORD: "payment.record",

  // Timetable
  TIMETABLE_VIEW: "timetable.view",
  TIMETABLE_MANAGE: "timetable.manage",

  // Leave Management
  LEAVE_VIEW: "leave.view",
  LEAVE_APPLY: "leave.apply",
  LEAVE_APPROVE: "leave.approve",

  // Notices & Circulars
  NOTICE_VIEW: "notice.view",
  NOTICE_CREATE: "notice.create",
  NOTICE_EDIT: "notice.edit",
  NOTICE_DELETE: "notice.delete",

  // Reports & Analytics
  REPORTS_VIEW: "reports.view",

  // School Settings & Administration
  SETTINGS_VIEW: "settings.view",
  SETTINGS_MANAGE: "settings.manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Default permission matrix mapped per user role
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SYSTEM_ADMIN: Object.values(PERMISSIONS), // System Admin has platform authority
  ADMIN: Object.values(PERMISSIONS), // School Admin has full permissions within their tenant school
  TEACHER: [
    PERMISSIONS.STUDENT_VIEW,
    PERMISSIONS.ACADEMICS_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.ATTENDANCE_MARK,
    PERMISSIONS.ATTENDANCE_EDIT,
    PERMISSIONS.ASSIGNMENT_VIEW,
    PERMISSIONS.ASSIGNMENT_CREATE,
    PERMISSIONS.ASSIGNMENT_GRADE,
    PERMISSIONS.EXAM_VIEW,
    PERMISSIONS.MARKS_ENTER,
    PERMISSIONS.MARKS_EDIT,
    PERMISSIONS.TIMETABLE_VIEW,
    PERMISSIONS.LEAVE_VIEW,
    PERMISSIONS.LEAVE_APPLY,
    PERMISSIONS.NOTICE_VIEW,
  ],
  STUDENT: [
    PERMISSIONS.ACADEMICS_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.ASSIGNMENT_VIEW,
    PERMISSIONS.EXAM_VIEW,
    PERMISSIONS.FEES_VIEW,
    PERMISSIONS.TIMETABLE_VIEW,
    PERMISSIONS.LEAVE_VIEW,
    PERMISSIONS.LEAVE_APPLY,
    PERMISSIONS.NOTICE_VIEW,
  ],
  PARENT: [
    PERMISSIONS.STUDENT_VIEW,
    PERMISSIONS.ACADEMICS_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.ASSIGNMENT_VIEW,
    PERMISSIONS.EXAM_VIEW,
    PERMISSIONS.FEES_VIEW,
    PERMISSIONS.TIMETABLE_VIEW,
    PERMISSIONS.LEAVE_VIEW,
    PERMISSIONS.LEAVE_APPLY,
    PERMISSIONS.NOTICE_VIEW,
  ],
};

/**
 * Reusable helper to check if a user role or user object possesses a specific permission
 */
export function hasPermission(
  userOrRole: { role: UserRole; permissions?: string[] } | UserRole,
  permission: Permission
): boolean {
  if (typeof userOrRole === "string") {
    return DEFAULT_ROLE_PERMISSIONS[userOrRole]?.includes(permission) ?? false;
  }

  // Custom user permissions override if present, else fallback to default role permissions
  if (userOrRole.permissions && userOrRole.permissions.length > 0) {
    return userOrRole.permissions.includes(permission);
  }

  return DEFAULT_ROLE_PERMISSIONS[userOrRole.role]?.includes(permission) ?? false;
}

/**
 * Check if a user possesses any of the specified permissions
 */
export function hasAnyPermission(
  userOrRole: { role: UserRole; permissions?: string[] } | UserRole,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(userOrRole, p));
}
