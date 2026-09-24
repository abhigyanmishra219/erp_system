"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BookOpen,
  Printer,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Sparkles,
  Info,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
  FileSpreadsheet,
} from "lucide-react";

interface SubjectResult {
  subjectId: string;
  subjectName?: string;
  subjectCode?: string;
  marks: number | null;
  maximumMarks: number;
  passingMarks: number;
  percentage: number | null;
  grade: string;
  isPassed: boolean;
  remarks?: string;
  publishedAt?: string | null;
}

interface ExamResultCard {
  exam: {
    _id: string;
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  publishedAt: string;
  totalObtainedMarks: number;
  totalMaximumMarks: number;
  percentage: number;
  overallGrade: string;
  isPassed: boolean;
  statusText: "PASSED" | "FAILED" | "INCOMPLETE";
  totalSubjects: number;
  passedSubjects: number;
  failedSubjects: number;
  subjects: SubjectResult[];
}

interface AcademicContext {
  student: {
    _id: string;
    name: string;
    rollNumber: string;
    admissionNumber: string;
  };
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
  totalPublishedExams: number;
  totalEvaluatedSubjects: number;
  passedExams: number;
  failedExams: number;
  overallAveragePercentage: number;
}

export default function StudentResultsPage() {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<ExamResultCard[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalPublishedExams: 0,
    totalEvaluatedSubjects: 0,
    passedExams: 0,
    failedExams: 0,
    overallAveragePercentage: 0,
  });
  const [academicContext, setAcademicContext] = useState<AcademicContext | null>(null);

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedExams, setExpandedExams] = useState<Record<string, boolean>>({});
  const [selectedResultModal, setSelectedResultModal] = useState<ExamResultCard | null>(null);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/student/results");
      if (!res.ok) throw new Error("Failed to fetch published results");

      const json = await res.json();
      if (json.success && json.data) {
        setResults(json.data.examResults || []);
        setSummary(json.data.summary || {});
        setAcademicContext(json.data.academicContext || null);

        // Auto expand all result cards by default
        const autoExp: Record<string, boolean> = {};
        (json.data.examResults || []).forEach((r: ExamResultCard) => {
          autoExp[r.exam._id] = true;
        });
        setExpandedExams(autoExp);
      }
    } catch (err) {
      console.error("Error fetching results:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const toggleExamExpand = (examId: string) => {
    setExpandedExams((prev) => ({
      ...prev,
      [examId]: !prev[examId],
    }));
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getGradeBadge = (grade: string) => {
    const g = grade.toUpperCase();
    if (g.startsWith("A")) {
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    }
    if (g.startsWith("B")) {
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    }
    if (g.startsWith("C") || g.startsWith("D")) {
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    }
    return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
  };

  const filteredResults = results.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.exam.name.toLowerCase().includes(q) ||
      r.subjects.some((s) => (s.subjectName || "").toLowerCase().includes(q))
    );
  });

  const handlePrintResult = (res: ExamResultCard) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const subjectsRows = res.subjects
      .map(
        (sub, index) => `
        <tr>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${index + 1}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">
            ${sub.subjectName || "Subject"}
            ${sub.subjectCode ? `<span style="font-size: 11px; color: #64748b;">(${sub.subjectCode})</span>` : ""}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${sub.maximumMarks}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${sub.passingMarks}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 700; color: ${sub.isPassed ? "#047857" : "#b91c1c"};">
            ${sub.marks !== null ? sub.marks : "—"}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${sub.percentage !== null ? `${sub.percentage}%` : "—"}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 700;">${sub.grade}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; background: ${sub.isPassed ? "#dcfce7; color: #15803d" : "#fee2e2; color: #b91c1c"};">
              ${sub.isPassed ? "PASSED" : "FAILED"}
            </span>
          </td>
        </tr>
      `
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${res.exam.name} — Student Result Statement</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; }
            .card { border: 2px solid #0f172a; border-radius: 12px; padding: 25px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
            .school-title { font-size: 22px; font-weight: 800; text-transform: uppercase; color: #0f172a; }
            .sub-title { font-size: 15px; color: #4338ca; font-weight: 700; margin-top: 4px; }
            .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 13px; margin-bottom: 20px; padding: 12px; background: #f8fafc; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12.5px; }
            th { background-color: #f1f5f9; padding: 10px; border-bottom: 2px solid #cbd5e1; text-align: left; font-weight: 700; }
            .summary-box { margin-top: 25px; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; justify-content: space-around; text-align: center; }
            .stat-val { font-size: 18px; font-weight: 800; color: #0f172a; }
            .stat-lbl { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-top: 2px; }
            .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="school-title">Official Statement of Marks</div>
              <div class="sub-title">${res.exam.name}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Published on ${formatDate(res.publishedAt)}</div>
            </div>

            <div class="meta-grid">
              <div><strong>Student Name:</strong> ${academicContext?.student.name || "Student"}</div>
              <div><strong>Admission No:</strong> ${academicContext?.student.admissionNumber || "N/A"}</div>
              <div><strong>Class & Section:</strong> ${academicContext?.class.name || ""} - ${academicContext?.section.name || ""}</div>
              <div><strong>Academic Year:</strong> ${academicContext?.academicYear.name || "N/A"}</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="text-align: center; width: 35px;">#</th>
                  <th>Subject</th>
                  <th style="text-align: center;">Max Marks</th>
                  <th style="text-align: center;">Pass Marks</th>
                  <th style="text-align: center;">Obtained</th>
                  <th style="text-align: center;">Percentage</th>
                  <th style="text-align: center;">Grade</th>
                  <th style="text-align: center;">Result</th>
                </tr>
              </thead>
              <tbody>
                ${subjectsRows}
              </tbody>
            </table>

            <div class="summary-box">
              <div>
                <div class="stat-val">${res.totalObtainedMarks} / ${res.totalMaximumMarks}</div>
                <div class="stat-lbl">Aggregate Score</div>
              </div>
              <div>
                <div class="stat-val" style="color: #4338ca;">${res.percentage}%</div>
                <div class="stat-lbl">Overall Percentage</div>
              </div>
              <div>
                <div class="stat-val" style="color: #047857;">${res.overallGrade}</div>
                <div class="stat-lbl">Final Letter Grade</div>
              </div>
              <div>
                <div class="stat-val" style="color: ${res.isPassed ? "#047857" : "#b91c1c"};">${res.statusText}</div>
                <div class="stat-lbl">Academic Standing</div>
              </div>
            </div>

            <div class="footer">
              <span>Verified & Published by School Administration</span>
              <span>Generated on ${new Date().toLocaleDateString()}</span>
            </div>
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
              <TrendingUp className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Exam Results & Performance
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Access your officially published marks statements, subject grades, aggregate percentage, and performance trends.
          </p>
        </div>

        {/* Student Academic Identity Pill */}
        {academicContext && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-border text-xs font-semibold text-foreground shadow-2xs">
              <GraduationCap className="w-3.5 h-3.5 text-primary" />
              <span>
                {academicContext.class.name} • Sec {academicContext.section.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-border text-xs font-semibold text-muted-foreground shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Verified Portal</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Publication Rule Callout Banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/20 text-xs">
        <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-foreground">Official Examination Publication:</span>
          <p className="text-muted-foreground leading-relaxed">
            Marks entered by teachers undergo administrative verification and review. Examination scores become visible here once officially published by the school administration.
          </p>
        </div>
      </div>

      {/* 3. Performance KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Published Exams</div>
            <div className="text-lg sm:text-xl font-bold text-foreground">
              {summary.totalPublishedExams || 0}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Average Score</div>
            <div className="text-lg sm:text-xl font-bold text-foreground">
              {summary.overallAveragePercentage || 0}%
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Exams Passed</div>
            <div className="text-lg sm:text-xl font-bold text-foreground">
              {summary.passedExams || 0}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Evaluated Subjects</div>
            <div className="text-lg sm:text-xl font-bold text-foreground">
              {summary.totalEvaluatedSubjects || 0}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Search Filter Bar */}
      <div className="p-4 rounded-3xl bg-card border border-border flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by exam name or subject..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-2xl bg-background border border-border focus:outline-hidden focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setSearchQuery("");
            fetchResults();
          }}
          title="Refresh Results"
          className="p-2 rounded-2xl bg-background border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 5. Results Content Area */}
      {loading ? (
        <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground font-medium">Loading published results...</p>
        </div>
      ) : results.length === 0 ? (
        <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-foreground">No Published Results Yet</h3>
            <p className="text-xs text-muted-foreground">
              Examination results will be published here once administrative reviews are finalized. Check back soon!
            </p>
          </div>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="p-10 rounded-3xl bg-card border border-border text-center space-y-2">
          <p className="text-xs text-muted-foreground">No exam results match "{searchQuery}".</p>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold cursor-pointer"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredResults.map((item) => {
            const isExpanded = expandedExams[item.exam._id] !== false;
            const gradeBadgeClass = getGradeBadge(item.overallGrade);

            return (
              <div
                key={item.exam._id}
                className="rounded-3xl bg-card border border-border overflow-hidden transition-all shadow-xs"
              >
                {/* Result Card Header */}
                <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 bg-muted/15">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0 mt-0.5 md:mt-0">
                      <Award className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-[11px] font-bold border ${
                            item.isPassed
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                          }`}
                        >
                          {item.isPassed ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          <span>{item.statusText}</span>
                        </span>

                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Published {formatDate(item.publishedAt)}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight truncate">
                        {item.exam.name}
                      </h3>
                    </div>
                  </div>

                  {/* Summary Metric Stats & Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3 shrink-0 self-start md:self-center">
                    {/* Score Preview Pill */}
                    <div className="flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-background border border-border">
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                          Score
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-foreground">
                          {item.totalObtainedMarks} / {item.totalMaximumMarks}
                        </div>
                      </div>

                      <div className="w-px h-6 bg-border" />

                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                          Percentage
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-primary">
                          {item.percentage}%
                        </div>
                      </div>

                      <div className="w-px h-6 bg-border" />

                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                          Grade
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-foreground">
                          {item.overallGrade}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePrintResult(item)}
                      className="p-2 rounded-xl bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      title="Print Official Statement"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleExamExpand(item.exam._id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-2xs cursor-pointer"
                    >
                      <span>{isExpanded ? "Hide Breakdown" : "View Breakdown"}</span>
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Subject-by-Subject Breakdown Table */}
                {isExpanded && (
                  <div className="p-4 sm:p-6 bg-card space-y-4">
                    <div className="overflow-x-auto rounded-2xl border border-border">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                            <th className="py-3 px-4 w-12 text-center">#</th>
                            <th className="py-3 px-4">Subject</th>
                            <th className="py-3 px-4 text-center">Max Marks</th>
                            <th className="py-3 px-4 text-center">Pass Marks</th>
                            <th className="py-3 px-4 text-center">Marks Obtained</th>
                            <th className="py-3 px-4 text-center">Percentage</th>
                            <th className="py-3 px-4 text-center">Grade</th>
                            <th className="py-3 px-4 text-center">Result</th>
                            <th className="py-3 px-4">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {item.subjects.map((sub, idx) => (
                            <tr
                              key={sub.subjectId || idx}
                              className="hover:bg-muted/30 transition-colors group"
                            >
                              <td className="py-3 px-4 text-center text-muted-foreground font-mono">
                                {idx + 1}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-foreground group-hover:text-primary transition-colors">
                                  {sub.subjectName || "Subject"}
                                </div>
                                {sub.subjectCode && (
                                  <div className="text-[10px] text-muted-foreground font-mono">
                                    {sub.subjectCode}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center text-muted-foreground">
                                {sub.maximumMarks}
                              </td>
                              <td className="py-3 px-4 text-center text-muted-foreground">
                                {sub.passingMarks}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`font-bold px-2 py-0.5 rounded-lg ${
                                    sub.isPassed
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                  }`}
                                >
                                  {sub.marks !== null ? sub.marks : "—"}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center font-medium text-foreground">
                                {sub.percentage !== null ? `${sub.percentage}%` : "—"}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-md font-bold text-[11px] border ${getGradeBadge(
                                    sub.grade
                                  )}`}
                                >
                                  {sub.grade}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    sub.isPassed
                                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                      : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                  }`}
                                >
                                  {sub.isPassed ? "Pass" : "Fail"}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-muted-foreground italic text-[11px]">
                                {sub.remarks || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Progress Bar & Summary Breakdown */}
                    <div className="p-4 rounded-2xl bg-muted/20 border border-border/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="space-y-1.5 w-full sm:w-1/2">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-muted-foreground">Overall Performance:</span>
                          <span className="text-primary font-bold">{item.percentage}%</span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              item.isPassed ? "bg-primary" : "bg-rose-500"
                            }`}
                            style={{ width: `${Math.min(item.percentage, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <div className="text-right">
                          <div className="text-muted-foreground text-[10px]">Subjects Passed</div>
                          <div className="font-bold text-emerald-500">
                            {item.passedSubjects} / {item.totalSubjects}
                          </div>
                        </div>
                        <div className="w-px h-6 bg-border" />
                        <div className="text-right">
                          <div className="text-muted-foreground text-[10px]">Final Standing</div>
                          <div className="font-bold text-foreground">{item.statusText}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
