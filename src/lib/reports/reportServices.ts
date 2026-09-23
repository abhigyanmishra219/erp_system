import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import School from "@/models/School";
import Student from "@/models/Student";
import Class from "@/models/Class";
import Section from "@/models/Section";
import Subject from "@/models/Subject";
import AcademicYear from "@/models/AcademicYear";
import Attendance from "@/models/Attendance";
import FeePayment from "@/models/FeePayment";
import StudentFeeAccount from "@/models/StudentFeeAccount";
import Exam from "@/models/Exam";
import ExamSubject from "@/models/ExamSubject";
import ExamResult from "@/models/ExamResult";
import StudentParent from "@/models/StudentParent";
import Parent from "@/models/Parent";
import { calculateAttendancePercentage } from "@/lib/utils/attendance";
import { ResultCalculationService } from "@/lib/services/resultCalculationService";
import {
  ReportContext,
  BaseReportFilters,
  ReportResult,
  ReportMetadata,
  ReportColumn,
  ReportSummaryItem,
  ReportPagination,
} from "./types";

async function getSchoolMetadata(
  schoolId: string,
  category: any,
  reportType: any,
  title: string,
  description: string,
  filtersApplied: Record<string, string>,
  generatedBy?: string
): Promise<ReportMetadata> {
  const school = await School.findById(schoolId).lean();
  return {
    category,
    reportType,
    title,
    description,
    schoolName: school?.name || "School ERP",
    schoolAddress: [school?.address, school?.city, school?.state].filter(Boolean).join(", ") || undefined,
    schoolPhone: school?.phone || undefined,
    schoolEmail: school?.email || undefined,
    schoolLogo: school?.branding?.logo || school?.logo || undefined,
    generatedAt: new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    generatedBy,
    filtersApplied,
  };
}

export class ReportServices {
  // =========================================================================
  // 1. STUDENT LIST REPORT
  // =========================================================================
  public static async getStudentListReport(
    context: ReportContext,
    filters: BaseReportFilters
  ): Promise<ReportResult> {
    await connectToDatabase();
    const { schoolId } = context;

    const query: Record<string, any> = { schoolId };
    const filterLabels: Record<string, string> = {};

    if (filters.academicYearId) {
      query.academicYearId = filters.academicYearId;
      const ay = await AcademicYear.findOne({ _id: filters.academicYearId, schoolId }).lean();
      if (ay) filterLabels["Academic Year"] = ay.name;
    }
    if (filters.classId) {
      query.classId = filters.classId;
      const cls = await Class.findOne({ _id: filters.classId, schoolId }).lean();
      if (cls) filterLabels["Class"] = cls.name;
    }
    if (filters.sectionId) {
      query.sectionId = filters.sectionId;
      const sec = await Section.findOne({ _id: filters.sectionId, schoolId }).lean();
      if (sec) filterLabels["Section"] = sec.name;
    }
    if (filters.status && filters.status !== "ALL") {
      query.status = filters.status;
      filterLabels["Status"] = filters.status;
    }
    if (filters.search) {
      const regex = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ firstName: regex }, { lastName: regex }, { admissionNumber: regex }, { rollNumber: regex }];
      filterLabels["Search"] = filters.search;
    }

    const total = await Student.countDocuments(query);
    const page = Math.max(1, filters.page || 1);
    const limit = filters.isExport ? Math.min(total || 1, 5000) : Math.max(1, Math.min(100, filters.limit || 20));
    const skip = (page - 1) * limit;

    const students = await Student.find(query)
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .populate("academicYearId", "name")
      .sort({ classId: 1, sectionId: 1, rollNumber: 1, admissionNumber: 1 })
      .skip(filters.isExport ? 0 : skip)
      .limit(limit)
      .lean();

    // Fetch parent mapping
    const studentIds = students.map((s) => s._id);
    const parentLinks = await StudentParent.find({ studentId: { $in: studentIds }, schoolId, isActive: true })
      .populate("parentId", "firstName lastName phone email relationship")
      .lean();

    const parentMap = new Map<string, any>();
    for (const link of parentLinks) {
      const p = link.parentId as any;
      if (p && !parentMap.has(link.studentId.toString())) {
        parentMap.set(link.studentId.toString(), {
          name: `${p.firstName} ${p.lastName}`.trim(),
          phone: p.phone,
          relationship: link.relationship || p.relationship,
        });
      }
    }

    const rows = students.map((s: any) => {
      const parent = parentMap.get(s._id.toString());
      return {
        id: s._id.toString(),
        studentId: s.studentId || "—",
        admissionNumber: s.admissionNumber,
        studentName: `${s.firstName} ${s.lastName}`.trim(),
        className: s.classId?.name || "—",
        sectionName: s.sectionId?.name || "—",
        rollNumber: s.rollNumber || "—",
        gender: s.gender || "—",
        status: s.status,
        parentName: parent?.name || s.emergencyContact?.name || "—",
        parentPhone: parent?.phone || s.emergencyContact?.phone || s.phone || "—",
        email: s.email || "—",
      };
    });

    const activeCount = await Student.countDocuments({ ...query, status: "ACTIVE" });
    const metadata = await getSchoolMetadata(
      schoolId,
      "STUDENT",
      "student-list",
      "Student Directory & Enrollment Report",
      "Comprehensive directory of students with current class placements and contact details.",
      filterLabels,
      context.userName
    );

    const columns: ReportColumn[] = [
      { header: "Admission No", key: "admissionNumber", width: 14 },
      { header: "Student Name", key: "studentName", width: 22 },
      { header: "Class", key: "className", width: 12 },
      { header: "Section", key: "sectionName", width: 10 },
      { header: "Roll No", key: "rollNumber", width: 10, align: "center" },
      { header: "Gender", key: "gender", width: 10, align: "center" },
      { header: "Status", key: "status", width: 12, align: "center" },
      { header: "Parent / Guardian", key: "parentName", width: 20 },
      { header: "Contact Phone", key: "parentPhone", width: 16 },
    ];

    const summary: ReportSummaryItem[] = [
      { label: "Total Students", value: total, format: "number", color: "indigo" },
      { label: "Active Enrolled", value: activeCount, format: "number", color: "emerald" },
      { label: "Other / Inactive", value: total - activeCount, format: "number", color: "amber" },
    ];

    return {
      metadata,
      columns,
      summary,
      rows,
      pagination: filters.isExport
        ? undefined
        : { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  // =========================================================================
  // 2. CLASS LIST REPORT
  // =========================================================================
  public static async getClassListReport(
    context: ReportContext,
    filters: BaseReportFilters
  ): Promise<ReportResult> {
    await connectToDatabase();
    const { schoolId } = context;

    const query: Record<string, any> = { schoolId };
    const filterLabels: Record<string, string> = {};

    if (filters.academicYearId) {
      query.academicYearId = filters.academicYearId;
      const ay = await AcademicYear.findOne({ _id: filters.academicYearId, schoolId }).lean();
      if (ay) filterLabels["Academic Year"] = ay.name;
    }
    if (filters.classId) {
      query.classId = filters.classId;
      const cls = await Class.findOne({ _id: filters.classId, schoolId }).lean();
      if (cls) filterLabels["Class"] = cls.name;
    }
    if (filters.sectionId) {
      query.sectionId = filters.sectionId;
      const sec = await Section.findOne({ _id: filters.sectionId, schoolId }).lean();
      if (sec) filterLabels["Section"] = sec.name;
    }
    if (filters.status && filters.status !== "ALL") {
      query.status = filters.status;
      filterLabels["Status"] = filters.status;
    }

    const total = await Student.countDocuments(query);
    const page = Math.max(1, filters.page || 1);
    const limit = filters.isExport ? Math.min(total || 1, 5000) : Math.max(1, Math.min(100, filters.limit || 50));
    const skip = (page - 1) * limit;

    const students = await Student.find(query)
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .populate("academicYearId", "name")
      .lean();

    // Natural numeric sort by rollNumber
    students.sort((a: any, b: any) => {
      const clsComp = (a.classId?.name || "").localeCompare(b.classId?.name || "");
      if (clsComp !== 0) return clsComp;
      const secComp = (a.sectionId?.name || "").localeCompare(b.sectionId?.name || "");
      if (secComp !== 0) return secComp;
      const numA = parseInt(a.rollNumber || "99999", 10);
      const numB = parseInt(b.rollNumber || "99999", 10);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
      return (a.admissionNumber || "").localeCompare(b.admissionNumber || "");
    });

    const paginated = filters.isExport ? students : students.slice(skip, skip + limit);

    const rows = paginated.map((s: any) => ({
      id: s._id.toString(),
      className: s.classId?.name || "—",
      sectionName: s.sectionId?.name || "—",
      rollNumber: s.rollNumber || "—",
      admissionNumber: s.admissionNumber,
      studentName: `${s.firstName} ${s.lastName}`.trim(),
      gender: s.gender || "—",
      status: s.status,
    }));

    const maleCount = students.filter((s) => s.gender === "MALE").length;
    const femaleCount = students.filter((s) => s.gender === "FEMALE").length;

    const metadata = await getSchoolMetadata(
      schoolId,
      "STUDENT",
      "class-list",
      "Class Roster & Nominal Roll Report",
      "Structured nominal roll organized by class, section, and ascending roll numbers.",
      filterLabels,
      context.userName
    );

    const columns: ReportColumn[] = [
      { header: "Class", key: "className", width: 14 },
      { header: "Section", key: "sectionName", width: 12 },
      { header: "Roll No", key: "rollNumber", width: 12, align: "center" },
      { header: "Admission No", key: "admissionNumber", width: 16 },
      { header: "Student Name", key: "studentName", width: 26 },
      { header: "Gender", key: "gender", width: 12, align: "center" },
      { header: "Status", key: "status", width: 12, align: "center" },
    ];

    const summary: ReportSummaryItem[] = [
      { label: "Total Students", value: total, format: "number", color: "indigo" },
      { label: "Male Students", value: maleCount, format: "number", color: "blue" },
      { label: "Female Students", value: femaleCount, format: "number", color: "emerald" },
    ];

    return {
      metadata,
      columns,
      summary,
      rows,
      pagination: filters.isExport
        ? undefined
        : { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  // =========================================================================
  // 3. STUDENT PROFILE REPORT
  // =========================================================================
  public static async getStudentProfileReport(
    context: ReportContext,
    filters: BaseReportFilters
  ): Promise<ReportResult> {
    await connectToDatabase();
    const { schoolId } = context;

    if (!filters.studentId) {
      throw new Error("Student selection is required for Student Profile Report");
    }

    const student = await Student.findOne({ _id: filters.studentId, schoolId })
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .populate("academicYearId", "name")
      .lean();

    if (!student) {
      throw new Error("Student record not found in your school");
    }

    // Parents
    const parentLinks = await StudentParent.find({ studentId: student._id, schoolId, isActive: true })
      .populate("parentId", "firstName lastName phone email occupation relationship")
      .lean();

    // Attendance summary
    const attendanceRecords = await Attendance.find({ studentId: student._id, schoolId }).lean();
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
    const attPct = calculateAttendancePercentage(presentDays, totalDays);

    // Fee balance
    const feeAccount = await StudentFeeAccount.findOne({ studentId: student._id, schoolId }).lean();
    const totalFee = feeAccount?.totalFee || 0;
    const paidAmount = feeAccount?.paidAmount || 0;
    const pendingAmount = feeAccount?.pendingAmount || Math.max(0, totalFee - paidAmount);

    // Academic exam summary
    const examResults = await ExamResult.find({ studentId: student._id, schoolId, status: "PUBLISHED" }).lean();
    const totalMarks = examResults.reduce((acc, r) => acc + (r.marks || 0), 0);
    const totalMax = examResults.length * 100;
    const academicPct = totalMax > 0 ? Number(((totalMarks / totalMax) * 100).toFixed(1)) : 0;

    const filterLabels: Record<string, string> = {
      Student: `${student.firstName} ${student.lastName} (${student.admissionNumber})`,
      Class: (student.classId as any)?.name || "—",
      Section: (student.sectionId as any)?.name || "—",
    };

    const metadata = await getSchoolMetadata(
      schoolId,
      "STUDENT",
      "student-profile",
      `Student Comprehensive Profile: ${student.firstName} ${student.lastName}`,
      "Individual student master card with demographics, guardian contacts, attendance, academic standing, and fee account summary.",
      filterLabels,
      context.userName
    );

    const rows = [
      { field: "Full Name", value: `${student.firstName} ${student.lastName}`.trim() },
      { field: "Admission Number", value: student.admissionNumber },
      { field: "Roll Number", value: student.rollNumber || "—" },
      { field: "Academic Year", value: (student.academicYearId as any)?.name || "—" },
      { field: "Class & Section", value: `${(student.classId as any)?.name || "—"} - Sec ${(student.sectionId as any)?.name || "—"}` },
      { field: "Date of Birth", value: student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("en-IN") : "—" },
      { field: "Gender", value: student.gender },
      { field: "Admission Date", value: student.admissionDate ? new Date(student.admissionDate).toLocaleDateString("en-IN") : "—" },
      { field: "Status", value: student.status },
      { field: "Primary Phone", value: student.phone || "—" },
      { field: "Email Address", value: student.email || "—" },
      { field: "Residential Address", value: [student.address?.street, student.address?.city, student.address?.state].filter(Boolean).join(", ") || "—" },
      {
        field: "Parent / Guardian",
        value: parentLinks
          .map((l: any) => `${l.parentId?.firstName || ""} ${l.parentId?.lastName || ""} (${l.relationship || "Guardian"}) - ${l.parentId?.phone || "No Phone"}`)
          .join(" | ") || "—",
      },
      { field: "Attendance Record", value: `${presentDays} / ${totalDays} Days Present (${attPct}%)` },
      { field: "Fee Account Summary", value: `Total: ₹${totalFee.toLocaleString("en-IN")} | Paid: ₹${paidAmount.toLocaleString("en-IN")} | Pending: ₹${pendingAmount.toLocaleString("en-IN")}` },
      { field: "Academic Standing", value: `${examResults.length} Evaluated Subjects | Aggregate: ${academicPct}%` },
    ];

    const columns: ReportColumn[] = [
      { header: "Profile Attribute", key: "field", width: 28 },
      { header: "Student Details & Summary Metrics", key: "value", width: 55 },
    ];

    const summary: ReportSummaryItem[] = [
      { label: "Attendance %", value: attPct, suffix: "%", format: "percentage", color: "emerald" },
      { label: "Fee Balance", value: pendingAmount, prefix: "₹", format: "currency", color: pendingAmount > 0 ? "rose" : "emerald" },
      { label: "Academic Avg", value: academicPct, suffix: "%", format: "percentage", color: "indigo" },
    ];

    return { metadata, columns, summary, rows };
  }

  // =========================================================================
  // 4. ADMISSION REPORT
  // =========================================================================
  public static async getAdmissionReport(
    context: ReportContext,
    filters: BaseReportFilters
  ): Promise<ReportResult> {
    await connectToDatabase();
    const { schoolId } = context;

    const query: Record<string, any> = { schoolId };
    const filterLabels: Record<string, string> = {};

    if (filters.fromDate || filters.toDate) {
      query.admissionDate = {};
      if (filters.fromDate) {
        query.admissionDate.$gte = new Date(filters.fromDate);
        filterLabels["From Date"] = new Date(filters.fromDate).toLocaleDateString("en-IN");
      }
      if (filters.toDate) {
        const toD = new Date(filters.toDate);
        toD.setHours(23, 59, 59, 999);
        query.admissionDate.$lte = toD;
        filterLabels["To Date"] = new Date(filters.toDate).toLocaleDateString("en-IN");
      }
    }

    if (filters.academicYearId) {
      query.academicYearId = filters.academicYearId;
      const ay = await AcademicYear.findOne({ _id: filters.academicYearId, schoolId }).lean();
      if (ay) filterLabels["Academic Year"] = ay.name;
    }
    if (filters.classId) {
      query.classId = filters.classId;
      const cls = await Class.findOne({ _id: filters.classId, schoolId }).lean();
      if (cls) filterLabels["Class"] = cls.name;
    }
    if (filters.sectionId) {
      query.sectionId = filters.sectionId;
      const sec = await Section.findOne({ _id: filters.sectionId, schoolId }).lean();
      if (sec) filterLabels["Section"] = sec.name;
    }
    if (filters.status && filters.status !== "ALL") {
      query.status = filters.status;
      filterLabels["Status"] = filters.status;
    }

    const total = await Student.countDocuments(query);
    const page = Math.max(1, filters.page || 1);
    const limit = filters.isExport ? Math.min(total || 1, 5000) : Math.max(1, Math.min(100, filters.limit || 20));
    const skip = (page - 1) * limit;

    const students = await Student.find(query)
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .populate("academicYearId", "name")
      .sort({ admissionDate: -1, createdAt: -1 })
      .skip(filters.isExport ? 0 : skip)
      .limit(limit)
      .lean();

    const rows = students.map((s: any) => ({
      id: s._id.toString(),
      admissionNumber: s.admissionNumber,
      studentName: `${s.firstName} ${s.lastName}`.trim(),
      admissionDate: s.admissionDate ? new Date(s.admissionDate).toLocaleDateString("en-IN") : "—",
      className: s.classId?.name || "—",
      sectionName: s.sectionId?.name || "—",
      gender: s.gender || "—",
      status: s.status,
    }));

    const metadata = await getSchoolMetadata(
      schoolId,
      "STUDENT",
      "admission",
      "New Admissions & Enrollment Registry Report",
      "Detailed record of student intake and admission timelines across academic sessions.",
      filterLabels,
      context.userName
    );

    const columns: ReportColumn[] = [
      { header: "Admission No", key: "admissionNumber", width: 16 },
      { header: "Student Name", key: "studentName", width: 24 },
      { header: "Admission Date", key: "admissionDate", width: 16, align: "center" },
      { header: "Class", key: "className", width: 14 },
      { header: "Section", key: "sectionName", width: 12 },
      { header: "Gender", key: "gender", width: 12, align: "center" },
      { header: "Status", key: "status", width: 12, align: "center" },
    ];

    const summary: ReportSummaryItem[] = [
      { label: "Total Admissions", value: total, format: "number", color: "indigo" },
    ];

    return {
      metadata,
      columns,
      summary,
      rows,
      pagination: filters.isExport
        ? undefined
        : { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  // =========================================================================
  // 5. TRANSFER REPORT
  // =========================================================================
  public static async getTransferReport(
    context: ReportContext,
    filters: BaseReportFilters
  ): Promise<ReportResult> {
    await connectToDatabase();
    const { schoolId } = context;

    const query: Record<string, any> = {
      schoolId,
      $or: [{ status: "TRANSFERRED" }, { "transferDetails.transferDate": { $exists: true } }],
    };
    const filterLabels: Record<string, string> = {};

    if (filters.fromDate || filters.toDate) {
      query["transferDetails.transferDate"] = {};
      if (filters.fromDate) {
        query["transferDetails.transferDate"].$gte = new Date(filters.fromDate);
        filterLabels["From Date"] = new Date(filters.fromDate).toLocaleDateString("en-IN");
      }
      if (filters.toDate) {
        const toD = new Date(filters.toDate);
        toD.setHours(23, 59, 59, 999);
        query["transferDetails.transferDate"].$lte = toD;
        filterLabels["To Date"] = new Date(filters.toDate).toLocaleDateString("en-IN");
      }
    }

    if (filters.academicYearId) {
      query.academicYearId = filters.academicYearId;
      const ay = await AcademicYear.findOne({ _id: filters.academicYearId, schoolId }).lean();
      if (ay) filterLabels["Academic Year"] = ay.name;
    }
    if (filters.classId) {
      query.classId = filters.classId;
      const cls = await Class.findOne({ _id: filters.classId, schoolId }).lean();
      if (cls) filterLabels["Class"] = cls.name;
    }
    if (filters.sectionId) {
      query.sectionId = filters.sectionId;
      const sec = await Section.findOne({ _id: filters.sectionId, schoolId }).lean();
      if (sec) filterLabels["Section"] = sec.name;
    }

    const total = await Student.countDocuments(query);
    const page = Math.max(1, filters.page || 1);
    const limit = filters.isExport ? Math.min(total || 1, 5000) : Math.max(1, Math.min(100, filters.limit || 20));
    const skip = (page - 1) * limit;

    const students = await Student.find(query)
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .sort({ "transferDetails.transferDate": -1, updatedAt: -1 })
      .skip(filters.isExport ? 0 : skip)
      .limit(limit)
      .lean();

    const rows = students.map((s: any) => ({
      id: s._id.toString(),
      studentName: `${s.firstName} ${s.lastName}`.trim(),
      admissionNumber: s.admissionNumber,
      className: s.classId?.name || "—",
      sectionName: s.sectionId?.name || "—",
      transferDate: s.transferDetails?.transferDate
        ? new Date(s.transferDetails.transferDate).toLocaleDateString("en-IN")
        : s.updatedAt
        ? new Date(s.updatedAt).toLocaleDateString("en-IN")
        : "—",
      targetSchool: s.transferDetails?.targetSchool || "—",
      reason: s.transferDetails?.reason || "School Transfer",
      tcNumber: s.transferDetails?.transferCertificateNumber || "—",
      status: s.status,
    }));

    const metadata = await getSchoolMetadata(
      schoolId,
      "STUDENT",
      "transfer",
      "Student Transfer & Migration Register",
      "Official record of student transfers, issuing dates, certificate numbers, and destination schools.",
      filterLabels,
      context.userName
    );

    const columns: ReportColumn[] = [
      { header: "Admission No", key: "admissionNumber", width: 14 },
      { header: "Student Name", key: "studentName", width: 22 },
      { header: "Class", key: "className", width: 12 },
      { header: "Section", key: "sectionName", width: 10 },
      { header: "Transfer Date", key: "transferDate", width: 14, align: "center" },
      { header: "Target School", key: "targetSchool", width: 22 },
      { header: "TC Number", key: "tcNumber", width: 14 },
      { header: "Reason", key: "reason", width: 20 },
    ];

    const summary: ReportSummaryItem[] = [
      { label: "Total Transferred", value: total, format: "number", color: "rose" },
    ];

    return {
      metadata,
      columns,
      summary,
      rows,
      pagination: filters.isExport
        ? undefined
        : { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  // =========================================================================
  // 6. DAILY ATTENDANCE REPORT
  // =========================================================================
  public static async getDailyAttendanceReport(
    context: ReportContext,
    filters: BaseReportFilters
  ): Promise<ReportResult> {
    await connectToDatabase();
    const { schoolId } = context;

    const targetDate = filters.date ? new Date(filters.date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const query: Record<string, any> = {
      schoolId,
      date: { $gte: startOfDay, $lte: endOfDay },
    };
    const filterLabels: Record<string, string> = {
      Date: targetDate.toLocaleDateString("en-IN"),
    };

    if (filters.academicYearId) {
      query.academicYearId = filters.academicYearId;
      const ay = await AcademicYear.findOne({ _id: filters.academicYearId, schoolId }).lean();
      if (ay) filterLabels["Academic Year"] = ay.name;
    }
    if (filters.classId) {
      query.classId = filters.classId;
      const cls = await Class.findOne({ _id: filters.classId, schoolId }).lean();
      if (cls) filterLabels["Class"] = cls.name;
    }
    if (filters.sectionId) {
      query.sectionId = filters.sectionId;
      const sec = await Section.findOne({ _id: filters.sectionId, schoolId }).lean();
      if (sec) filterLabels["Section"] = sec.name;
    }

    const attendanceList = await Attendance.find(query)
      .populate("studentId", "firstName lastName admissionNumber rollNumber")
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .populate("markedBy", "firstName lastName email name")
      .sort({ classId: 1, sectionId: 1, "studentId.rollNumber": 1 })
      .lean();

    const total = attendanceList.length;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;

    const rows = attendanceList.map((a: any) => {
      const s = a.studentId || {};
      const status = a.status || "ABSENT";
      if (status === "PRESENT") presentCount++;
      else if (status === "ABSENT") absentCount++;
      else if (status === "LATE") lateCount++;
      else if (status === "LEAVE") leaveCount++;

      const marker = a.markedBy as any;
      const recordedByName = marker?.name || `${marker?.firstName || ""} ${marker?.lastName || ""}`.trim() || "Staff";

      return {
        id: a._id.toString(),
        studentName: `${s.firstName || ""} ${s.lastName || ""}`.trim() || "Student",
        admissionNumber: s.admissionNumber || "—",
        rollNumber: s.rollNumber || "—",
        className: a.classId?.name || "—",
        sectionName: a.sectionId?.name || "—",
        status: a.status,
        remarks: a.remarks || "—",
        recordedBy: recordedByName,
      };
    });

    const attendedCount = presentCount + lateCount;
    const attPct = calculateAttendancePercentage(attendedCount, total);

    const metadata = await getSchoolMetadata(
      schoolId,
      "ATTENDANCE",
      "daily",
      `Daily Attendance Register: ${targetDate.toLocaleDateString("en-IN")}`,
      "Real-time attendance logs and status breakdowns for the selected calendar date.",
      filterLabels,
      context.userName
    );

    const columns: ReportColumn[] = [
      { header: "Roll No", key: "rollNumber", width: 10, align: "center" },
      { header: "Admission No", key: "admissionNumber", width: 14 },
      { header: "Student Name", key: "studentName", width: 22 },
      { header: "Class", key: "className", width: 12 },
      { header: "Section", key: "sectionName", width: 10 },
      { header: "Status", key: "status", width: 12, align: "center" },
      { header: "Remarks", key: "remarks", width: 18 },
      { header: "Recorded By", key: "recordedBy", width: 16 },
    ];

    const summary: ReportSummaryItem[] = [
      { label: "Total Marked", value: total, format: "number", color: "slate" },
      { label: "Present", value: presentCount, format: "number", color: "emerald" },
      { label: "Absent", value: absentCount, format: "number", color: "rose" },
      { label: "Late", value: lateCount, format: "number", color: "amber" },
      { label: "Leave", value: leaveCount, format: "number", color: "blue" },
      { label: "Attendance %", value: attPct, suffix: "%", format: "percentage", color: "indigo" },
    ];

    return { metadata, columns, summary, rows };
  }

  // =========================================================================
  // 7. MONTHLY ATTENDANCE REPORT
  // =========================================================================
  public static async getMonthlyAttendanceReport(
    context: ReportContext,
    filters: BaseReportFilters
  ): Promise<ReportResult> {
    await connectToDatabase();
    const { schoolId } = context;

    const monthStr = filters.month || new Date().toISOString().slice(0, 7); // YYYY-MM
    const [yearNum, monthNum] = monthStr.split("-").map(Number);

    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

    const filterLabels: Record<string, string> = {
      Month: startDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
    };

    const studentQuery: Record<string, any> = { schoolId, status: "ACTIVE" };
    if (filters.academicYearId) studentQuery.academicYearId = filters.academicYearId;
    if (filters.classId) {
      studentQuery.classId = filters.classId;
      const cls = await Class.findOne({ _id: filters.classId, schoolId }).lean();
      if (cls) filterLabels["Class"] = cls.name;
    }
    if (filters.sectionId) {
      studentQuery.sectionId = filters.sectionId;
      const sec = await Section.findOne({ _id: filters.sectionId, schoolId }).lean();
      if (sec) filterLabels["Section"] = sec.name;
    }
    if (filters.studentId) studentQuery._id = filters.studentId;

    const students = await Student.find(studentQuery)
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .sort({ classId: 1, sectionId: 1, rollNumber: 1 })
      .lean();

    const studentIds = students.map((s) => s._id);

    // Aggregate monthly attendance records
    const attendanceRecords = await Attendance.find({
      schoolId,
      studentId: { $in: studentIds },
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    // Group by student
    const studentRecordsMap = new Map<string, any[]>();
    for (const rec of attendanceRecords) {
      const sId = rec.studentId.toString();
      if (!studentRecordsMap.has(sId)) studentRecordsMap.set(sId, []);
      studentRecordsMap.get(sId)!.push(rec);
    }

    let overallPresent = 0;
    let overallWorkingDays = 0;

    const rows = students.map((s: any) => {
      const recs = studentRecordsMap.get(s._id.toString()) || [];
      const present = recs.filter((r) => r.status === "PRESENT").length;
      const absent = recs.filter((r) => r.status === "ABSENT").length;
      const late = recs.filter((r) => r.status === "LATE").length;
      const leave = recs.filter((r) => r.status === "LEAVE").length;
      const totalWorkingDays = recs.length;

      overallPresent += present + late;
      overallWorkingDays += totalWorkingDays;

      const pct = calculateAttendancePercentage(present + late, totalWorkingDays);

      return {
        id: s._id.toString(),
        rollNumber: s.rollNumber || "—",
        admissionNumber: s.admissionNumber,
        studentName: `${s.firstName} ${s.lastName}`.trim(),
        className: s.classId?.name || "—",
        sectionName: s.sectionId?.name || "—",
        workingDays: totalWorkingDays,
        present,
        absent,
        late,
        leave,
        attendancePercentage: pct,
      };
    });

    const averagePct = calculateAttendancePercentage(overallPresent, overallWorkingDays);

    const metadata = await getSchoolMetadata(
      schoolId,
      "ATTENDANCE",
      "monthly",
      `Monthly Attendance Summary: ${startDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`,
      "Consolidated monthly student attendance metrics, working days tally, and percentage rankings.",
      filterLabels,
      context.userName
    );

    const columns: ReportColumn[] = [
      { header: "Roll No", key: "rollNumber", width: 10, align: "center" },
      { header: "Admission No", key: "admissionNumber", width: 14 },
      { header: "Student Name", key: "studentName", width: 22 },
      { header: "Class", key: "className", width: 10 },
      { header: "Sec", key: "sectionName", width: 8 },
      { header: "Working Days", key: "workingDays", width: 12, align: "center", format: "number" },
      { header: "Present", key: "present", width: 10, align: "center", format: "number" },
      { header: "Absent", key: "absent", width: 10, align: "center", format: "number" },
      { header: "Late", key: "late", width: 10, align: "center", format: "number" },
      { header: "Leave", key: "leave", width: 10, align: "center", format: "number" },
      { header: "Attendance %", key: "attendancePercentage", width: 14, align: "right", format: "percentage" },
    ];

    const summary: ReportSummaryItem[] = [
      { label: "Total Students Evaluated", value: students.length, format: "number", color: "indigo" },
      { label: "Average Attendance", value: averagePct, suffix: "%", format: "percentage", color: "emerald" },
    ];

    return { metadata, columns, summary, rows };
  }

  // =========================================================================
  // 8. STUDENT ATTENDANCE REPORT
  // =========================================================================
  public static async getStudentAttendanceReport(
    context: ReportContext,
    filters: BaseReportFilters
  ): Promise<ReportResult> {
    await connectToDatabase();
    const { schoolId } = context;

    if (!filters.studentId) {
      throw new Error("Student selection is required for Student Attendance Report");
    }

    const student = await Student.findOne({ _id: filters.studentId, schoolId })
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .lean();

    if (!student) {
      throw new Error("Student record not found");
    }

    const query: Record<string, any> = { schoolId, studentId: student._id };
    const filterLabels: Record<string, string> = {
      Student: `${student.firstName} ${student.lastName} (${student.admissionNumber})`,
      Class: `${(student.classId as any)?.name || "Class"} - Sec ${(student.sectionId as any)?.name || "A"}`,
    };

    if (filters.fromDate || filters.toDate) {
      query.date = {};
      if (filters.fromDate) query.date.$gte = new Date(filters.fromDate);
      if (filters.toDate) {
        const toD = new Date(filters.toDate);
        toD.setHours(23, 59, 59, 999);
        query.date.$lte = toD;
      }
    }

    const records = await Attendance.find(query)
      .populate("markedBy", "firstName lastName email name")
      .sort({ date: -1 })
      .lean();

    let present = 0;
    let absent = 0;
    let late = 0;
    let leave = 0;

    const rows = records.map((a: any) => {
      if (a.status === "PRESENT") present++;
      else if (a.status === "ABSENT") absent++;
      else if (a.status === "LATE") late++;
      else if (a.status === "LEAVE") leave++;

      const marker = a.markedBy as any;
      const markerName = marker?.name || `${marker?.firstName || ""} ${marker?.lastName || ""}`.trim() || "Staff";

      return {
        id: a._id.toString(),
        date: new Date(a.date).toLocaleDateString("en-IN"),
        dayOfWeek: new Date(a.date).toLocaleDateString("en-US", { weekday: "short" }),
        status: a.status,
        remarks: a.remarks || "—",
        recordedBy: markerName,
      };
    });

    const totalDays = records.length;
    const attPct = calculateAttendancePercentage(present + late, totalDays);

    const metadata = await getSchoolMetadata(
      schoolId,
      "ATTENDANCE",
      "student-history",
      `Student Attendance History: ${student.firstName} ${student.lastName}`,
      "Individual attendance ledger with session dates, status marks, remarks, and aggregate attendance rates.",
      filterLabels,
      context.userName
    );

    const columns: ReportColumn[] = [
      { header: "Date", key: "date", width: 14, align: "center" },
      { header: "Day", key: "dayOfWeek", width: 10, align: "center" },
      { header: "Status", key: "status", width: 12, align: "center" },
      { header: "Remarks", key: "remarks", width: 24 },
      { header: "Recorded By", key: "recordedBy", width: 18 },
    ];

    const summary: ReportSummaryItem[] = [
      { label: "Working Days Marked", value: totalDays, format: "number", color: "slate" },
      { label: "Present Days", value: present, format: "number", color: "emerald" },
      { label: "Absent Days", value: absent, format: "number", color: "rose" },
      { label: "Late Days", value: late, format: "number", color: "amber" },
      { label: "Leave Days", value: leave, format: "number", color: "blue" },
      { label: "Attendance %", value: attPct, suffix: "%", format: "percentage", color: "indigo" },
    ];

    return { metadata, columns, summary, rows };
  }

  // =========================================================================
  // 9. CLASS ATTENDANCE REPORT
  // =========================================================================
  public static async getClassAttendanceReport(
    context: ReportContext,
    filters: BaseReportFilters
  ): Promise<ReportResult> {
    return this.getMonthlyAttendanceReport(context, filters);
  }

  // =========================================================================
  // 10. ATTENDANCE PERCENTAGE REPORT
  // =========================================================================
  public static async getAttendancePercentageReport(
    context: ReportContext,
    filters: BaseReportFilters
  ): Promise<ReportResult> {
    const monthlyResult = await this.getMonthlyAttendanceReport(context, filters);
    let rows = monthlyResult.rows;

    const min = typeof filters.minPercentage === "number" ? filters.minPercentage : 0;
    const max = typeof filters.maxPercentage === "number" ? filters.maxPercentage : 100;

    rows = rows.filter((r) => r.attendancePercentage >= min && r.attendancePercentage <= max);

    // Sort descending by percentage
    rows.sort((a, b) => b.attendancePercentage - a.attendancePercentage);

    monthlyResult.rows = rows;
    monthlyResult.metadata.title = `Student Attendance Percentage & Standing Report (${min}% - ${max}%)`;
    monthlyResult.metadata.description = "Factual ranking of students filtered by minimum and maximum attendance percentage thresholds.";

    return monthlyResult;
  }

  // =========================================================================
  // 11. PAID FEES REPORT
  // =========================================================================
  public static async getPaidFeesReport(
    context: ReportContext,
    filters: BaseReportFilters
  ): Promise<ReportResult> {
    await connectToDatabase();
    const { schoolId } = context;

    const query: Record<string, any> = { schoolId, status: "ACTIVE" };
    const filterLabels: Record<string, string> = {};

    if (filters.academicYearId) {
      query.academicYearId = filters.academicYearId;
      const ay = await AcademicYear.findOne({ _id: filters.academicYearId, schoolId }).lean();
      if (ay) filterLabels["Academic Year"] = ay.name;
    }
    if (filters.paymentMethod && filters.paymentMethod !== "ALL") {
      query.paymentMethod = filters.paymentMethod;
      filterLabels["Payment Method"] = filters.paymentMethod;
    }
    if (filters.studentId) {
      query.studentId = filters.studentId;
    }
    if (filters.fromDate || filters.toDate) {
      query.paymentDate = {};
      if (filters.fromDate) {
        query.paymentDate.$gte = new Date(filters.fromDate);
        filterLabels["From Date"] = new Date(filters.fromDate).toLocaleDateString("en-IN");
      }
      if (filters.toDate) {
        const toD = new Date(filters.toDate);
        toD.setHours(23, 59, 59, 999);
        query.paymentDate.$lte = toD;
        filterLabels["To Date"] = new Date(filters.toDate).toLocaleDateString("en-IN");
      }
    }

    const total = await FeePayment.countDocuments(query);
    const page = Math.max(1, filters.page || 1);
    const limit = filters.isExport ? Math.min(total || 1, 5000) : Math.max(1, Math.min(100, filters.limit || 20));
    const skip = (page - 1) * limit;

    const payments = await FeePayment.find(query)
      .populate("studentId", "firstName lastName admissionNumber rollNumber classId sectionId")
      .populate("recordedBy", "firstName lastName name email")
      .sort({ paymentDate: -1, createdAt: -1 })
      .skip(filters.isExport ? 0 : skip)
      .limit(limit)
      .lean();

    // Populate class/section info on student
    const classIds = payments.map((p: any) => p.studentId?.classId).filter(Boolean);
    const classes = await Class.find({ _id: { $in: classIds } }).lean();
    const classMap = new Map(classes.map((c) => [c._id.toString(), c.name]));

    const sectionIds = payments.map((p: any) => p.studentId?.sectionId).filter(Boolean);
    const sections = await Section.find({ _id: { $in: sectionIds } }).lean();
    const sectionMap = new Map(sections.map((s) => [s._id.toString(), s.name]));

    let totalAmount = 0;
    const rows = payments.map((p: any) => {
      const s = p.studentId || {};
      const recorder = p.recordedBy as any;
      const recorderName = recorder?.name || `${recorder?.firstName || ""} ${recorder?.lastName || ""}`.trim() || "Finance Staff";

      totalAmount += p.amount || 0;

      return {
        id: p._id.toString(),
        receiptNumber: p.receiptNumber,
        studentName: `${s.firstName || ""} ${s.lastName || ""}`.trim() || "Student",
        admissionNumber: s.admissionNumber || "—",
        className: classMap.get(s.classId?.toString()) || "—",
        sectionName: sectionMap.get(s.sectionId?.toString()) || "—",
        amount: p.amount,
        paymentDate: p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("en-IN") : "—",
        paymentMethod: p.paymentMethod,
        transactionId: p.transactionId || "—",
        recordedBy: recorderName,
      };
    });

    const totalRevenueAgg = await FeePayment.aggregate([
      { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), status: "ACTIVE" } },
      { $group: { _id: null, totalSum: { $sum: "$amount" } } },
    ]);
    const overallRevenue = totalRevenueAgg[0]?.totalSum || 0;

    const metadata = await getSchoolMetadata(
      schoolId,
      "FEE",
      "paid",
      "Fee Receipts & Realized Collections Report",
      "Itemized journal of received student fee payments, receipt numbers, payment channels, and audit trails.",
      filterLabels,
      context.userName
    );

    const columns: ReportColumn[] = [
      { header: "Receipt No", key: "receiptNumber", width: 16 },
      { header: "Student Name", key: "studentName", width: 22 },
      { header: "Admission No", key: "admissionNumber", width: 14 },
      { header: "Class", key: "className", width: 10 },
      { header: "Sec", key: "sectionName", width: 8 },
      { header: "Amount (₹)", key: "amount", width: 14, align: "right", format: "currency" },
      { header: "Date", key: "paymentDate", width: 14, align: "center" },
      { header: "Method", key: "paymentMethod", width: 14, align: "center" },
      { header: "Txn / Ref", key: "transactionId", width: 16 },
    ];

    const summary: ReportSummaryItem[] = [
      { label: "Total Transactions", value: total, format: "number", color: "slate" },
      { label: "Report Total Realized", value: totalAmount, prefix: "₹", format: "currency", color: "emerald" },
      { label: "School Lifetime Collection", value: overallRevenue, prefix: "₹", format: "currency", color: "indigo" },
    ];

    return {
      metadata,
      columns,
      summary,
      rows,
      pagination: filters.isExport
        ? undefined
        : { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  // =========================================================================
  // 12. PENDING FEES REPORT
  // =========================================================================
  public static async getPendingFeesReport(
    context: ReportContext,
    filters: BaseReportFilters
  ): Promise<ReportResult> {
    await connectToDatabase();
    const { schoolId } = context;

    const accountQuery: Record<string, any> = {
      schoolId,
      pendingAmount: { $gt: 0 },
    };
    const filterLabels: Record<string, string> = {};

    if (filters.academicYearId) accountQuery.academicYearId = filters.academicYearId;
    if (filters.status && filters.status !== "ALL") {
      accountQuery.status = filters.status;
      filterLabels["Status"] = filters.status;
    }

    const studentFilter: Record<string, any> = { schoolId };
    if (filters.classId) studentFilter.classId = filters.classId;
    if (filters.sectionId) studentFilter.sectionId = filters.sectionId;

    const matchingStudents = await Student.find(studentFilter)
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .lean();

    const studentMap = new Map(matchingStudents.map((s) => [s._id.toString(), s]));
    accountQuery.studentId = { $in: Array.from(studentMap.keys()) };

    const total = await StudentFeeAccount.countDocuments(accountQuery);
    const page = Math.max(1, filters.page || 1);
    const limit = filters.isExport ? Math.min(total || 1, 5000) : Math.max(1, Math.min(100, filters.limit || 20));
    const skip = (page - 1) * limit;

    const accounts = await StudentFeeAccount.find(accountQuery)
      .sort({ pendingAmount: -1 })
      .skip(filters.isExport ? 0 : skip)
      .limit(limit)
      .lean();

    let totalPendingSum = 0;
    const rows = accounts.map((acc: any) => {
      const s = studentMap.get(acc.studentId.toString()) as any;
      totalPendingSum += acc.pendingAmount || 0;

      return {
        id: acc._id.toString(),
        studentName: `${s?.firstName || ""} ${s?.lastName || ""}`.trim() || "Student",
        admissionNumber: s?.admissionNumber || "—",
        className: s?.classId?.name || "—",
        sectionName: s?.sectionId?.name || "—",
        totalFee: acc.totalFee || 0,
        paidAmount: acc.paidAmount || 0,
        pendingAmount: acc.pendingAmount || 0,
        status: acc.status,
      };
    });

    const metadata = await getSchoolMetadata(
      schoolId,
      "FEE",
      "pending",
      "Outstanding Fee Balances & Dues Registry",
      "Ledger of student fee accounts with outstanding pending balances and payment statuses.",
      filterLabels,
      context.userName
    );

    const columns: ReportColumn[] = [
      { header: "Admission No", key: "admissionNumber", width: 14 },
      { header: "Student Name", key: "studentName", width: 22 },
      { header: "Class", key: "className", width: 12 },
      { header: "Section", key: "sectionName", width: 10 },
      { header: "Total Fee (₹)", key: "totalFee", width: 14, align: "right", format: "currency" },
      { header: "Paid (₹)", key: "paidAmount", width: 14, align: "right", format: "currency" },
      { header: "Pending (₹)", key: "pendingAmount", width: 14, align: "right", format: "currency" },
      { header: "Status", key: "status", width: 12, align: "center" },
    ];

    const summary: ReportSummaryItem[] = [
      { label: "Total Defaulter Accounts", value: total, format: "number", color: "amber" },
      { label: "Total Outstanding Balance", value: totalPendingSum, prefix: "₹", format: "currency", color: "rose" },
    ];

    return {
      metadata,
      columns,
      summary,
      rows,
      pagination: filters.isExport
        ? undefined
        : { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  // =========================================================================
  // 13. DEFAULTERS REPORT
  // =========================================================================
  public static async getDefaultersReport(
    context: ReportContext,
    filters: BaseReportFilters
  ): Promise<ReportResult> {
    const pendingReport = await this.getPendingFeesReport(context, { ...filters, status: "OVERDUE" });
    pendingReport.metadata.title = "Fee Defaulters & Overdue Delinquency Report";
    pendingReport.metadata.description = "Students with overdue unpaid fee installments exceeding permissible due dates.";
    return pendingReport;
  }

  // =========================================================================
  // 14. COLLECTION REPORT
  // =========================================================================
  public static async getCollectionReport(
    context: ReportContext,
    filters: BaseReportFilters
  ): Promise<ReportResult> {
    await connectToDatabase();
    const { schoolId } = context;

    const query: Record<string, any> = { schoolId, status: "ACTIVE" };
    const filterLabels: Record<string, string> = {};

    if (filters.fromDate || filters.toDate) {
      query.paymentDate = {};
      if (filters.fromDate) {
        query.paymentDate.$gte = new Date(filters.fromDate);
        filterLabels["From Date"] = new Date(filters.fromDate).toLocaleDateString("en-IN");
      }
      if (filters.toDate) {
        const toD = new Date(filters.toDate);
        toD.setHours(23, 59, 59, 999);
        query.paymentDate.$lte = toD;
        filterLabels["To Date"] = new Date(filters.toDate).toLocaleDateString("en-IN");
      }
    }

    const payments = await FeePayment.find(query).lean();
    const totalTransactions = payments.length;
    const totalCollection = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const avgTicket = totalTransactions > 0 ? Math.round(totalCollection / totalTransactions) : 0;

    // Group by Method
    const methodMap = new Map<string, { count: number; total: number }>();
    for (const p of payments) {
      const m = p.paymentMethod || "OTHER";
      if (!methodMap.has(m)) methodMap.set(m, { count: 0, total: 0 });
      const entry = methodMap.get(m)!;
      entry.count++;
      entry.total += p.amount || 0;
    }

    const rows = Array.from(methodMap.entries()).map(([method, data]) => ({
      paymentMethod: method,
      transactionCount: data.count,
      totalAmount: data.total,
      sharePercentage: totalCollection > 0 ? Number(((data.total / totalCollection) * 100).toFixed(1)) : 0,
    }));

    const metadata = await getSchoolMetadata(
      schoolId,
      "FEE",
      "collection",
      "Fee Collection & Revenue Aggregation Report",
      "Summary of fee collections segmented by payment channels, total intake, and volume distribution.",
      filterLabels,
      context.userName
    );

    const columns: ReportColumn[] = [
      { header: "Payment Method / Channel", key: "paymentMethod", width: 24 },
      { header: "No. of Payments", key: "transactionCount", width: 18, align: "center", format: "number" },
      { header: "Total Realized (₹)", key: "totalAmount", width: 22, align: "right", format: "currency" },
      { header: "Volume Share (%)", key: "sharePercentage", width: 18, align: "right", format: "percentage" },
    ];

    const summary: ReportSummaryItem[] = [
      { label: "Total Realized Revenue", value: totalCollection, prefix: "₹", format: "currency", color: "emerald" },
      { label: "Total Transactions", value: totalTransactions, format: "number", color: "indigo" },
      { label: "Average Transaction", value: avgTicket, prefix: "₹", format: "currency", color: "slate" },
    ];

    return { metadata, columns, summary, rows };
  }

  // =========================================================================
  // 15. PAYMENT HISTORY REPORT
  // =========================================================================
  public static async getPaymentHistoryReport(
    context: ReportContext,
    filters: BaseReportFilters
  ): Promise<ReportResult> {
    if (!filters.studentId) {
      throw new Error("Student selection is required for Payment History Report");
    }
    return this.getPaidFeesReport(context, filters);
  }

  // =========================================================================
  // 16. EXAM RESULTS REPORT
  // =========================================================================
  public static async getExamResultsReport(
    context: ReportContext,
    filters: BaseReportFilters
  ): Promise<ReportResult> {
    await connectToDatabase();
    const { schoolId } = context;

    const query: Record<string, any> = { schoolId };
    const filterLabels: Record<string, string> = {};

    if (filters.examId) {
      query.examId = filters.examId;
      const exam = await Exam.findOne({ _id: filters.examId, schoolId }).lean();
      if (exam) filterLabels["Exam"] = exam.name;
    }
    if (filters.academicYearId) query.academicYearId = filters.academicYearId;
    if (filters.classId) query.classId = filters.classId;
    if (filters.sectionId) query.sectionId = filters.sectionId;
    if (filters.subjectId) query.subjectId = filters.subjectId;
    if (filters.studentId) query.studentId = filters.studentId;

    const results = await ExamResult.find(query)
      .populate("studentId", "firstName lastName admissionNumber rollNumber")
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .populate("subjectId", "name code")
      .populate("examId", "name")
      .populate("examSubjectId", "maximumMarks passingMarks")
      .sort({ classId: 1, sectionId: 1, "studentId.rollNumber": 1 })
      .lean();

    const total = results.length;
    let passedCount = 0;
    let failedCount = 0;

    const rows = results.map((r: any) => {
      const s = r.studentId || {};
      const sub = r.subjectId || {};
      const es = r.examSubjectId || {};
      const maxMarks = es.maximumMarks || 100;
      const marks = r.marks !== null && r.marks !== undefined ? r.marks : null;
      const pct = marks !== null && maxMarks > 0 ? Number(((marks / maxMarks) * 100).toFixed(1)) : null;

      if (r.isPassed) passedCount++;
      else failedCount++;

      return {
        id: r._id.toString(),
        studentName: `${s.firstName || ""} ${s.lastName || ""}`.trim() || "Student",
        admissionNumber: s.admissionNumber || "—",
        rollNumber: s.rollNumber || "—",
        className: r.classId?.name || "—",
        sectionName: r.sectionId?.name || "—",
        subjectName: sub.name || "—",
        marks: marks !== null ? marks : "Absent",
        maximumMarks: maxMarks,
        percentage: pct !== null ? `${pct}%` : "—",
        grade: r.grade || "F",
        passFail: r.isPassed ? "PASS" : "FAIL",
      };
    });

    const metadata = await getSchoolMetadata(
      schoolId,
      "ACADEMIC",
      "exam-results",
      "Examination Marks & Performance Roster",
      "Official academic grade sheet detailing obtained scores, maximum marks, percentage, and grading results.",
      filterLabels,
      context.userName
    );

    const columns: ReportColumn[] = [
      { header: "Roll No", key: "rollNumber", width: 10, align: "center" },
      { header: "Admission No", key: "admissionNumber", width: 14 },
      { header: "Student Name", key: "studentName", width: 22 },
      { header: "Class", key: "className", width: 10 },
      { header: "Sec", key: "sectionName", width: 8 },
      { header: "Subject", key: "subjectName", width: 18 },
      { header: "Marks", key: "marks", width: 10, align: "right" },
      { header: "Max", key: "maximumMarks", width: 10, align: "right", format: "number" },
      { header: "Pct", key: "percentage", width: 12, align: "right" },
      { header: "Grade", key: "grade", width: 10, align: "center" },
      { header: "Result", key: "passFail", width: 12, align: "center" },
    ];

    const summary: ReportSummaryItem[] = [
      { label: "Evaluated Papers", value: total, format: "number", color: "slate" },
      { label: "Passed", value: passedCount, format: "number", color: "emerald" },
      { label: "Failed", value: failedCount, format: "number", color: "rose" },
    ];

    return { metadata, columns, summary, rows };
  }

  // =========================================================================
  // 17. CLASS PERFORMANCE REPORT
  // =========================================================================
  public static async getClassPerformanceReport(
    context: ReportContext,
    filters: BaseReportFilters
  ): Promise<ReportResult> {
    await connectToDatabase();
    const { schoolId } = context;

    const query: Record<string, any> = { schoolId };
    const filterLabels: Record<string, string> = {};

    if (filters.examId) {
      query.examId = filters.examId;
      const exam = await Exam.findOne({ _id: filters.examId, schoolId }).lean();
      if (exam) filterLabels["Exam"] = exam.name;
    }
    if (filters.classId) query.classId = filters.classId;
    if (filters.sectionId) query.sectionId = filters.sectionId;

    const results = await ExamResult.find(query)
      .populate("subjectId", "name code")
      .populate("classId", "name")
      .populate("sectionId", "name")
      .populate("examSubjectId", "maximumMarks")
      .lean();

    // Group by Subject
    const subjectStatsMap = new Map<
      string,
      { subjectName: string; count: number; totalMarks: number; maxTotal: number; passCount: number; highest: number; lowest: number }
    >();

    for (const r of results) {
      const sub = r.subjectId as any;
      const subId = sub?._id?.toString() || "unknown";
      const maxMarks = (r.examSubjectId as any)?.maximumMarks || 100;
      const marks = r.marks !== null && r.marks !== undefined ? r.marks : 0;

      if (!subjectStatsMap.has(subId)) {
        subjectStatsMap.set(subId, {
          subjectName: sub?.name || "Subject",
          count: 0,
          totalMarks: 0,
          maxTotal: 0,
          passCount: 0,
          highest: marks,
          lowest: marks,
        });
      }

      const stat = subjectStatsMap.get(subId)!;
      stat.count++;
      stat.totalMarks += marks;
      stat.maxTotal += maxMarks;
      if (r.isPassed) stat.passCount++;
      if (marks > stat.highest) stat.highest = marks;
      if (marks < stat.lowest) stat.lowest = marks;
    }

    const rows = Array.from(subjectStatsMap.values()).map((s) => {
      const avgPct = s.maxTotal > 0 ? Number(((s.totalMarks / s.maxTotal) * 100).toFixed(1)) : 0;
      const passPct = s.count > 0 ? Number(((s.passCount / s.count) * 100).toFixed(1)) : 0;
      return {
        subjectName: s.subjectName,
        studentCount: s.count,
        averagePercentage: avgPct,
        passCount: s.passCount,
        passPercentage: passPct,
        highestMarks: s.highest,
        lowestMarks: s.lowest,
      };
    });

    const metadata = await getSchoolMetadata(
      schoolId,
      "ACADEMIC",
      "class-performance",
      "Cohort Academic Performance & Subject Diagnostic",
      "Class-level statistical distribution of exam scores, passing rates, and subject proficiency analytics.",
      filterLabels,
      context.userName
    );

    const columns: ReportColumn[] = [
      { header: "Subject", key: "subjectName", width: 22 },
      { header: "Assessed Students", key: "studentCount", width: 18, align: "center", format: "number" },
      { header: "Average %", key: "averagePercentage", width: 16, align: "right", format: "percentage" },
      { header: "Passing Count", key: "passCount", width: 14, align: "center", format: "number" },
      { header: "Passing Rate (%)", key: "passPercentage", width: 16, align: "right", format: "percentage" },
      { header: "Highest Score", key: "highestMarks", width: 14, align: "right", format: "number" },
      { header: "Lowest Score", key: "lowestMarks", width: 14, align: "right", format: "number" },
    ];

    return { metadata, columns, rows };
  }

  // =========================================================================
  // 18. STUDENT PERFORMANCE REPORT
  // =========================================================================
  public static async getStudentPerformanceReport(
    context: ReportContext,
    filters: BaseReportFilters
  ): Promise<ReportResult> {
    if (!filters.studentId) {
      throw new Error("Student selection is required for Student Performance Report");
    }
    return this.getExamResultsReport(context, filters);
  }

  // =========================================================================
  // 19. SUBJECT PERFORMANCE REPORT
  // =========================================================================
  public static async getSubjectPerformanceReport(
    context: ReportContext,
    filters: BaseReportFilters
  ): Promise<ReportResult> {
    return this.getExamResultsReport(context, filters);
  }
}
