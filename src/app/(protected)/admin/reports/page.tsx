"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Users,
  CalendarCheck,
  CreditCard,
  GraduationCap,
  Download,
  Printer,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";
import {
  ReportCategory,
  ReportType,
  ReportResult,
  ReportColumn,
  ReportSummaryItem,
} from "@/lib/reports/types";

interface OptionItem {
  id: string;
  name: string;
  code?: string;
}

const REPORT_CATALOG = [
  {
    category: "STUDENT" as ReportCategory,
    label: "Student Reports",
    icon: Users,
    reports: [
      { id: "student-list", name: "Student Directory", desc: "Complete nominal roll with current class placements and parent contacts" },
      { id: "class-list", name: "Class Roster", desc: "Class-wise nominal list ordered by ascending numeric roll numbers" },
      { id: "student-profile", name: "Student Profile", desc: "Comprehensive 360° summary of an individual student record" },
      { id: "admission", name: "New Admissions", desc: "Intake register of newly admitted students across date windows" },
      { id: "transfer", name: "Transfer Register", desc: "Official migration log with transfer certificates and target schools" },
    ],
  },
  {
    category: "ATTENDANCE" as ReportCategory,
    label: "Attendance Reports",
    icon: CalendarCheck,
    reports: [
      { id: "daily", name: "Daily Attendance", desc: "Daily class-wise attendance register with presenter counts" },
      { id: "monthly", name: "Monthly Attendance", desc: "Student monthly tally of working days, presence, and rates" },
      { id: "student-history", name: "Student Attendance History", desc: "Individual attendance timeline and absence reasons" },
      { id: "class-summary", name: "Class Summary", desc: "Cohort attendance rate distribution across sections" },
      { id: "percentage-ranking", name: "Percentage Ranking", desc: "Factual ranking based on minimum and maximum attendance rates" },
    ],
  },
  {
    category: "FEE" as ReportCategory,
    label: "Fee Reports",
    icon: CreditCard,
    reports: [
      { id: "paid", name: "Paid Fees & Receipts", desc: "Itemized journal of received student fee payments and receipts" },
      { id: "pending", name: "Pending Fee Dues", desc: "Ledger of students with outstanding balances and pending amounts" },
      { id: "defaulters", name: "Overdue Defaulters", desc: "Students with overdue unpaid fee installments past grace dates" },
      { id: "collection", name: "Revenue Collection", desc: "Realized collections aggregated by payment channels and periods" },
      { id: "student-payments", name: "Student Payment History", desc: "Individual payment ledger and receipts history" },
    ],
  },
  {
    category: "ACADEMIC" as ReportCategory,
    label: "Academic Reports",
    icon: GraduationCap,
    reports: [
      { id: "exam-results", name: "Exam Marks Roster", desc: "Official academic grade sheet with subject scores and grades" },
      { id: "class-performance", name: "Class Performance Diagnostic", desc: "Class-level score distribution, passing rates, and averages" },
      { id: "student-performance", name: "Student Grade Card Summary", desc: "Individual term/exam report with GPA and subject status" },
      { id: "subject-performance", name: "Subject Diagnostic", desc: "Comparative subject metrics across student cohorts" },
    ],
  },
];

export default function AdminReportsPage() {
  const [activeCategory, setActiveCategory] = useState<ReportCategory>("STUDENT");
  const [selectedReportType, setSelectedReportType] = useState<ReportType>("student-list");

  // Metadata dropdowns
  const [academicYears, setAcademicYears] = useState<OptionItem[]>([]);
  const [classes, setClasses] = useState<OptionItem[]>([]);
  const [sections, setSections] = useState<OptionItem[]>([]);
  const [students, setStudents] = useState<OptionItem[]>([]);
  const [exams, setExams] = useState<OptionItem[]>([]);
  const [subjects, setSubjects] = useState<OptionItem[]>([]);

  // Filter States
  const [academicYearId, setAcademicYearId] = useState<string>("");
  const [classId, setClassId] = useState<string>("");
  const [sectionId, setSectionId] = useState<string>("");
  const [studentId, setStudentId] = useState<string>("");
  const [examId, setExamId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [status, setStatus] = useState<string>("ALL");
  const [paymentMethod, setPaymentMethod] = useState<string>("ALL");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [minPercentage, setMinPercentage] = useState<string>("");
  const [maxPercentage, setMaxPercentage] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);

  // Data & State
  const [reportData, setReportData] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial dropdown options
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [yearsRes, classesRes, examsRes, subjectsRes] = await Promise.all([
          fetch("/api/admin/academic-years"),
          fetch("/api/admin/classes"),
          fetch("/api/admin/exams"),
          fetch("/api/admin/subjects"),
        ]);

        const [yearsData, classesData, examsData, subjectsData] = await Promise.all([
          yearsRes.json(),
          classesRes.json(),
          examsRes.json(),
          subjectsRes.json(),
        ]);

        if (yearsData.success && yearsData.data?.academicYears) {
          const list = yearsData.data.academicYears.map((y: any) => ({
            id: y.id || y._id,
            name: y.name + (y.status === "ACTIVE" ? " (Current)" : ""),
          }));
          setAcademicYears(list);
          const current = yearsData.data.academicYears.find((y: any) => y.status === "ACTIVE");
          if (current) setAcademicYearId(current.id || current._id);
        }

        if (classesData.success && classesData.data?.classes) {
          setClasses(
            classesData.data.classes.map((c: any) => ({
              id: c.id || c._id,
              name: c.name + (c.code ? ` (${c.code})` : ""),
            }))
          );
        }

        if (examsData.success && examsData.data?.exams) {
          setExams(
            examsData.data.exams.map((e: any) => ({
              id: e.id || e._id,
              name: e.name,
            }))
          );
        }

        if (subjectsData.success && subjectsData.data?.subjects) {
          setSubjects(
            subjectsData.data.subjects.map((s: any) => ({
              id: s.id || s._id,
              name: s.name + (s.code ? ` (${s.code})` : ""),
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load initial metadata:", err);
      }
    }
    loadMetadata();
  }, []);

  // Update Sections when Class changes
  useEffect(() => {
    if (!classId) {
      setSections([]);
      setSectionId("");
      return;
    }
    async function loadSections() {
      try {
        const res = await fetch(`/api/admin/classes/${classId}`);
        const data = await res.json();
        if (data.success && data.data?.class?.sections) {
          setSections(
            data.data.class.sections.map((s: any) => ({
              id: s._id || s.id,
              name: `Section ${s.name}`,
            }))
          );
        } else {
          setSections([]);
        }
      } catch (err) {
        console.error("Failed to load sections:", err);
      }
    }
    loadSections();
  }, [classId]);

  // Update Students when Class / Section changes
  useEffect(() => {
    if (!classId) {
      setStudents([]);
      setStudentId("");
      return;
    }
    async function loadStudents() {
      try {
        const params = new URLSearchParams({ classId, limit: "200", status: "ACTIVE" });
        if (sectionId) params.append("sectionId", sectionId);
        const res = await fetch(`/api/admin/students?${params.toString()}`);
        const data = await res.json();
        if (data.success && data.data?.students) {
          setStudents(
            data.data.students.map((s: any) => ({
              id: s.id || s._id,
              name: `${s.firstName} ${s.lastName} (${s.admissionNumber})`,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load students:", err);
      }
    }
    loadStudents();
  }, [classId, sectionId]);

  // Handle Category Change
  const handleCategorySelect = (category: ReportCategory) => {
    setActiveCategory(category);
    const cat = REPORT_CATALOG.find((c) => c.category === category);
    if (cat && cat.reports.length > 0) {
      setSelectedReportType(cat.reports[0].id as ReportType);
    }
    setReportData(null);
    setPage(1);
    setError(null);
  };

  // Build query string
  const getFilterParams = useCallback(
    (customPage?: number) => {
      const params = new URLSearchParams();
      if (academicYearId) params.append("academicYearId", academicYearId);
      if (classId) params.append("classId", classId);
      if (sectionId) params.append("sectionId", sectionId);
      if (studentId) params.append("studentId", studentId);
      if (examId) params.append("examId", examId);
      if (subjectId) params.append("subjectId", subjectId);
      if (status && status !== "ALL") params.append("status", status);
      if (paymentMethod && paymentMethod !== "ALL") params.append("paymentMethod", paymentMethod);
      if (fromDate) params.append("fromDate", fromDate);
      if (toDate) params.append("toDate", toDate);
      if (date) params.append("date", date);
      if (month) params.append("month", month);
      if (minPercentage) params.append("minPercentage", minPercentage);
      if (maxPercentage) params.append("maxPercentage", maxPercentage);
      if (search) params.append("search", search);
      params.append("page", String(customPage || page));
      params.append("limit", String(limit));
      return params;
    },
    [
      academicYearId,
      classId,
      sectionId,
      studentId,
      examId,
      subjectId,
      status,
      paymentMethod,
      fromDate,
      toDate,
      date,
      month,
      minPercentage,
      maxPercentage,
      search,
      page,
      limit,
    ]
  );

  // Generate Report
  const generateReport = async (newPage?: number) => {
    try {
      setLoading(true);
      setError(null);

      const catEndpoint =
        activeCategory === "STUDENT"
          ? "students"
          : activeCategory === "ATTENDANCE"
          ? "attendance"
          : activeCategory === "FEE"
          ? "fees"
          : "academic";

      const params = getFilterParams(newPage);
      const res = await fetch(`/api/admin/reports/${catEndpoint}/${selectedReportType}?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to generate report.");
      }

      setReportData(json.data);
      if (newPage) setPage(newPage);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while generating report.");
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  // Export PDF
  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      const catEndpoint =
        activeCategory === "STUDENT"
          ? "students"
          : activeCategory === "ATTENDANCE"
          ? "attendance"
          : activeCategory === "FEE"
          ? "fees"
          : "academic";

      const params = getFilterParams();
      params.set("format", "pdf");

      const res = await fetch(`/api/admin/reports/${catEndpoint}/${selectedReportType}?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to export PDF report");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedReportType}-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "PDF generation error.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export Excel
  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      const catEndpoint =
        activeCategory === "STUDENT"
          ? "students"
          : activeCategory === "ATTENDANCE"
          ? "attendance"
          : activeCategory === "FEE"
          ? "fees"
          : "academic";

      const params = getFilterParams();
      params.set("format", "excel");

      const res = await fetch(`/api/admin/reports/${catEndpoint}/${selectedReportType}?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to export Excel report");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedReportType}-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "Excel export error.");
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const currentReportDef = REPORT_CATALOG.find((c) => c.category === activeCategory)?.reports.find(
    (r) => r.id === selectedReportType
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ========================================================================= */}
      {/* PRINT-ONLY HEADER */}
      {/* ========================================================================= */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase">
              {reportData?.metadata?.schoolName || "SCHOOL ERP"}
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              {reportData?.metadata?.schoolAddress || "Official Institutional Record"}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 font-mono block">
              Generated: {reportData?.metadata?.generatedAt || new Date().toLocaleDateString("en-IN")}
            </span>
            <span className="text-xs font-bold text-indigo-700 uppercase">
              {reportData?.metadata?.title}
            </span>
          </div>
        </div>
      </div>

      {/* Screen Header */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-indigo-600" />
            Reports Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Generate and export institutional registries, attendance matrices, fee ledgers, and academic scorecards.
          </p>
        </div>

        {reportData && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-xs transition"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition disabled:opacity-50"
            >
              {isExportingPdf ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              PDF Export
            </button>
            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition disabled:opacity-50"
            >
              {isExportingExcel ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5" />
              )}
              Excel Export
            </button>
          </div>
        )}
      </div>

      {/* Category Navigation Bar */}
      <div className="print:hidden flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-2 scrollbar-none">
        {REPORT_CATALOG.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.category;
          return (
            <button
              key={cat.category}
              onClick={() => handleCategorySelect(cat.category)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Report Type Selector Pills */}
      <div className="print:hidden grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {REPORT_CATALOG.find((c) => c.category === activeCategory)?.reports.map((rep) => {
          const isSelected = selectedReportType === rep.id;
          return (
            <button
              key={rep.id}
              onClick={() => {
                setSelectedReportType(rep.id as ReportType);
                setReportData(null);
                setPage(1);
                setError(null);
              }}
              className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                isSelected
                  ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20 shadow-xs"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300"
              }`}
            >
              <div>
                <h4 className="text-xs font-black truncate">{rep.name}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {rep.desc}
                </p>
              </div>
              <div className="mt-2 text-[10px] font-bold text-indigo-600 flex items-center gap-0.5">
                <span>Select & Configure</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters Card */}
      <div className="print:hidden bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {currentReportDef?.name} Parameters
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            Configure filters and click Generate
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {/* Academic Year (Common) */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Academic Year</label>
            <select
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-white"
            >
              <option value="">All Academic Years</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
          </div>

          {/* Class (When applicable) */}
          {!["collection"].includes(selectedReportType) && (
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Class</label>
              <select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setSectionId("");
                  setStudentId("");
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-white"
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Section (When class is selected) */}
          {classId && (
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Section</label>
              <select
                value={sectionId}
                onChange={(e) => {
                  setSectionId(e.target.value);
                  setStudentId("");
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-white"
              >
                <option value="">All Sections</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Student Selector (For individual reports) */}
          {["student-profile", "student-history", "student-payments", "student-performance"].includes(
            selectedReportType
          ) && (
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Select Student *</label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-white"
              >
                <option value="">Choose Student</option>
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Exam Selector (Academic reports) */}
          {activeCategory === "ACADEMIC" && (
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Examination</label>
              <select
                value={examId}
                onChange={(e) => setExamId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-white"
              >
                <option value="">All Examinations</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Subject (Academic) */}
          {["exam-results", "subject-performance"].includes(selectedReportType) && (
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-white"
              >
                <option value="">All Subjects</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Single Date Selector (Daily Attendance) */}
          {selectedReportType === "daily" && (
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-white"
              />
            </div>
          )}

          {/* Month Selector (Monthly Attendance & Class Summary) */}
          {["monthly", "class-summary"].includes(selectedReportType) && (
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Month *</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-white"
              />
            </div>
          )}

          {/* Date Range (Admissions, Transfers, Paid fees, Collections, History) */}
          {["admission", "transfer", "paid", "collection", "student-history"].includes(
            selectedReportType
          ) && (
            <>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-white"
                />
              </div>
            </>
          )}

          {/* Percentage Bounds (Percentage Ranking) */}
          {selectedReportType === "percentage-ranking" && (
            <>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Min Attendance %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={minPercentage}
                  onChange={(e) => setMinPercentage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Max Attendance %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="100"
                  value={maxPercentage}
                  onChange={(e) => setMaxPercentage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-white"
                />
              </div>
            </>
          )}

          {/* Payment Method (Paid fees & Collection) */}
          {["paid", "collection"].includes(selectedReportType) && (
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-white"
              >
                <option value="ALL">All Methods</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          )}

          {/* Search Query (Student List) */}
          {selectedReportType === "student-list" && (
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Search Keyword</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Name or Admission No"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Generate Action Button */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => generateReport(1)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate Report
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REPORT RESULT CONTAINER */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="py-24 text-center space-y-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Executing Report Query...</h4>
          <p className="text-xs text-slate-500">Retrieving records with tenant verification.</p>
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          {reportData.summary && reportData.summary.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 print:hidden">
              {reportData.summary.map((sum, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm"
                >
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    {sum.label}
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {sum.prefix || ""}
                    {typeof sum.value === "number" ? sum.value.toLocaleString("en-IN") : sum.value}
                    {sum.suffix || ""}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Report Data Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 print:p-0 print:border-0 print:shadow-none">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 print:border-0">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {reportData.metadata.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {reportData.metadata.description}
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                Total Rows: {reportData.pagination ? reportData.pagination.total : reportData.rows.length}
              </span>
            </div>

            {/* Table */}
            {reportData.rows.length === 0 ? (
              <div className="text-center py-16 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No records found for the selected filters.
                </h4>
                <p className="text-xs text-slate-500">
                  Try adjusting the academic year, dates, or class criteria.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                      {reportData.columns.map((col) => (
                        <th
                          key={col.key}
                          className={`py-3 px-4 ${
                            col.align === "center"
                              ? "text-center"
                              : col.align === "right"
                              ? "text-right"
                              : "text-left"
                          }`}
                        >
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reportData.rows.map((row: any, idx: number) => (
                      <tr
                        key={row.id || idx}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition group"
                      >
                        {reportData.columns.map((col) => {
                          const val = row[col.key];
                          return (
                            <td
                              key={col.key}
                              className={`py-3 px-4 ${
                                col.align === "center"
                                  ? "text-center font-medium text-slate-700 dark:text-slate-300"
                                  : col.align === "right"
                                  ? "text-right font-mono font-semibold text-slate-800 dark:text-slate-200"
                                  : "text-left font-medium text-slate-800 dark:text-slate-200"
                              }`}
                            >
                              {col.format === "currency" && typeof val === "number" ? (
                                `₹${val.toLocaleString("en-IN")}`
                              ) : col.format === "percentage" && typeof val === "number" ? (
                                `${val}%`
                              ) : col.key === "status" || col.key === "passFail" ? (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    val === "ACTIVE" || val === "PRESENT" || val === "PASS"
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                      : val === "ABSENT" || val === "FAIL" || val === "OVERDUE"
                                      ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                      : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                                  }`}
                                >
                                  {val}
                                </span>
                              ) : (
                                val !== undefined && val !== null ? String(val) : "—"
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {reportData.pagination && reportData.pagination.totalPages > 1 && (
              <div className="print:hidden flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-500 font-medium">
                  Page {reportData.pagination.page} of {reportData.pagination.totalPages} ({reportData.pagination.total} records)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => generateReport(reportData.pagination!.page - 1)}
                    disabled={reportData.pagination.page <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => generateReport(reportData.pagination!.page + 1)}
                    disabled={reportData.pagination.page >= reportData.pagination.totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <FileText className="w-10 h-10 text-indigo-500 mx-auto" />
          <h3 className="text-base font-black text-slate-900 dark:text-white">Ready to Generate Report</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Select parameters above and click <span className="font-bold text-indigo-600">Generate Report</span> to execute the query and review live metrics, or export directly to PDF/Excel.
          </p>
        </div>
      )}
    </div>
  );
}
