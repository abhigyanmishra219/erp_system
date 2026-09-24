"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Award,
  Calendar,
  Clock,
  BookOpen,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Printer,
  Sparkles,
  RefreshCw,
  Layers,
  GraduationCap,
  CalendarDays,
  FileText,
  X,
  ArrowRight,
} from "lucide-react";

interface ScheduleItem {
  _id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  subjectType: string;
  examDate: string | null;
  maximumMarks: number;
  passingMarks: number;
}

interface ExamItem {
  _id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  timelineStatus: "UPCOMING" | "ONGOING" | "COMPLETED";
  academicYear: {
    _id: string;
    name: string;
  };
  classContext: {
    classId: string;
    className: string;
    sectionId: string;
    sectionName: string;
  };
  subjectCount: number;
  schedule: ScheduleItem[];
}

interface AcademicContext {
  class: {
    _id: string;
    name: string;
    code: string;
  };
  section: {
    _id: string;
    name: string;
  };
  academicYear: {
    _id: string;
    name: string;
  };
}

interface SummaryData {
  total: number;
  upcoming: number;
  ongoing: number;
  completed: number;
  totalSubjectsScheduled: number;
}

export default function StudentExamsPage() {
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    total: 0,
    upcoming: 0,
    ongoing: 0,
    completed: 0,
    totalSubjectsScheduled: 0,
  });
  const [academicContext, setAcademicContext] = useState<AcademicContext | null>(null);

  // Filters & UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [expandedExams, setExpandedExams] = useState<Record<string, boolean>>({});
  const [selectedExamForModal, setSelectedExamForModal] = useState<ExamItem | null>(null);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/student/exams?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch examinations");

      const json = await res.json();
      if (json.success && json.data) {
        setExams(json.data.exams || []);
        setSummary(json.data.summary || {});
        setAcademicContext(json.data.academicContext || null);

        // Auto-expand first 2 upcoming/ongoing exams
        const autoExpanded: Record<string, boolean> = {};
        (json.data.exams || []).slice(0, 2).forEach((e: ExamItem) => {
          autoExpanded[e._id] = true;
        });
        setExpandedExams((prev) => ({ ...autoExpanded, ...prev }));
      }
    } catch (err) {
      console.error("Error fetching student exams:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchExams();
  };

  const toggleExamExpand = (examId: string) => {
    setExpandedExams((prev) => ({
      ...prev,
      [examId]: !prev[examId],
    }));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Date TBA";
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatShortDate = (dateString: string | null) => {
    if (!dateString) return "TBA";
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getTimelineBadge = (timelineStatus: "UPCOMING" | "ONGOING" | "COMPLETED", status: string) => {
    if (timelineStatus === "ONGOING" || status === "ONGOING") {
      return {
        label: "Ongoing Now",
        bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        dotBg: "bg-emerald-500 animate-pulse",
      };
    }
    if (timelineStatus === "UPCOMING" || status === "SCHEDULED") {
      return {
        label: "Upcoming",
        bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        dotBg: "bg-blue-500",
      };
    }
    return {
      label: "Completed",
      bg: "bg-muted text-muted-foreground border-border",
      dotBg: "bg-muted-foreground",
    };
  };

  const handlePrintSchedule = (exam: ExamItem) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const subjectsRows = exam.schedule
      .map(
        (sub, index) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${index + 1}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${sub.subjectName} <span style="font-size: 11px; color: #64748b;">(${sub.subjectCode})</span></td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${sub.subjectType}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${formatDate(sub.examDate)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${sub.maximumMarks}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${sub.passingMarks}</td>
        </tr>
      `
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${exam.name} — Datesheet & Schedule</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #1e293b; }
            .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 25px; }
            .school-title { font-size: 22px; font-weight: bold; margin-bottom: 5px; }
            .exam-title { font-size: 18px; color: #4338ca; font-weight: 700; margin-bottom: 10px; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
            th { background-color: #f8fafc; padding: 10px; border-bottom: 2px solid #cbd5e1; text-align: left; font-weight: 600; }
            .footer { margin-top: 35px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="school-title">Official Examination Datesheet</div>
            <div class="exam-title">${exam.name}</div>
            <div style="font-size: 13px; color: #64748b;">${exam.academicYear.name}</div>
          </div>
          <div class="meta">
            <div><strong>Class & Section:</strong> ${exam.classContext.className} - ${exam.classContext.sectionName}</div>
            <div><strong>Exam Period:</strong> ${formatShortDate(exam.startDate)} — ${formatShortDate(exam.endDate)}</div>
            <div><strong>Total Subjects:</strong> ${exam.subjectCount}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="text-align: center; width: 40px;">#</th>
                <th>Subject Name</th>
                <th>Type</th>
                <th>Examination Date</th>
                <th style="text-align: center;">Max Marks</th>
                <th style="text-align: center;">Passing Marks</th>
              </tr>
            </thead>
            <tbody>
              ${subjectsRows}
            </tbody>
          </table>
          <div class="footer">
            Generated on ${new Date().toLocaleDateString()} • Student Examination Portal
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-card via-card to-primary/5 border border-border p-6 rounded-3xl shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Award className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Examinations & Schedule
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            View upcoming exam datesheets, scheduled subject timings, maximum marks, and syllabus guidelines.
          </p>
        </div>

        {/* Academic Context Badges */}
        {academicContext && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-border text-xs font-semibold text-foreground shadow-2xs">
              <GraduationCap className="w-3.5 h-3.5 text-primary" />
              <span>
                {academicContext.class.name} • Sec {academicContext.section.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-border text-xs font-semibold text-muted-foreground shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{academicContext.academicYear.name}</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Overview Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Total Exams</div>
            <div className="text-lg sm:text-xl font-bold text-foreground">{summary.total || 0}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Upcoming</div>
            <div className="text-lg sm:text-xl font-bold text-foreground">{summary.upcoming || 0}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Ongoing</div>
            <div className="text-lg sm:text-xl font-bold text-foreground">{summary.ongoing || 0}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Subjects Scheduled</div>
            <div className="text-lg sm:text-xl font-bold text-foreground">
              {summary.totalSubjectsScheduled || 0}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="p-4 rounded-3xl bg-card border border-border space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by exam name, e.g. Midterm, Final..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-2xl bg-background border border-border focus:outline-hidden focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="submit"
              className="flex-1 sm:flex-none px-4 py-2 rounded-2xl bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:bg-primary/90 transition-colors shadow-2xs cursor-pointer"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
                fetchExams();
              }}
              title="Reset Filters"
              className="p-2 rounded-2xl bg-background border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Timeline:</span>
          </div>

          {[
            { key: "ALL", label: "All Exams" },
            { key: "UPCOMING", label: "Upcoming" },
            { key: "ONGOING", label: "Ongoing Now" },
            { key: "COMPLETED", label: "Completed" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                statusFilter === tab.key
                  ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                  : "bg-background border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Content Area */}
      {loading ? (
        <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground font-medium">Loading examination schedules...</p>
        </div>
      ) : exams.length === 0 ? (
        <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Award className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-foreground">No Examinations Found</h3>
            <p className="text-xs text-muted-foreground">
              {searchQuery || statusFilter !== "ALL"
                ? "No examinations match your current search and filter criteria. Try clearing filters."
                : "No examinations have been scheduled for your class and section yet. Check back soon!"}
            </p>
          </div>
          {(searchQuery || statusFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
              }}
              className="px-4 py-2 rounded-2xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-2xs cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => {
            const isExpanded = expandedExams[exam._id] !== false;
            const badge = getTimelineBadge(exam.timelineStatus, exam.status);

            return (
              <div
                key={exam._id}
                className="rounded-3xl bg-card border border-border overflow-hidden transition-all shadow-xs"
              >
                {/* Exam Header Accordion Toggle */}
                <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 bg-muted/15">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0 mt-0.5 sm:mt-0">
                      <Award className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-[11px] font-bold border ${badge.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dotBg}`} />
                          <span>{badge.label}</span>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-xl bg-background border border-border text-[11px] font-semibold text-muted-foreground">
                          {exam.classContext.className} - {exam.classContext.sectionName}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight truncate">
                        {exam.name}
                      </h3>

                      {exam.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {exam.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions & Dates Info */}
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start sm:self-center">
                    <div className="text-right hidden sm:block mr-1">
                      <div className="text-[11px] text-muted-foreground font-medium">Exam Window</div>
                      <div className="text-xs font-bold text-foreground">
                        {formatShortDate(exam.startDate)} — {formatShortDate(exam.endDate)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePrintSchedule(exam)}
                      className="p-2 rounded-xl bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      title="Print Datesheet"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedExamForModal(exam)}
                      className="px-3 py-1.5 rounded-xl bg-background border border-border text-foreground hover:bg-muted text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Details
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleExamExpand(exam._id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-2xs cursor-pointer"
                    >
                      <span>{isExpanded ? "Hide Datesheet" : "View Datesheet"}</span>
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Exam Datesheet Table */}
                {isExpanded && (
                  <div className="p-4 sm:p-6 bg-card space-y-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-primary" />
                        <span>Scheduled Subjects & Papers ({exam.schedule.length})</span>
                      </span>
                      <span className="text-[11px]">
                        Datesheet for {exam.classContext.className} ({exam.classContext.sectionName})
                      </span>
                    </div>

                    {exam.schedule.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-muted/30 border border-border text-center text-xs text-muted-foreground">
                        Subject papers and exam dates have not been scheduled yet for this exam.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-border">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                              <th className="py-3 px-4 w-12 text-center">#</th>
                              <th className="py-3 px-4">Subject & Code</th>
                              <th className="py-3 px-4">Subject Type</th>
                              <th className="py-3 px-4">Date & Day</th>
                              <th className="py-3 px-4 text-center">Max Marks</th>
                              <th className="py-3 px-4 text-center">Passing Marks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {exam.schedule.map((sub, idx) => (
                              <tr
                                key={sub._id}
                                className="hover:bg-muted/30 transition-colors group"
                              >
                                <td className="py-3 px-4 text-center text-muted-foreground font-mono">
                                  {idx + 1}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-bold text-foreground group-hover:text-primary transition-colors">
                                    {sub.subjectName}
                                  </div>
                                  {sub.subjectCode && (
                                    <div className="text-[10px] text-muted-foreground font-mono">
                                      {sub.subjectCode}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <span className="inline-block px-2 py-0.5 rounded-md bg-muted text-[10px] font-semibold text-muted-foreground border border-border/80">
                                    {sub.subjectType}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                                    <Calendar className="w-3.5 h-3.5 text-primary" />
                                    <span>{formatDate(sub.examDate)}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="font-bold text-foreground px-2 py-0.5 rounded-lg bg-primary/10 text-primary">
                                    {sub.maximumMarks}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="font-semibold text-muted-foreground">
                                    {sub.passingMarks}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Exam Details Modal */}
      {selectedExamForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">
                    {selectedExamForModal.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedExamForModal.academicYear.name} • {selectedExamForModal.classContext.className} (Sec {selectedExamForModal.classContext.sectionName})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedExamForModal(null)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4 text-xs">
              {selectedExamForModal.description && (
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border text-muted-foreground">
                  {selectedExamForModal.description}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-background border border-border">
                  <div className="text-muted-foreground text-[10px]">Start Date</div>
                  <div className="font-bold text-foreground mt-0.5">
                    {formatDate(selectedExamForModal.startDate)}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-background border border-border">
                  <div className="text-muted-foreground text-[10px]">End Date</div>
                  <div className="font-bold text-foreground mt-0.5">
                    {formatDate(selectedExamForModal.endDate)}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-foreground flex items-center justify-between">
                  <span>Subject Schedule ({selectedExamForModal.schedule.length})</span>
                </div>
                <div className="max-h-60 overflow-y-auto rounded-2xl border border-border divide-y divide-border/60">
                  {selectedExamForModal.schedule.map((sub, i) => (
                    <div key={sub._id} className="p-3 flex items-center justify-between gap-3 text-xs bg-card">
                      <div>
                        <div className="font-bold text-foreground">
                          {i + 1}. {sub.subjectName}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatDate(sub.examDate)} • {sub.subjectType}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-primary">Max: {sub.maximumMarks}</div>
                        <div className="text-[10px] text-muted-foreground">Pass: {sub.passingMarks}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedExamForModal(null)}
                className="px-4 py-2 rounded-2xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handlePrintSchedule(selectedExamForModal)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-2xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Schedule</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
