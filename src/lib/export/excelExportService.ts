import Student from "@/models/Student";
import Teacher from "@/models/Teacher";
import Parent from "@/models/Parent";
import StudentParent from "@/models/StudentParent";
import School from "@/models/School";
import { ReportServices } from "@/lib/reports/reportServices";
import { ReportExportService } from "@/lib/reports/reportExportService";
import { ReportResult, ReportContext } from "@/lib/reports/types";

export interface ExportFilterParams {
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  status?: string;
  gender?: string;
  department?: string;
  examId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export class ExcelExportService {
  /**
   * Dispatches and generates an Excel (.xlsx) buffer for any of the 7 supported export types.
   */
  public static async generateExportBuffer(
    type: "students" | "teachers" | "parents" | "attendance" | "fees" | "results" | "reports",
    schoolId: string,
    filters: ExportFilterParams = {},
    user: { id: string; role: string }
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const school = await School.findById(schoolId).lean();
    const schoolName = school?.name || "School ERP";
    const dateStr = new Date().toISOString().slice(0, 10);

    const reportContext: ReportContext = {
      userId: user.id,
      userRole: user.role,
      schoolId,
    };

    switch (type) {
      case "students": {
        const result = await this.buildStudentsExportData(schoolId, schoolName, filters);
        const buffer = await ReportExportService.generateExcelBuffer(result);
        return { buffer, fileName: `students-export-${dateStr}.xlsx` };
      }
      case "teachers": {
        const result = await this.buildTeachersExportData(schoolId, schoolName, filters);
        const buffer = await ReportExportService.generateExcelBuffer(result);
        return { buffer, fileName: `teachers-export-${dateStr}.xlsx` };
      }
      case "parents": {
        const result = await this.buildParentsExportData(schoolId, schoolName, filters);
        const buffer = await ReportExportService.generateExcelBuffer(result);
        return { buffer, fileName: `parents-export-${dateStr}.xlsx` };
      }
      case "attendance": {
        // Reuse A10 Daily Attendance report
        const result = await ReportServices.getDailyAttendanceReport(reportContext, {
          date: filters.date || dateStr,
          classId: filters.classId,
          sectionId: filters.sectionId,
        });
        const buffer = await ReportExportService.generateExcelBuffer(result);
        return { buffer, fileName: `attendance-export-${dateStr}.xlsx` };
      }
      case "fees": {
        // Reuse A10 Collection report
        const result = await ReportServices.getCollectionReport(reportContext, {
          academicYearId: filters.academicYearId,
          fromDate: filters.startDate,
          toDate: filters.endDate,
        });
        const buffer = await ReportExportService.generateExcelBuffer(result);
        return { buffer, fileName: `fees-collection-export-${dateStr}.xlsx` };
      }
      case "results": {
        // Reuse A10 Exam Results report
        const result = await ReportServices.getExamResultsReport(reportContext, {
          examId: filters.examId,
          classId: filters.classId,
          sectionId: filters.sectionId,
        });
        const buffer = await ReportExportService.generateExcelBuffer(result);
        return { buffer, fileName: `results-export-${dateStr}.xlsx` };
      }
      case "reports":
      default: {
        const result = await ReportServices.getStudentListReport(reportContext, {
          academicYearId: filters.academicYearId,
          classId: filters.classId,
          sectionId: filters.sectionId,
        });
        const buffer = await ReportExportService.generateExcelBuffer(result);
        return { buffer, fileName: `general-report-${dateStr}.xlsx` };
      }
    }
  }

  // --- 1. Students Export Data Builder ---
  private static async buildStudentsExportData(
    schoolId: string,
    schoolName: string,
    filters: ExportFilterParams
  ): Promise<ReportResult> {
    const query: Record<string, any> = { schoolId };
    if (filters.academicYearId) query.academicYearId = filters.academicYearId;
    if (filters.classId) query.classId = filters.classId;
    if (filters.sectionId) query.sectionId = filters.sectionId;
    if (filters.status && filters.status !== "ALL") query.status = filters.status;
    if (filters.gender && filters.gender !== "ALL") query.gender = filters.gender;

    if (filters.search) {
      const regex = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ firstName: regex }, { lastName: regex }, { admissionNumber: regex }, { email: regex }];
    }

    const students = await Student.find(query)
      .populate("academicYearId", "name")
      .populate("classId", "name")
      .populate("sectionId", "name")
      .sort({ admissionNumber: 1 })
      .lean();

    const rows = students.map((s: any) => ({
      admissionNumber: s.admissionNumber,
      studentId: s.studentId || s.admissionNumber,
      fullName: `${s.firstName} ${s.lastName}`.trim(),
      gender: s.gender,
      dateOfBirth: s.dateOfBirth ? new Date(s.dateOfBirth).toISOString().slice(0, 10) : "—",
      className: (s.classId as any)?.name || "—",
      sectionName: (s.sectionId as any)?.name || "—",
      rollNumber: s.rollNumber || "—",
      phone: s.phone || "—",
      email: s.email || "—",
      status: s.status,
      admissionDate: s.admissionDate ? new Date(s.admissionDate).toISOString().slice(0, 10) : "—",
    }));

    return {
      metadata: {
        title: "Student Master Export",
        category: "STUDENT",
        reportType: "student-list",
        schoolName,
        description: "Export of all enrolled students matching filters",
        generatedAt: new Date().toLocaleString(),
        filtersApplied: { Status: filters.status || "ALL", Total: String(students.length) },
      },
      columns: [
        { key: "admissionNumber", header: "Admission No", align: "left", width: 16 },
        { key: "studentId", header: "Student ID", align: "left", width: 14 },
        { key: "fullName", header: "Student Name", align: "left", width: 24 },
        { key: "gender", header: "Gender", align: "center", width: 12 },
        { key: "dateOfBirth", header: "DOB", align: "center", width: 14 },
        { key: "className", header: "Class", align: "left", width: 14 },
        { key: "sectionName", header: "Section", align: "center", width: 10 },
        { key: "rollNumber", header: "Roll #", align: "center", width: 10 },
        { key: "phone", header: "Phone", align: "left", width: 16 },
        { key: "email", header: "Email", align: "left", width: 26 },
        { key: "status", header: "Status", align: "center", format: "text", width: 12 },
        { key: "admissionDate", header: "Admission Date", align: "center", width: 16 },
      ],
      rows,
      summary: [{ label: "Total Students Exported", value: students.length }],
    };
  }

  // --- 2. Teachers Export Data Builder ---
  private static async buildTeachersExportData(
    schoolId: string,
    schoolName: string,
    filters: ExportFilterParams
  ): Promise<ReportResult> {
    const query: Record<string, any> = { schoolId };
    if (filters.status && filters.status !== "ALL") query.status = filters.status;
    if (filters.department && filters.department !== "ALL") query.department = filters.department;

    if (filters.search) {
      const regex = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ firstName: regex }, { lastName: regex }, { teacherId: regex }, { employeeId: regex }, { email: regex }];
    }

    const teachers = await Teacher.find(query).sort({ teacherId: 1 }).lean();

    const rows = teachers.map((t: any) => ({
      teacherId: t.teacherId,
      employeeId: t.employeeId || "—",
      fullName: [t.firstName, t.middleName, t.lastName].filter(Boolean).join(" "),
      gender: t.gender,
      department: t.department || "—",
      designation: t.designation || "Teacher",
      qualification: t.qualification || "—",
      phone: t.phone || "—",
      email: t.email || "—",
      joiningDate: t.joiningDate ? new Date(t.joiningDate).toISOString().slice(0, 10) : "—",
      status: t.status,
    }));

    return {
      metadata: {
        title: "Teacher & Staff Directory Export",
        category: "STUDENT",
        reportType: "student-list",
        schoolName,
        description: "Export of all staff and faculty profiles",
        generatedAt: new Date().toLocaleString(),
        filtersApplied: { Department: filters.department || "ALL", Status: filters.status || "ALL" },
      },
      columns: [
        { key: "teacherId", header: "Teacher ID", align: "left", width: 14 },
        { key: "employeeId", header: "Employee ID", align: "left", width: 14 },
        { key: "fullName", header: "Full Name", align: "left", width: 24 },
        { key: "gender", header: "Gender", align: "center", width: 10 },
        { key: "department", header: "Department", align: "left", width: 18 },
        { key: "designation", header: "Designation", align: "left", width: 18 },
        { key: "qualification", header: "Qualification", align: "left", width: 20 },
        { key: "phone", header: "Phone", align: "left", width: 16 },
        { key: "email", header: "Email", align: "left", width: 26 },
        { key: "joiningDate", header: "Joining Date", align: "center", width: 14 },
        { key: "status", header: "Status", align: "center", format: "text", width: 12 },
      ],
      rows,
      summary: [{ label: "Total Teachers Exported", value: teachers.length }],
    };
  }

  // --- 3. Parents Export Data Builder ---
  private static async buildParentsExportData(
    schoolId: string,
    schoolName: string,
    filters: ExportFilterParams
  ): Promise<ReportResult> {
    const query: Record<string, any> = { schoolId };
    if (filters.status && filters.status !== "ALL") query.status = filters.status;

    if (filters.search) {
      const regex = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }, { phone: regex }];
    }

    const parents = await Parent.find(query).sort({ firstName: 1 }).lean();
    const parentIds = parents.map((p) => p._id);

    // Fetch linked children
    const links = await StudentParent.find({ schoolId, parentId: { $in: parentIds } })
      .populate("studentId", "admissionNumber firstName lastName")
      .lean();

    const linkMap = new Map<string, string[]>();
    links.forEach((l: any) => {
      const pId = l.parentId.toString();
      const s = l.studentId;
      if (s) {
        const list = linkMap.get(pId) || [];
        list.push(`${s.firstName} ${s.lastName} (${s.admissionNumber})`);
        linkMap.set(pId, list);
      }
    });

    const rows = parents.map((p: any) => {
      const children = linkMap.get(p._id.toString()) || [];
      return {
        fullName: `${p.firstName} ${p.lastName}`.trim(),
        email: p.email,
        phone: p.phone,
        relationship: p.relationship,
        occupation: p.occupation || "—",
        linkedChildren: children.join(", ") || "None",
        city: p.address?.city || "—",
        status: p.status,
      };
    });

    return {
      metadata: {
        title: "Parent & Guardian Directory Export",
        category: "STUDENT",
        reportType: "student-list",
        schoolName,
        description: "Export of all parent profiles with child links",
        generatedAt: new Date().toLocaleString(),
        filtersApplied: { Status: filters.status || "ALL" },
      },
      columns: [
        { key: "fullName", header: "Parent Name", align: "left", width: 22 },
        { key: "relationship", header: "Relationship", align: "center", width: 14 },
        { key: "email", header: "Email Address", align: "left", width: 26 },
        { key: "phone", header: "Phone Number", align: "left", width: 16 },
        { key: "occupation", header: "Occupation", align: "left", width: 20 },
        { key: "linkedChildren", header: "Linked Students", align: "left", width: 34 },
        { key: "city", header: "City", align: "left", width: 16 },
        { key: "status", header: "Status", align: "center", format: "text", width: 12 },
      ],
      rows,
      summary: [{ label: "Total Parents Exported", value: parents.length }],
    };
  }
}
