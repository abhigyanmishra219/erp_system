import { SCHOOL_MODULES, SchoolModule, SubscriptionStatus } from "@/lib/validation/school";

export { SCHOOL_MODULES };
export type { SchoolModule };

export interface ErpModuleMetadata {
  id: SchoolModule;
  label: string;
  description: string;
  iconName: string;
  adminPath: string;
  teacherPath?: string;
  studentPath?: string;
  parentPath?: string;
  apiPrefixes: string[];
}

export const ERP_MODULES: Record<SchoolModule, ErpModuleMetadata> = {
  ATTENDANCE: {
    id: "ATTENDANCE",
    label: "Attendance",
    description: "Daily student & staff attendance tracking with biometric / manual modes",
    iconName: "CalendarCheck",
    adminPath: "/admin/attendance",
    teacherPath: "/teacher/attendance",
    studentPath: "/student/attendance",
    parentPath: "/parent/attendance",
    apiPrefixes: [
      "/api/admin/attendance",
      "/api/teacher/attendance",
      "/api/student/attendance",
      "/api/parent/attendance",
    ],
  },
  ASSIGNMENTS: {
    id: "ASSIGNMENTS",
    label: "Assignments",
    description: "Homework distribution, file attachments, submissions, and grading",
    iconName: "FileText",
    adminPath: "/admin/assignments",
    teacherPath: "/teacher/assignments",
    studentPath: "/student/assignments",
    parentPath: "/parent/assignments",
    apiPrefixes: [
      "/api/admin/assignments",
      "/api/teacher/assignments",
      "/api/student/assignments",
      "/api/parent/assignments",
    ],
  },
  STUDY_MATERIAL: {
    id: "STUDY_MATERIAL",
    label: "Study Material",
    description: "Curriculum PDFs, digital notes, video links, and syllabus repository",
    iconName: "BookOpen",
    adminPath: "/admin/study-material",
    teacherPath: "/teacher/study-material",
    studentPath: "/student/study-material",
    apiPrefixes: [
      "/api/admin/study-material",
      "/api/teacher/study-material",
      "/api/student/study-material",
    ],
  },
  EXAMS: {
    id: "EXAMS",
    label: "Exams",
    description: "Term exam scheduling, hall tickets, timetable, and marks management",
    iconName: "Award",
    adminPath: "/admin/exams",
    teacherPath: "/teacher/exams",
    studentPath: "/student/exams",
    parentPath: "/parent/exams",
    apiPrefixes: [
      "/api/admin/exams",
      "/api/teacher/exams",
      "/api/student/exams",
      "/api/parent/exams",
    ],
  },
  RESULTS: {
    id: "RESULTS",
    label: "Results & Reports",
    description: "Publish grade cards, calculate class rankings, and download report cards",
    iconName: "GraduationCap",
    adminPath: "/admin/results",
    studentPath: "/student/results",
    parentPath: "/parent/results",
    apiPrefixes: [
      "/api/admin/results",
      "/api/student/results",
      "/api/student/report-cards",
      "/api/parent/results",
    ],
  },
  FEES: {
    id: "FEES",
    label: "Fee Management",
    description: "Fee structures, offline & online collection, receipts, and dues ledger",
    iconName: "CreditCard",
    adminPath: "/admin/fees",
    studentPath: "/student/fees",
    parentPath: "/parent/fees",
    apiPrefixes: [
      "/api/admin/fees",
      "/api/student/fees",
      "/api/parent/fees",
    ],
  },
  NOTICES: {
    id: "NOTICES",
    label: "Notices & Circulars",
    description: "Broadcast circulars, general announcements, and target notices",
    iconName: "Bell",
    adminPath: "/admin/notices",
    teacherPath: "/teacher/notices",
    studentPath: "/student/notices",
    parentPath: "/parent/notices",
    apiPrefixes: [
      "/api/admin/notices",
      "/api/teacher/notices",
      "/api/student/notices",
      "/api/parent/notices",
    ],
  },
  NOTIFICATIONS: {
    id: "NOTIFICATIONS",
    label: "Notification Center",
    description: "System notifications, in-app alerts, and communication logs",
    iconName: "Inbox",
    adminPath: "/admin/notifications",
    teacherPath: "/teacher/notifications",
    studentPath: "/student/notifications",
    parentPath: "/parent/notifications",
    apiPrefixes: [
      "/api/admin/notifications",
      "/api/teacher/notifications",
      "/api/student/notifications",
      "/api/parent/notifications",
    ],
  },
  TIMETABLE: {
    id: "TIMETABLE",
    label: "Timetable",
    description: "Weekly period scheduling, teacher allocations, and class timetables",
    iconName: "Clock",
    adminPath: "/admin/timetable",
    teacherPath: "/teacher/timetable",
    studentPath: "/student/timetable",
    parentPath: "/parent/timetable",
    apiPrefixes: [
      "/api/admin/timetable",
      "/api/teacher/timetable",
      "/api/student/timetable",
      "/api/parent/timetable",
    ],
  },
  LEAVE: {
    id: "LEAVE",
    label: "Leave Management",
    description: "Teacher & staff leave applications, student leave approvals, and balance",
    iconName: "CalendarX",
    adminPath: "/admin/leaves",
    teacherPath: "/teacher/leave",
    parentPath: "/parent/leave",
    apiPrefixes: [
      "/api/admin/leaves",
      "/api/teacher/leave",
      "/api/parent/leave",
    ],
  },
  REPORTS: {
    id: "REPORTS",
    label: "Reports & Analytics",
    description: "Comprehensive student, fee, attendance, and academic report exports",
    iconName: "BarChart3",
    adminPath: "/admin/reports",
    apiPrefixes: ["/api/admin/reports"],
  },
};

export interface SchoolSubscriptionLike {
  plan?: string;
  subscriptionStatus?: "TRIAL" | "ACTIVE" | "EXPIRED" | "SUSPENDED" | "CANCELLED" | string;
  subscriptionStartDate?: Date | string | null;
  subscriptionExpiryDate?: Date | string | null;
  enabledModules?: SchoolModule[] | string[];
  studentLimit?: number;
  maxStudents?: number;
  status?: string;
  isDeleted?: boolean;
}

export interface EffectiveSubscription {
  planName: string;
  planCode: string;
  status: string;
  effectiveStatus: "TRIAL" | "ACTIVE" | "EXPIRED" | "SUSPENDED" | "CANCELLED";
  isActive: boolean;
  isExpired: boolean;
  isSuspended: boolean;
  maxStudents: number;
  currentStudents: number;
  remainingStudentSlots: number;
  storageLimit: number;
  maxAdmins: number;
  enabledModules: SchoolModule[];
  startDate: string | null;
  expiryDate: string | null;
  daysRemaining: number;
}

/**
 * Calculates the dynamic subscription status taking into account real-time expiry dates.
 */
export function getEffectiveSubscriptionStatus(
  school?: SchoolSubscriptionLike | null
): "TRIAL" | "ACTIVE" | "EXPIRED" | "SUSPENDED" | "CANCELLED" {
  if (!school) return "EXPIRED";

  const rawStatus = school.subscriptionStatus || "TRIAL";

  if (rawStatus === "SUSPENDED") return "SUSPENDED";
  if (rawStatus === "CANCELLED") return "CANCELLED";
  if (rawStatus === "EXPIRED") return "EXPIRED";

  if (school.subscriptionExpiryDate) {
    const expiry = new Date(school.subscriptionExpiryDate).getTime();
    if (!isNaN(expiry) && expiry < Date.now()) {
      return "EXPIRED";
    }
  }

  return rawStatus === "ACTIVE" ? "ACTIVE" : "TRIAL";
}

/**
 * Checks whether the school has an active and valid subscription.
 */
export function isSubscriptionActive(school?: SchoolSubscriptionLike | null): boolean {
  if (!school) return false;
  const status = getEffectiveSubscriptionStatus(school);
  return status === "ACTIVE" || status === "TRIAL";
}

/**
 * Checks whether a given module is enabled in the school's active subscription.
 */
export function hasModuleAccess(
  school?: SchoolSubscriptionLike | null,
  moduleName?: SchoolModule | string
): boolean {
  if (!school || !moduleName) return false;
  if (!isSubscriptionActive(school)) return false;

  const validModule = moduleName as SchoolModule;
  if (!SCHOOL_MODULES.includes(validModule)) return false;

  return Array.isArray(school.enabledModules) && school.enabledModules.includes(validModule);
}

/**
 * Pure helper to evaluate student capacity limits.
 */
export function evaluateCapacity(
  limit: number,
  currentCount: number,
  countToAdd: number = 1
): {
  allowed: boolean;
  currentCount: number;
  limit: number;
  remaining: number;
  available: number;
  requested: number;
} {
  const remaining = Math.max(0, limit - currentCount);
  const allowed = currentCount + countToAdd <= limit;
  return {
    allowed,
    currentCount,
    limit,
    remaining,
    available: remaining,
    requested: countToAdd,
  };
}

/**
 * Returns student capacity limit from subscription snapshot.
 */
export function getStudentLimit(school?: SchoolSubscriptionLike | null): number {
  if (!school) return 200;
  return school.studentLimit || school.maxStudents || 200;
}
