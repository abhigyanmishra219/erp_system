export type ReportCategory = "STUDENT" | "ATTENDANCE" | "FEE" | "ACADEMIC";

export type StudentReportType =
  | "student-list"
  | "class-list"
  | "student-profile"
  | "admission"
  | "transfer";

export type AttendanceReportType =
  | "daily"
  | "monthly"
  | "student-history"
  | "class-summary"
  | "percentage-ranking";

export type FeeReportType =
  | "paid"
  | "pending"
  | "defaulters"
  | "collection"
  | "student-payments";

export type AcademicReportType =
  | "exam-results"
  | "class-performance"
  | "student-performance"
  | "subject-performance";

export type ReportType =
  | StudentReportType
  | AttendanceReportType
  | FeeReportType
  | AcademicReportType;

export interface ReportContext {
  userId: string;
  userRole: string;
  schoolId: string;
  userName?: string;
}

export interface ReportColumn {
  header: string;
  key: string;
  width?: number;
  align?: "left" | "center" | "right";
  format?: "text" | "number" | "currency" | "percentage" | "date";
}

export interface ReportSummaryItem {
  label: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
  format?: "text" | "number" | "currency" | "percentage";
  color?: "indigo" | "emerald" | "amber" | "rose" | "blue" | "slate";
}

export interface ReportPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ReportMetadata {
  category: ReportCategory;
  reportType: ReportType;
  title: string;
  description: string;
  schoolName: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  schoolLogo?: string;
  generatedAt: string;
  generatedBy?: string;
  filtersApplied: Record<string, string>;
}

export interface ReportResult<T = Record<string, any>> {
  metadata: ReportMetadata;
  columns: ReportColumn[];
  summary?: ReportSummaryItem[];
  rows: T[];
  pagination?: ReportPagination;
}

export interface BaseReportFilters {
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  studentId?: string;
  subjectId?: string;
  examId?: string;
  status?: string;
  paymentMethod?: string;
  fromDate?: string;
  toDate?: string;
  month?: string; // YYYY-MM
  date?: string; // YYYY-MM-DD
  search?: string;
  minPercentage?: number;
  maxPercentage?: number;
  page?: number;
  limit?: number;
  isExport?: boolean;
}
