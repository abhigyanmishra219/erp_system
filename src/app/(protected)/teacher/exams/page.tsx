"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Award,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  BookOpen,
  Calendar,
  Lock,
  Edit,
  Save,
  X,
  ChevronRight,
  TrendingUp,
  UserCheck,
  Percent,
  Check,
  FileCheck,
  AlertTriangle,
} from "lucide-react";

interface ExamScheduleItem {
  examScheduleId: string;
  examId: string;
  examName: string;
  examDescription?: string;
  examStatus: string;
  startDate: string;
  endDate: string;
  academicYearName: string;
  examSubjectId: string;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  examDate?: string | null;
  maximumMarks: number;
  passingMarks: number;
  totalStudents: number;
  enteredCount: number;
  marksStatus: "PENDING" | "COMPLETED" | "PUBLISHED";
  isLocked: boolean;
}

interface StudentMarkRow {
  studentId: string;
  admissionNumber: string;
  rollNumber: string;
  fullName: string;
  gender: string;
  marks: number | null;
  percentage: number | null;
  grade: string;
  isPassed: boolean;
  remarks: string;
  status: string;
}

interface FilterOptions {
  classes: Array<{ classId: string; className: string }>;
  sections: Array<{ sectionId: string; sectionName: string; classId: string }>;
  subjects: Array<{ subjectId: string; subjectName: string; classId?: string; sectionId?: string }>;
  statuses: string[];
}

export default function TeacherExamsPage() {
  const [schedules, setSchedules] = useState<ExamScheduleItem[]>([]);
  const [summary, setSummary] = useState({
    totalSchedules: 0,
    pendingEntry: 0,
    completedEntry: 0,
    publishedResults: 0,
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    classes: [],
    sections: [],
    subjects: [],
    statuses: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Mark Entry Console State
  const [activeSchedule, setActiveSchedule] = useState<ExamScheduleItem | null>(null);
  const [roster, setRoster] = useState<StudentMarkRow[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);
  const [consoleError, setConsoleError] = useState<string | null>(null);

  // Grading scales calculation helper
  const calculateGrade = (marks: number | null, max: number, pass: number) => {
    if (marks === null || marks === undefined || isNaN(marks)) {
      return { percentage: null, grade: "—", isPassed: false };
    }
    const maxVal = max > 0 ? max : 100;
    const percentage = Math.round(((marks / maxVal) * 100) * 100) / 100;

    let grade = "F";
    if (percentage >= 90) grade = "A+";
    else if (percentage >= 80) grade = "A";
    else if (percentage >= 70) grade = "B+";
    else if (percentage >= 60) grade = "B";
    else if (percentage >= 50) grade = "C";
    else if (percentage >= 40) grade = "D";
    else grade = "F";

    const isPassed = marks >= pass;
    return { percentage, grade, isPassed };
  };

  const fetchExams = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (selectedClassId) params.append("classId", selectedClassId);
      if (selectedSectionId) params.append("sectionId", selectedSectionId);
      if (selectedSubjectId) params.append("subjectId", selectedSubjectId);
      if (selectedStatus !== "ALL") params.append("status", selectedStatus);

      const res = await fetch(`/api/teacher/exams?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load exam schedules");
      }

      setSchedules(data.data.exams || []);
      setSummary(data.data.summary || { totalSchedules: 0, pendingEntry: 0, completedEntry: 0, publishedResults: 0 });
      setFilterOptions(data.data.filterOptions || { classes: [], sections: [], subjects: [], statuses: [] });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [search, selectedClassId, selectedSectionId, selectedSubjectId, selectedStatus]);

  // Open Mark Entry Drawer
  const handleOpenMarksConsole = async (schedule: ExamScheduleItem) => {
    setActiveSchedule(schedule);
    setConsoleError(null);
    try {
      setRosterLoading(true);

      const params = new URLSearchParams({
        classId: schedule.classId,
        sectionId: schedule.sectionId,
        subjectId: schedule.subjectId,
        examSubjectId: schedule.examSubjectId,
      });

      const res = await fetch(`/api/teacher/exams/${schedule.examId}/marks?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load student marks roster");
      }

      setRoster(data.data.students || []);
    } catch (err: any) {
      setConsoleError(err.message || "Failed to load marks roster");
    } finally {
      setRosterLoading(false);
    }
  };

  const handleMarkChange = (studentId: string, valStr: string) => {
    if (!activeSchedule) return;

    setRoster((prev) =>
      prev.map((row) => {
        if (row.studentId !== studentId) return row;

        if (valStr === "") {
          return {
            ...row,
            marks: null,
            percentage: null,
            grade: "—",
            isPassed: false,
          };
        }

        const num = parseFloat(valStr);
        if (isNaN(num)) return row;

        const evalRes = calculateGrade(num, activeSchedule.maximumMarks, activeSchedule.passingMarks);
        return {
          ...row,
          marks: num,
          percentage: evalRes.percentage,
          grade: evalRes.grade,
          isPassed: evalRes.isPassed,
        };
      })
    );
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setRoster((prev) =>
      prev.map((row) => (row.studentId === studentId ? { ...row, remarks } : row))
    );
  };

  const handleSaveMarks = async () => {
    if (!activeSchedule) return;

    // Validate entries
    for (const row of roster) {
      if (row.marks !== null) {
        if (row.marks < 0) {
          setConsoleError(`Marks for ${row.fullName} cannot be negative.`);
          return;
        }
        if (row.marks > activeSchedule.maximumMarks) {
          setConsoleError(
            `Marks for ${row.fullName} (${row.marks}) cannot exceed maximum marks (${activeSchedule.maximumMarks}).`
          );
          return;
        }
      }
    }

    try {
      setSavingMarks(true);
      setConsoleError(null);

      const payload = {
        examSubjectId: activeSchedule.examSubjectId,
        classId: activeSchedule.classId,
        sectionId: activeSchedule.sectionId,
        subjectId: activeSchedule.subjectId,
        entries: roster.map((r) => ({
          studentId: r.studentId,
          marks: r.marks,
          remarks: r.remarks,
        })),
      };

      const res = await fetch(`/api/teacher/exams/${activeSchedule.examId}/marks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to record exam marks");
      }

      setSuccessMessage(`Marks saved successfully for ${activeSchedule.subjectName} (${activeSchedule.className} - ${activeSchedule.sectionName})!`);
      setActiveSchedule(null);
      fetchExams();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setConsoleError(err.message || "Failed to save marks");
    } finally {
      setSavingMarks(false);
    }
  };

  const getGradeBadgeClass = (grade: string) => {
    switch (grade) {
      case "A+":
      case "A":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "B+":
      case "B":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "C":
      case "D":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "F":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <span>Exams & Marks Entry</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            View scheduled exam timetables, record marks, and evaluate grades for your assigned subjects and classes.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-medium animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Scheduled Evaluations</span>
            <Award className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-foreground">{summary.totalSchedules}</p>
          <p className="text-[11px] text-muted-foreground">Assigned exam subjects</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Pending Entry</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-foreground">{summary.pendingEntry}</p>
          <p className="text-[11px] text-muted-foreground">Awaiting marks input</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Completed Entries</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-foreground">{summary.completedEntry}</p>
          <p className="text-[11px] text-muted-foreground">Ready for administration review</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Published Results</span>
            <Lock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-foreground">{summary.publishedResults}</p>
          <p className="text-[11px] text-muted-foreground">Released & locked</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by exam name or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 text-xs rounded-xl bg-muted/40 border border-border/70 focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-foreground"
            />
          </div>

          {/* Select Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              aria-label="Filter by Class"
              className="px-3 py-2 text-xs rounded-xl bg-muted/40 border border-border/70 focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-foreground"
            >
              <option value="">All Classes</option>
              {filterOptions.classes.map((c) => (
                <option key={c.classId} value={c.classId}>
                  {c.className}
                </option>
              ))}
            </select>

            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              aria-label="Filter by Section"
              className="px-3 py-2 text-xs rounded-xl bg-muted/40 border border-border/70 focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-foreground"
            >
              <option value="">All Sections</option>
              {filterOptions.sections.map((s) => (
                <option key={s.sectionId} value={s.sectionId}>
                  {s.sectionName}
                </option>
              ))}
            </select>

            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              aria-label="Filter by Subject"
              className="px-3 py-2 text-xs rounded-xl bg-muted/40 border border-border/70 focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-foreground"
            >
              <option value="">All Subjects</option>
              {filterOptions.subjects.map((s) => (
                <option key={s.subjectId} value={s.subjectId}>
                  {s.subjectName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
          {[
            { key: "ALL", label: "All Schedules" },
            { key: "PENDING", label: "Pending Entry" },
            { key: "COMPLETED", label: "Completed" },
            { key: "PUBLISHED", label: "Published & Locked" },
          ].map((st) => (
            <button
              key={st.key}
              onClick={() => setSelectedStatus(st.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap cursor-pointer ${
                selectedStatus === st.key
                  ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                  : "bg-card text-muted-foreground border-border hover:border-border/80 hover:text-foreground"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Schedules List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
          <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Loading exam schedules & evaluation rosters...</p>
        </div>
      ) : schedules.length === 0 ? (
        <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground">No Exam Schedules Assigned</h3>
          <p className="text-xs text-muted-foreground">
            No exams are scheduled for your assigned classes and subjects at this time. Exam creation and target assignments are managed by school administrators.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schedules.map((item) => {
            const percentageEntered = item.totalStudents > 0 ? Math.round((item.enteredCount / item.totalStudents) * 100) : 0;

            return (
              <div
                key={item.examScheduleId}
                className="p-5 rounded-2xl bg-card border border-border/80 hover:border-purple-500/40 shadow-xs flex flex-col justify-between gap-4 transition-all"
              >
                <div className="space-y-3">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      {item.subjectCode || "SUB"}
                    </span>

                    {item.isLocked ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        <Lock className="w-3 h-3" />
                        <span>Published</span>
                      </span>
                    ) : item.marksStatus === "COMPLETED" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle className="w-3 h-3" />
                        <span>Completed</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <Clock className="w-3 h-3" />
                        <span>Pending Entry</span>
                      </span>
                    )}
                  </div>

                  {/* Title & Scope */}
                  <div>
                    <h3 className="text-sm font-bold text-foreground line-clamp-1">{item.examName}</h3>
                    <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1.5 mt-0.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{item.subjectName}</span>
                      <span>•</span>
                      <span className="text-foreground">{item.className} - {item.sectionName}</span>
                    </p>
                  </div>

                  {/* Exam Score Info */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Max Marks</span>
                      <span className="font-black text-foreground">{item.maximumMarks}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Passing Marks</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400">{item.passingMarks}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Evaluation Progress</span>
                      <span className="font-bold text-foreground">
                        {item.enteredCount} / {item.totalStudents} ({percentageEntered}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          item.isLocked
                            ? "bg-blue-500"
                            : item.marksStatus === "COMPLETED"
                            ? "bg-emerald-500"
                            : "bg-purple-600"
                        }`}
                        style={{ width: `${percentageEntered}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Action */}
                <button
                  type="button"
                  onClick={() => handleOpenMarksConsole(item)}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs ${
                    item.isLocked
                      ? "bg-muted text-foreground hover:bg-muted/80 border border-border"
                      : "bg-purple-600 hover:bg-purple-700 text-white"
                  }`}
                >
                  {item.isLocked ? (
                    <>
                      <Lock className="w-3.5 h-3.5 text-blue-500" />
                      <span>View Results (Locked)</span>
                    </>
                  ) : item.enteredCount > 0 ? (
                    <>
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Marks</span>
                    </>
                  ) : (
                    <>
                      <Award className="w-3.5 h-3.5" />
                      <span>Enter Marks</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* MARK ENTRY CONSOLE DRAWER */}
      {activeSchedule && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-5 border-b border-border/70 bg-muted/20 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold border border-purple-500/20">
                    {activeSchedule.subjectName} ({activeSchedule.subjectCode})
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {activeSchedule.className} - {activeSchedule.sectionName}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-foreground">
                  {activeSchedule.examName} — Marks Entry Console
                </h2>
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-0.5">
                  <span>Maximum Marks: <strong className="text-foreground">{activeSchedule.maximumMarks}</strong></span>
                  <span>Passing Marks: <strong className="text-emerald-600 dark:text-emerald-400">{activeSchedule.passingMarks}</strong></span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveSchedule(null)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lock Warning Banner */}
            {activeSchedule.isLocked && (
              <div className="p-3.5 bg-blue-500/10 border-b border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs flex items-center gap-2 font-medium">
                <Lock className="w-4 h-4 shrink-0" />
                <span>Results for this exam have been published by school administration. Marks are in read-only mode and cannot be modified.</span>
              </div>
            )}

            {consoleError && (
              <div className="p-3.5 bg-rose-500/10 border-b border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{consoleError}</span>
              </div>
            )}

            {/* Student Roster Table */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {rosterLoading ? (
                <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
                  <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p>Loading student roster...</p>
                </div>
              ) : roster.length === 0 ? (
                <p className="text-center p-8 text-xs text-muted-foreground">
                  No active students enrolled in this class and section.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-border/80">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold text-[11px]">
                        <th className="p-3 w-12 text-center">Roll</th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3 w-28 text-center">Marks ({activeSchedule.maximumMarks})</th>
                        <th className="p-3 w-20 text-center">Percentage</th>
                        <th className="p-3 w-16 text-center">Grade</th>
                        <th className="p-3 w-20 text-center">Status</th>
                        <th className="p-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {roster.map((row) => (
                        <tr key={row.studentId} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3 text-center font-bold text-muted-foreground">{row.rollNumber}</td>
                          <td className="p-3">
                            <div className="font-bold text-foreground">{row.fullName}</div>
                            <div className="text-[10px] text-muted-foreground">{row.admissionNumber}</div>
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              disabled={activeSchedule.isLocked}
                              min={0}
                              max={activeSchedule.maximumMarks}
                              step="0.5"
                              placeholder="—"
                              value={row.marks !== null ? row.marks : ""}
                              onChange={(e) => handleMarkChange(row.studentId, e.target.value)}
                              className="w-20 px-2.5 py-1.5 text-center text-xs font-bold rounded-xl bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-foreground disabled:opacity-60"
                            />
                          </td>
                          <td className="p-3 text-center font-bold text-foreground">
                            {row.percentage !== null ? `${row.percentage}%` : "—"}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-md border text-[10px] font-black ${getGradeBadgeClass(row.grade)}`}>
                              {row.grade}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {row.marks !== null ? (
                              row.isPassed ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                  <Check className="w-3 h-3" />
                                  <span>PASS</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                  <X className="w-3 h-3" />
                                  <span>FAIL</span>
                                </span>
                              )
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              disabled={activeSchedule.isLocked}
                              placeholder="Optional note..."
                              value={row.remarks || ""}
                              onChange={(e) => handleRemarksChange(row.studentId, e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-muted/40 border border-border/70 focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-foreground disabled:opacity-60"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-border/70 bg-muted/20 flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {roster.filter((r) => r.marks !== null).length} of {roster.length} student marks recorded
              </span>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveSchedule(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Close
                </button>
                {!activeSchedule.isLocked && (
                  <button
                    type="button"
                    onClick={handleSaveMarks}
                    disabled={savingMarks || rosterLoading}
                    className="px-5 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingMarks ? "Saving Marks..." : "Save & Record Marks"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
