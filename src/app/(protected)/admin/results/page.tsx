"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Award,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Send,
  Lock,
  Unlock,
  FileText,
  ChevronRight,
  TrendingUp,
  Percent,
  Users,
  Sparkles,
  ArrowUpDown,
  FileCheck2,
} from "lucide-react";

interface AcademicYear {
  id?: string;
  _id?: string;
  name: string;
  status?: string;
  isCurrent?: boolean;
}

interface ClassItem {
  id?: string;
  _id?: string;
  name: string;
  code?: string;
  sections?: SectionItem[];
}

interface SectionItem {
  id?: string;
  _id?: string;
  name: string;
  code?: string;
  classId?: string;
}

interface ExamSummary {
  id?: string;
  _id?: string;
  name: string;
  academicYearId?: any;
  status: "DRAFT" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "RESULTS_PUBLISHED" | "ARCHIVED";
}

interface StudentResultRow {
  student: {
    id: string;
    name: string;
    admissionNumber?: string;
    rollNumber?: string;
    photo?: string | null;
    class?: { id?: string; _id?: string; name: string; code?: string } | null;
    section?: { id?: string; _id?: string; name: string } | null;
  };
  totalObtainedMarks: number;
  totalMaximumMarks: number;
  percentage: number;
  overallGrade: string;
  isPassed: boolean;
  statusText?: string;
  subjectsCount?: number;
  enteredCount?: number;
  unenteredCount?: number;
  passedSubjectsCount?: number;
  failedSubjectsCount?: number;
  status: "DRAFT" | "REVIEWED" | "PUBLISHED";
  subjects: Array<{
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    marks: number | null;
    maximumMarks: number;
    passingMarks: number;
    percentage: number | null;
    grade: string;
    isPassed: boolean;
  }>;
}

interface ResultsPayload {
  exam: ExamSummary;
  summary?: {
    totalStudents: number;
    publishedStudents: number;
    reviewedStudents: number;
    draftStudents: number;
    passedStudents: number;
    failedStudents: number;
  };
  results: StudentResultRow[];
}

export default function AdminResultsPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);

  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [payload, setPayload] = useState<ResultsPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  // 1. Initial Load (Academic Years)
  useEffect(() => {
    async function loadAcademicYears() {
      try {
        const yearsRes = await fetch("/api/admin/academic-years");
        const yearsData = await yearsRes.json();

        if (yearsData.success && yearsData.data) {
          const list: AcademicYear[] = yearsData.data.academicYears || (Array.isArray(yearsData.data) ? yearsData.data : []);
          setAcademicYears(list);
          const current = list.find((y) => y.status === "ACTIVE" || y.isCurrent) || list[0];
          if (current) {
            setSelectedYear(current.id || current._id || "");
          }
        }
      } catch (err) {
        console.error("Failed to load academic years", err);
      }
    }
    loadAcademicYears();
  }, []);

  // 2. Load Exams & Classes when Year changes
  useEffect(() => {
    if (!selectedYear) {
      setExams([]);
      setSelectedExamId("");
      setClasses([]);
      setSelectedClassId("");
      setSections([]);
      setSelectedSectionId("");
      setPayload(null);
      return;
    }

    async function loadYearData() {
      try {
        const [examsRes, classesRes] = await Promise.all([
          fetch(`/api/admin/exams?academicYearId=${selectedYear}`),
          fetch(`/api/admin/classes?academicYearId=${selectedYear}`),
        ]);

        const [examsData, classesData] = await Promise.all([
          examsRes.json(),
          classesRes.json(),
        ]);

        if (examsData.success && examsData.data) {
          const list: ExamSummary[] = examsData.data.exams || (Array.isArray(examsData.data) ? examsData.data : []);
          setExams(list);
          if (list.length > 0) {
            setSelectedExamId(list[0].id || list[0]._id || "");
          } else {
            setSelectedExamId("");
            setPayload(null);
          }
        } else {
          setExams([]);
          setSelectedExamId("");
          setPayload(null);
        }

        if (classesData.success && classesData.data) {
          const classList: ClassItem[] = classesData.data.classes || (Array.isArray(classesData.data) ? classesData.data : []);
          setClasses(classList);
        } else {
          setClasses([]);
        }
      } catch (err) {
        console.error("Failed to load year exams and classes", err);
        setExams([]);
        setSelectedExamId("");
        setClasses([]);
        setPayload(null);
      }
    }
    loadYearData();
  }, [selectedYear]);

  // 3. Update Sections when Class selection changes
  useEffect(() => {
    if (!selectedClassId) {
      setSections([]);
      setSelectedSectionId("");
      return;
    }

    const currentClass = classes.find((c) => (c.id || c._id) === selectedClassId);
    if (currentClass?.sections && currentClass.sections.length > 0) {
      setSections(currentClass.sections);
    } else {
      fetch(`/api/admin/sections?classId=${selectedClassId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data?.sections) {
            setSections(data.data.sections);
          } else {
            setSections([]);
          }
        })
        .catch(() => setSections([]));
    }
    setSelectedSectionId("");
  }, [selectedClassId, classes]);

  // 4. Fetch Results
  const fetchResults = useCallback(async () => {
    if (!selectedExamId) {
      setPayload(null);
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const params = new URLSearchParams();
      if (selectedClassId) params.append("classId", selectedClassId);
      if (selectedSectionId) params.append("sectionId", selectedSectionId);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/admin/exams/${selectedExamId}/results?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setPayload(data.data);
        setSelectedStudentIds([]);
      } else {
        setMessage({ type: "error", text: data.error?.message || "Failed to fetch results" });
        setPayload(null);
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Network error loading results" });
    } finally {
      setLoading(false);
    }
  }, [selectedExamId, selectedClassId, selectedSectionId, statusFilter, searchQuery]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Batch Status Update Action
  const handleBatchStatusUpdate = async (newStatus: "DRAFT" | "REVIEWED" | "PUBLISHED") => {
    if (!selectedExamId) return;

    const count = selectedStudentIds.length > 0 ? selectedStudentIds.length : payload?.results.length || 0;
    const confirmText = `Are you sure you want to mark ${count} result(s) as ${newStatus}?`;
    if (!confirm(confirmText)) return;

    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/exams/${selectedExamId}/results`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          classId: selectedClassId || undefined,
          sectionId: selectedSectionId || undefined,
          studentIds: selectedStudentIds.length > 0 ? selectedStudentIds : undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: `Successfully updated ${data.data.modifiedCount} mark entries to ${newStatus}.`,
        });
        await fetchResults();
      } else {
        setMessage({ type: "error", text: data.error?.message || "Failed to update results" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Network error updating results" });
    } finally {
      setActionLoading(false);
    }
  };

  // Single Student Status Update
  const handleSingleStudentStatusUpdate = async (
    studentId: string,
    newStatus: "DRAFT" | "REVIEWED" | "PUBLISHED"
  ) => {
    if (!selectedExamId) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/exams/${selectedExamId}/results`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          studentIds: [studentId],
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({
          type: "success",
          text: `Student result marked as ${newStatus}.`,
        });
        await fetchResults();
      } else {
        setMessage({ type: "error", text: data.error?.message || "Failed to update status" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Network error updating student status" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked && payload?.results) {
      setSelectedStudentIds(
        payload.results
          .map((r) => r.student?.id || (r as any).studentId)
          .filter(Boolean)
      );
    } else {
      setSelectedStudentIds([]);
    }
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <GraduationCap className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Results & Report Cards
              </h1>
              <p className="text-sm text-muted-foreground">
                Review computed academic results, publish report cards, and generate printable summaries.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedExamId && (
            <Link
              href={`/admin/exams/${selectedExamId}/marks`}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-border bg-card hover:bg-accent text-foreground transition-colors shadow-xs"
            >
              <FileCheck2 className="h-4 w-4 text-primary" />
              <span>Marks Entry</span>
            </Link>
          )}
          {selectedExamId && (
            <Link
              href={`/admin/exams/${selectedExamId}`}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-border bg-card hover:bg-accent text-foreground transition-colors shadow-xs"
            >
              <Award className="h-4 w-4 text-primary" />
              <span>Exam Hub</span>
            </Link>
          )}
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-in fade-in-50 ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Academic Session */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Academic Session
            </label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setSelectedClassId("");
                setSelectedSectionId("");
              }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-primary"
            >
              {academicYears.length === 0 ? (
                <option value="">No sessions found</option>
              ) : (
                academicYears.map((y) => {
                  const yId = y.id || y._id || "";
                  return (
                    <option key={yId} value={yId}>
                      {y.name} {y.status === "ACTIVE" || y.isCurrent ? "(Current)" : ""}
                    </option>
                  );
                })
              )}
            </select>
          </div>

          {/* Exam Selection */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Examination
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-primary font-medium"
            >
              {exams.length === 0 ? (
                <option value="">No exams found for this year</option>
              ) : (
                exams.map((ex) => {
                  const exId = ex.id || ex._id || "";
                  return (
                    <option key={exId} value={exId}>
                      {ex.name} ({ex.status})
                    </option>
                  );
                })
              )}
            </select>
          </div>

          {/* Class Filter */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Class Filter
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedSectionId("");
              }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-primary"
            >
              <option value="">All Classes</option>
              {classes.map((c) => {
                const cId = c.id || c._id || "";
                return (
                  <option key={cId} value={cId}>
                    {c.name} {c.code ? `(${c.code})` : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Section Filter
            </label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              disabled={!selectedClassId}
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:bg-muted"
            >
              <option value="">All Sections</option>
              {sections.map((s) => {
                const sId = s.id || s._id || "";
                return (
                  <option key={sId} value={sId}>
                    Section {s.name}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Secondary Filter Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by student name or roll..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="REVIEWED">Reviewed</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => fetchResults()}
              disabled={loading || !selectedExamId}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-accent text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      {payload && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">Total Students</span>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {payload.summary?.totalStudents ?? payload.results.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {payload.results.filter((r) => (r.enteredCount ?? 0) > 0).length} evaluated
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">Published Results</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {payload.summary?.publishedStudents ??
                payload.results.filter((r) => r.status === "PUBLISHED").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              of {payload.summary?.totalStudents ?? payload.results.length} candidates
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">Class Average</span>
              <TrendingUp className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {payload.results.length > 0
                ? (
                    payload.results.reduce((acc, r) => acc + (r.percentage || 0), 0) /
                    payload.results.length
                  ).toFixed(1)
                : "0.0"}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">Overall percentage</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">Pass Percentage</span>
              <Percent className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {(payload.summary?.totalStudents ?? payload.results.length) > 0
                ? (
                    ((payload.summary?.passedStudents ??
                      payload.results.filter((r) => r.isPassed).length) /
                      (payload.summary?.totalStudents ?? payload.results.length)) *
                    100
                  ).toFixed(1)
                : "0.0"}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">Passing student ratio</p>
          </div>
        </div>
      )}

      {/* Batch Workflow Actions Bar */}
      {payload && payload.results.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 border border-border p-3.5 rounded-xl shadow-xs">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <span className="font-medium">
              {selectedStudentIds.length > 0
                ? `${selectedStudentIds.length} of ${payload.results.length} selected`
                : `All ${payload.results.length} candidates in view`}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleBatchStatusUpdate("REVIEWED")}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Mark as Reviewed</span>
            </button>

            <button
              onClick={() => handleBatchStatusUpdate("PUBLISHED")}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Publish Selected</span>
            </button>

            <button
              onClick={() => handleBatchStatusUpdate("DRAFT")}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-accent text-foreground transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Unlock className="h-3.5 w-3.5 text-amber-500" />
              <span>Revert to Draft</span>
            </button>
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Calculating and aggregating exam results...</p>
          </div>
        ) : !selectedExamId ? (
          <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Award className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-base font-semibold text-foreground">Select an Examination</p>
            <p className="text-sm max-w-sm">
              Please pick an academic year and examination above to view student results and generate report cards.
            </p>
          </div>
        ) : !payload || payload.results.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Users className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-base font-semibold text-foreground">No Student Results Found</p>
            <p className="text-sm max-w-sm">
              No students or marks found matching your current filter criteria. Check if marks have been entered.
            </p>
            <Link
              href={`/admin/exams/${selectedExamId}/marks`}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
            >
              <FileCheck2 className="h-4 w-4" />
              Go to Marks Entry
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={
                        payload.results.length > 0 &&
                        selectedStudentIds.length === payload.results.length
                      }
                      onChange={handleSelectAll}
                      className="rounded border-input text-primary focus:ring-primary"
                    />
                  </th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Class / Section</th>
                  <th className="py-3 px-4 text-center">Marks Obtained</th>
                  <th className="py-3 px-4 text-center">Percentage</th>
                  <th className="py-3 px-4 text-center">Grade</th>
                  <th className="py-3 px-4 text-center">Result Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {payload.results.map((row) => {
                  const student = row.student || {};
                  const studentId = student.id || (row as any).studentId || "";
                  const studentName = student.name || (row as any).name || "Student";
                  const admissionNum = student.admissionNumber || (row as any).admissionNumber || "";
                  const rollNum = student.rollNumber || (row as any).rollNumber || "";
                  const photo = student.photo || (row as any).profileImage || null;
                  const className = student.class?.name || (row as any).class?.name || "N/A";
                  const sectionName = student.section?.name || (row as any).section?.name || "";
                  const totalObtained = row.totalObtainedMarks ?? (row as any).totalObtained ?? 0;
                  const totalMaximum = row.totalMaximumMarks ?? (row as any).totalMaximum ?? 0;
                  const isSelected = selectedStudentIds.includes(studentId);

                  return (
                    <tr
                      key={studentId || Math.random()}
                      className={`hover:bg-muted/30 transition-colors ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleStudentSelection(studentId)}
                          className="rounded border-input text-primary focus:ring-primary"
                        />
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-primary/20">
                            {photo ? (
                              <img
                                src={photo}
                                alt={studentName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              (studentName?.charAt(0) || "S").toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{studentName}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              {admissionNum && <span>Adm: {admissionNum}</span>}
                              {rollNum && <span>• Roll: {rollNum}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {className}
                        </span>
                        {sectionName && (
                          <span className="ml-1 text-xs px-2 py-0.5 rounded-md bg-muted border border-border">
                            {sectionName}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="font-semibold text-foreground">
                          {totalObtained} / {totalMaximum}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(row.subjects || []).filter((s) => s.marks !== null).length} / {(row.subjects || []).length} subjects
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-foreground">
                          {(row.percentage || 0).toFixed(1)}%
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                              row.isPassed
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-destructive/10 text-destructive border border-destructive/20"
                            }`}
                          >
                            {row.overallGrade || "N/A"}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            row.status === "PUBLISHED"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : row.status === "REVIEWED"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/results/${selectedExamId}/report-card/${studentId}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                            title="View Printable Report Card"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Report Card</span>
                          </Link>

                          {row.status !== "PUBLISHED" ? (
                            <button
                              onClick={() =>
                                handleSingleStudentStatusUpdate(studentId, "PUBLISHED")
                              }
                              disabled={actionLoading}
                              className="p-1.5 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 rounded-md transition-colors cursor-pointer"
                              title="Publish Result"
                            >
                              <Lock className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                handleSingleStudentStatusUpdate(studentId, "DRAFT")
                              }
                              disabled={actionLoading}
                              className="p-1.5 text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 rounded-md transition-colors cursor-pointer"
                              title="Revert to Draft"
                            >
                              <Unlock className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
