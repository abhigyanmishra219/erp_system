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
  TEACHER_STATUS_MANAGE: "teacher.status.manage",
  TEACHER_ACCOUNT_MANAGE: "teacher.account.manage",
  TEACHER_ASSIGNMENT_MANAGE: "teacher.assignment.manage",
  CLASS_TEACHER_MANAGE: "class.teacher.manage",

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
  ATTENDANCE_CREATE: "attendance.create",
  ATTENDANCE_EDIT: "attendance.edit",
  ATTENDANCE_DELETE: "attendance.delete",
  ATTENDANCE_MANAGE: "attendance.manage",
  ATTENDANCE_VIEW_STUDENT: "attendance.view.student",
  ATTENDANCE_VIEW_CLASS: "attendance.view.class",
  ATTENDANCE_VIEW_MONTHLY: "attendance.view.monthly",
  ATTENDANCE_EDIT_LOCKED: "attendance.edit.locked",

  // Assignments & Study Material
  ASSIGNMENT_VIEW: "assignment.view",
  ASSIGNMENT_CREATE: "assignment.create",
  ASSIGNMENT_EDIT: "assignment.edit",
  ASSIGNMENT_DELETE: "assignment.delete",
  ASSIGNMENT_REVIEW: "assignment.review",
  ASSIGNMENT_SUBMIT: "assignment.submit",
  ASSIGNMENT_GRADE: "assignment.grade",
  STUDY_MATERIAL_VIEW: "study_material.view",
  STUDY_MATERIAL_CREATE: "study_material.create",
  STUDY_MATERIAL_EDIT: "study_material.edit",
  STUDY_MATERIAL_DELETE: "study_material.delete",

  // Exams & Marks
  EXAM_VIEW: "exam.view",
  EXAM_CREATE: "exam.create",
  EXAM_EDIT: "exam.edit",
  EXAM_DELETE: "exam.delete",
  EXAM_MANAGE_TARGETS: "exam.target.manage",
  EXAM_MANAGE_SUBJECTS: "exam.subject.manage",
  MARKS_ENTER: "marks.enter",
  MARKS_EDIT: "marks.edit",
  MARKS_REVIEW: "marks.review",
  MARKS_PUBLISH: "marks.publish",
  RESULT_VIEW: "result.view",
  RESULT_REVIEW: "result.review",
  RESULT_PUBLISH: "result.publish",
  RESULT_UNPUBLISH: "result.unpublish",
  REPORT_CARD_VIEW: "report_card.view",
  REPORT_CARD_PRINT: "report_card.print",

  // Fees & Payments
  FEES_VIEW: "fees.view",
  FEES_CREATE: "fees.create",
  FEES_EDIT: "fees.edit",
  FEES_DELETE: "fees.delete",
  FEE_CATEGORY_MANAGE: "fee.category.manage",
  FEE_STRUCTURE_MANAGE: "fee.structure.manage",
  FEE_ASSIGN_MANAGE: "fee.assignment.manage",
  PAYMENT_RECORD: "payment.record",
  PAYMENT_VIEW: "payment.view",
  RECEIPT_VIEW: "receipt.view",
  RECEIPT_PRINT: "receipt.print",

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
  NOTICE_PUBLISH: "notice.publish",
  NOTICE_ARCHIVE: "notice.archive",
  NOTICE_DELETE: "notice.delete",

  // Notifications
  NOTIFICATION_VIEW: "notification.view",
  NOTIFICATION_READ: "notification.read",

  // Reports & Analytics
  REPORTS_VIEW: "reports.view",
  REPORTS_STUDENT_VIEW: "reports.student.view",
  REPORTS_ATTENDANCE_VIEW: "reports.attendance.view",
  REPORTS_FEE_VIEW: "reports.fee.view",
  REPORTS_ACADEMIC_VIEW: "reports.academic.view",
  REPORTS_EXPORT_PDF: "reports.export.pdf",
  REPORTS_EXPORT_EXCEL: "reports.export.excel",

  // Data Import & Export (Phase A11)
  IMPORT_VIEW: "import.view",
  IMPORT_CREATE: "import.create",
  IMPORT_CONFIRM: "import.confirm",
  EXPORT_STUDENTS: "export.students",
  EXPORT_TEACHERS: "export.teachers",
  EXPORT_PARENTS: "export.parents",
  EXPORT_ATTENDANCE: "export.attendance",
  EXPORT_FEES: "export.fees",
  EXPORT_RESULTS: "export.results",
  EXPORT_REPORTS: "export.reports",

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
    PERMISSIONS.ATTENDANCE_CREATE,
    PERMISSIONS.ATTENDANCE_EDIT,
    PERMISSIONS.ATTENDANCE_VIEW_STUDENT,
    PERMISSIONS.ATTENDANCE_VIEW_CLASS,
    PERMISSIONS.ATTENDANCE_VIEW_MONTHLY,
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
    PERMISSIONS.NOTIFICATION_VIEW,
    PERMISSIONS.NOTIFICATION_READ,
  ],
  STUDENT: [
    PERMISSIONS.ACADEMICS_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW_STUDENT,
    PERMISSIONS.ATTENDANCE_VIEW_MONTHLY,
    PERMISSIONS.ASSIGNMENT_VIEW,
    PERMISSIONS.EXAM_VIEW,
    PERMISSIONS.FEES_VIEW,
    PERMISSIONS.TIMETABLE_VIEW,
    PERMISSIONS.LEAVE_VIEW,
    PERMISSIONS.LEAVE_APPLY,
    PERMISSIONS.NOTICE_VIEW,
    PERMISSIONS.NOTIFICATION_VIEW,
    PERMISSIONS.NOTIFICATION_READ,
  ],
  PARENT: [
    PERMISSIONS.STUDENT_VIEW,
    PERMISSIONS.ACADEMICS_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW_STUDENT,
    PERMISSIONS.ATTENDANCE_VIEW_MONTHLY,
    PERMISSIONS.ASSIGNMENT_VIEW,
    PERMISSIONS.EXAM_VIEW,
    PERMISSIONS.FEES_VIEW,
    PERMISSIONS.TIMETABLE_VIEW,
    PERMISSIONS.LEAVE_VIEW,
    PERMISSIONS.LEAVE_APPLY,
    PERMISSIONS.NOTICE_VIEW,
    PERMISSIONS.NOTIFICATION_VIEW,
    PERMISSIONS.NOTIFICATION_READ,
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
