"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParentChild } from "@/context/ParentChildContext";
import ChildSwitcher from "../components/ChildSwitcher";
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
  Download,
  FileText,
  Clock,
  Eye,
  Building,
  School as SchoolIcon,
  User,
} from "lucide-react";
import { ReportCardData } from "@/lib/services/reportCardService";

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

interface ReportCardSummaryItem {
  examId: string;
  examName: string;
  academicYear: {
    id: string;
    name: string;
  };
  startDate: string;
  endDate: string;
  publishedAt: string;
  totalObtainedMarks: number;
  totalMaximumMarks: number;
  percentage: number;
  overallGrade: string;
  isPassed: boolean;
  statusText: "PASSED" | "FAILED" | "INCOMPLETE";
  totalSubjects: number;
  attendancePercentage: number;
  resultStatus: "PUBLISHED";
}

export default function ParentResultsPage() {
  const { children, selectedChild, selectedChildId, isLoading: isChildrenLoading } = useParentChild();

  const [activeTab, setActiveTab] = useState<"results" | "reportCards">("results");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Results state
  const [results, setResults] = useState<ExamResultCard[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalPublishedExams: 0,
    totalEvaluatedSubjects: 0,
    passedExams: 0,
    failedExams: 0,
    overallAveragePercentage: 0,
  });
  const [academicContext, setAcademicContext] = useState<AcademicContext | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Report cards state
  const [reportCards, setReportCards] = useState<ReportCardSummaryItem[]>([]);
  const [rcLoading, setRcLoading] = useState(false);
  const [modalReportCard, setModalReportCard] = useState<ReportCardData | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Fetch Results for the selected child
  const fetchResults = useCallback(async (studentId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/parent/results?studentId=${studentId}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || json.message || "Failed to load examination results");
      }

      if (json.data) {
        setResults(json.data.examResults || []);
        setSummary(
          json.data.summary || {
            totalPublishedExams: 0,
            totalEvaluatedSubjects: 0,
            passedExams: 0,
            failedExams: 0,
            overallAveragePercentage: 0,
          }
        );
        setAcademicContext(json.data.academicContext || null);
        if (json.data.examResults && json.data.examResults.length > 0) {
          setSelectedExamId(json.data.examResults[0].exam._id);
        } else {
          setSelectedExamId(null);
        }
      }
    } catch (err: any) {
      console.error("Error fetching results:", err);
      setError(err.message || "Failed to load results");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Report Cards for the selected child
  const fetchReportCards = useCallback(async (studentId: string) => {
    try {
      setRcLoading(true);
      const res = await fetch(`/api/parent/results/report-cards?studentId=${studentId}`);
      const json = await res.json();

      if (res.ok && json.success && json.data) {
        setReportCards(json.data.reportCards || []);
      }
    } catch (err: any) {
      console.error("Error fetching report cards:", err);
    } finally {
      setRcLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      fetchResults(selectedChildId);
      fetchReportCards(selectedChildId);
    }
  }, [selectedChildId, fetchResults, fetchReportCards]);

  // Open Report Card Modal
  const handleViewReportCard = async (examId: string) => {
    if (!selectedChildId) return;
    try {
      setModalLoading(true);
      const res = await fetch(
        `/api/parent/results/report-cards/${examId}?studentId=${selectedChildId}`
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load official report card");
      }
      setModalReportCard(json.data.reportCard);
    } catch (err: any) {
      alert(err.message || "Could not retrieve report card");
    } finally {
      setModalLoading(false);
    }
  };

  // Download Report Card PDF
  const handleDownloadPdf = async (examId: string, examName: string) => {
    if (!selectedChildId) return;
    try {
      setDownloadingId(examId);
      const res = await fetch(
        `/api/parent/results/report-cards/${examId}/pdf?studentId=${selectedChildId}`
      );
      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        throw new Error(errorJson?.error?.message || "Failed to download report card PDF");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeExamName = examName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
      const childName = selectedChild?.student?.fullName
        ? selectedChild.student.fullName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase()
        : "child";
      a.download = `report_card_${safeExamName}_${childName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "Could not download report card");
    } finally {
      setDownloadingId(null);
    }
  };

  const activeExam = results.find((r) => r.exam._id === selectedExamId) || results[0];

  const filteredSubjects = activeExam?.subjects.filter((sub) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      sub.subjectName?.toLowerCase().includes(query) ||
      sub.subjectCode?.toLowerCase().includes(query) ||
      sub.grade?.toLowerCase().includes(query)
    );
  });

  const getGradeBadge = (grade: string) => {
    const g = grade.toUpperCase();
    if (g.startsWith("A")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (g.startsWith("B")) {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
    if (g.startsWith("C")) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (g.startsWith("D")) {
      return "bg-orange-50 text-orange-700 border-orange-200";
    }
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header with ChildSwitcher */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <GraduationCap className="h-4 w-4" />
            <span>Academic Performance</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Results & Report Cards</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            View published examination marks, grades, and official report cards for your child.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <ChildSwitcher />
          {selectedChildId && (
            <button
              onClick={() => {
                fetchResults(selectedChildId);
                fetchReportCards(selectedChildId);
              }}
              disabled={loading || rcLoading}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading || rcLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* No Children Guard */}
      {!isChildrenLoading && (!children || children.length === 0) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No Linked Students Found</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Your parent account is not currently linked to any active student records in the school system.
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 h-28" />
          ))}
        </div>
      )}

      {/* Error Banner */}
      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Main Content Area */}
      {!loading && !error && selectedChildId && (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Average</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">
                    {summary.overallAveragePercentage}%
                  </h3>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                <span>Across all published exams</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Passed Exams</p>
                  <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                    {summary.passedExams}
                  </h3>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <span>{summary.totalPublishedExams} published evaluation cycles</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Evaluations</p>
                  <h3 className="text-2xl font-bold text-blue-600 mt-1">
                    {summary.totalEvaluatedSubjects}
                  </h3>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <BookOpen className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <span>Subject scores finalized & verified</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-purple-200 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Report Cards</p>
                  <h3 className="text-2xl font-bold text-purple-600 mt-1">
                    {reportCards.length}
                  </h3>
                </div>
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                  <Award className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <span>Available for official download</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
            <button
              onClick={() => setActiveTab("results")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                activeTab === "results"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Exam Results Breakdown</span>
              <span
                className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                  activeTab === "results" ? "bg-indigo-700 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {results.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("reportCards")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                activeTab === "reportCards"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Award className="h-4 w-4" />
              <span>Official Report Cards</span>
              <span
                className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                  activeTab === "reportCards" ? "bg-indigo-700 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {reportCards.length}
              </span>
            </button>
          </div>

          {/* TAB 1: EXAM RESULTS BREAKDOWN */}
          {activeTab === "results" && (
            <div className="space-y-6">
              {results.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileSpreadsheet className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">No Published Results Available</h3>
                  <p className="text-slate-500 text-sm max-w-md mx-auto">
                    There are no published exam results yet for {selectedChild?.student?.fullName || "this student"}. Results will appear here once finalized and published by the administration.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Exam List */}
                  <div className="lg:col-span-4 space-y-3">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-1">
                      Published Examinations
                    </h2>
                    <div className="space-y-2">
                      {results.map((res) => {
                        const isSelected = selectedExamId === res.exam._id;
                        return (
                          <div
                            key={res.exam._id}
                            onClick={() => setSelectedExamId(res.exam._id)}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                              isSelected
                                ? "bg-white border-indigo-500 shadow-md ring-2 ring-indigo-50"
                                : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-bold text-slate-900">{res.exam.name}</h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {res.totalSubjects} Subjects Evaluated
                                </p>
                              </div>
                              <span
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                                  res.isPassed
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border-rose-200"
                                }`}
                              >
                                {res.overallGrade} ({res.percentage}%)
                              </span>
                            </div>

                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-slate-400" />
                                {res.publishedAt
                                  ? new Date(res.publishedAt).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })
                                  : "Recently published"}
                              </span>
                              <span className="font-semibold text-slate-700">
                                {res.totalObtainedMarks} / {res.totalMaximumMarks}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Selected Exam Details */}
                  {activeExam && (
                    <div className="lg:col-span-8 space-y-6">
                      {/* Exam Performance Banner */}
                      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 rounded-2xl shadow-md">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-lg text-xs font-medium text-indigo-200 backdrop-blur-sm mb-2">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                              <span>Verified Official Result</span>
                            </div>
                            <h2 className="text-2xl font-bold tracking-tight">{activeExam.exam.name}</h2>
                            <p className="text-indigo-200 text-xs mt-1">
                              Student: {academicContext?.student.name} • Class: {academicContext?.class.name} - {academicContext?.section.name}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 bg-white/10 p-3.5 rounded-xl backdrop-blur-sm">
                            <div className="text-right">
                              <p className="text-xs text-indigo-200 font-medium uppercase">Overall Grade</p>
                              <p className="text-2xl font-black text-white">{activeExam.overallGrade}</p>
                            </div>
                            <div className="h-8 w-px bg-white/20" />
                            <div>
                              <p className="text-xs text-indigo-200 font-medium uppercase">Percentage</p>
                              <p className="text-2xl font-black text-emerald-300">{activeExam.percentage}%</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-indigo-300 block">Total Marks:</span>
                            <span className="font-bold text-white text-sm">
                              {activeExam.totalObtainedMarks} / {activeExam.totalMaximumMarks}
                            </span>
                          </div>
                          <div>
                            <span className="text-indigo-300 block">Status:</span>
                            <span className={`font-bold text-sm ${activeExam.isPassed ? "text-emerald-300" : "text-rose-300"}`}>
                              {activeExam.statusText}
                            </span>
                          </div>
                          <div>
                            <span className="text-indigo-300 block">Subjects Passed:</span>
                            <span className="font-bold text-white text-sm">
                              {activeExam.passedSubjects} of {activeExam.totalSubjects}
                            </span>
                          </div>
                          <div className="flex items-center justify-end">
                            <button
                              onClick={() => handleViewReportCard(activeExam.exam._id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-indigo-900 hover:bg-indigo-50 font-bold rounded-lg transition-colors shadow-sm text-xs"
                            >
                              <Award className="h-3.5 w-3.5" />
                              <span>View Report Card</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Subject Marks Table */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                          <div>
                            <h3 className="font-bold text-slate-900">Subject-wise Evaluation</h3>
                            <p className="text-xs text-slate-500">Breakdown of marks, percentage, and teacher feedback.</p>
                          </div>
                          <div className="relative">
                            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Search subject..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-sm">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-semibold">
                                <th className="p-3.5 pl-5">Subject</th>
                                <th className="p-3.5">Marks Obtained</th>
                                <th className="p-3.5">Max Marks</th>
                                <th className="p-3.5">Pass Marks</th>
                                <th className="p-3.5">Percentage</th>
                                <th className="p-3.5">Grade</th>
                                <th className="p-3.5">Status</th>
                                <th className="p-3.5 pr-5">Teacher Remarks</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredSubjects && filteredSubjects.length > 0 ? (
                                filteredSubjects.map((sub, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="p-3.5 pl-5 font-semibold text-slate-900">
                                      <div>
                                        <span>{sub.subjectName || "Subject"}</span>
                                        {sub.subjectCode && (
                                          <span className="block text-xs font-normal text-slate-400">
                                            {sub.subjectCode}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-3.5 font-bold text-slate-800">
                                      {sub.marks !== null ? sub.marks : "-"}
                                    </td>
                                    <td className="p-3.5 text-slate-500">{sub.maximumMarks}</td>
                                    <td className="p-3.5 text-slate-500">{sub.passingMarks}</td>
                                    <td className="p-3.5 font-medium text-slate-700">
                                      {sub.percentage !== null ? `${sub.percentage}%` : "-"}
                                    </td>
                                    <td className="p-3.5">
                                      <span
                                        className={`inline-block px-2 py-0.5 text-xs font-bold rounded border ${getGradeBadge(
                                          sub.grade
                                        )}`}
                                      >
                                        {sub.grade}
                                      </span>
                                    </td>
                                    <td className="p-3.5">
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${
                                          sub.isPassed
                                            ? "bg-emerald-50 text-emerald-700"
                                            : "bg-rose-50 text-rose-700"
                                        }`}
                                      >
                                        {sub.isPassed ? (
                                          <>
                                            <CheckCircle2 className="h-3 w-3" />
                                            <span>PASS</span>
                                          </>
                                        ) : (
                                          <>
                                            <XCircle className="h-3 w-3" />
                                            <span>FAIL</span>
                                          </>
                                        )}
                                      </span>
                                    </td>
                                    <td className="p-3.5 pr-5 text-xs text-slate-500 max-w-xs truncate">
                                      {sub.remarks || "-"}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={8} className="p-8 text-center text-slate-400 text-sm">
                                    No subjects match the search filter.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OFFICIAL REPORT CARDS */}
          {activeTab === "reportCards" && (
            <div className="space-y-6">
              {reportCards.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                  <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">No Published Report Cards</h3>
                  <p className="text-slate-500 text-sm max-w-md mx-auto">
                    Official report cards for {selectedChild?.student?.fullName || "this student"} will appear here once released by the school.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {reportCards.map((rc) => (
                    <div
                      key={rc.examId}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                            <FileText className="h-5 w-5" />
                          </div>
                          <span
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                              rc.isPassed
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            Grade: {rc.overallGrade} ({rc.percentage}%)
                          </span>
                        </div>

                        <h3 className="font-bold text-slate-900 text-lg">{rc.examName}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Academic Year: {rc.academicYear.name}
                        </p>

                        <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Score:</span>
                            <span className="font-bold text-slate-800">
                              {rc.totalObtainedMarks} / {rc.totalMaximumMarks}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Subjects:</span>
                            <span className="font-bold text-slate-800">{rc.totalSubjects} Evaluated</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Attendance:</span>
                            <span className="font-bold text-slate-800">{rc.attendancePercentage}%</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Status:</span>
                            <span
                              className={`font-bold ${
                                rc.isPassed ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {rc.statusText}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
                        <button
                          onClick={() => handleViewReportCard(rc.examId)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View Card</span>
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(rc.examId, rc.examName)}
                          disabled={downloadingId === rc.examId}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                        >
                          <Download
                            className={`h-3.5 w-3.5 ${
                              downloadingId === rc.examId ? "animate-bounce" : ""
                            }`}
                          />
                          <span>{downloadingId === rc.examId ? "Generating..." : "Download PDF"}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* REPORT CARD MODAL VIEWER */}
      {modalReportCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-lg">Official Academic Report Card</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    handleDownloadPdf(modalReportCard.exam.id, modalReportCard.exam.name)
                  }
                  disabled={downloadingId === modalReportCard.exam.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => setModalReportCard(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Report Card Content */}
            <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* School Header */}
              <div className="text-center border-b border-slate-200 pb-5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  {modalReportCard.school.name}
                </h2>
                {modalReportCard.school.tagline && (
                  <p className="text-xs text-slate-500 font-medium italic mt-0.5">
                    {modalReportCard.school.tagline}
                  </p>
                )}
                <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center justify-center gap-2">
                  {modalReportCard.school.address && <span>{modalReportCard.school.address}</span>}
                  {modalReportCard.school.phone && <span>• Tel: {modalReportCard.school.phone}</span>}
                  {modalReportCard.school.email && <span>• Email: {modalReportCard.school.email}</span>}
                </div>
                <div className="mt-3 inline-block px-3 py-1 bg-slate-900 text-white font-bold text-xs rounded-full uppercase tracking-wider">
                  {modalReportCard.exam.name} • {modalReportCard.exam.academicYear.name}
                </div>
              </div>

              {/* Student Metadata Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Student Name:</span>
                  <span className="font-bold text-slate-900">{modalReportCard.student.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Admission No:</span>
                  <span className="font-bold text-slate-900">
                    {modalReportCard.student.admissionNumber}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Roll Number:</span>
                  <span className="font-bold text-slate-900">
                    {modalReportCard.student.rollNumber || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Class & Section:</span>
                  <span className="font-bold text-slate-900">
                    {modalReportCard.student.class.name} - {modalReportCard.student.section.name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Attendance:</span>
                  <span className="font-bold text-slate-900">
                    {modalReportCard.attendance.present} / {modalReportCard.attendance.totalSessions} sessions (
                    {modalReportCard.attendance.attendancePercentage}%)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Date of Issue:</span>
                  <span className="font-bold text-slate-900">
                    {new Date(modalReportCard.generatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Subject Results Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Max Marks</th>
                      <th className="p-3">Pass Marks</th>
                      <th className="p-3">Obtained</th>
                      <th className="p-3">Percentage</th>
                      <th className="p-3">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {modalReportCard.academic.subjects.map((sub, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-900">
                          {sub.subjectName}
                          {sub.subjectCode && (
                            <span className="block text-[10px] text-slate-400 font-normal">
                              {sub.subjectCode}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600">{sub.maximumMarks}</td>
                        <td className="p-3 text-slate-600">{sub.passingMarks}</td>
                        <td className="p-3 font-bold text-slate-900">
                          {sub.marks !== null ? sub.marks : "-"}
                        </td>
                        <td className="p-3 text-slate-700">
                          {sub.percentage !== null ? `${sub.percentage}%` : "-"}
                        </td>
                        <td className="p-3 font-bold text-slate-900">{sub.grade}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                    <tr>
                      <td className="p-3">TOTAL & SUMMARY</td>
                      <td className="p-3">{modalReportCard.academic.totalMaximumMarks}</td>
                      <td className="p-3">-</td>
                      <td className="p-3 text-indigo-700">
                        {modalReportCard.academic.totalObtainedMarks}
                      </td>
                      <td className="p-3 text-indigo-700">{modalReportCard.academic.percentage}%</td>
                      <td className="p-3 text-indigo-700">{modalReportCard.academic.overallGrade}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Footer Summary / Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Academic Status
                  </p>
                  <p
                    className={`text-lg font-black ${
                      modalReportCard.academic.isPassed ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    RESULT: {modalReportCard.academic.statusText}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Overall Percentage: {modalReportCard.academic.percentage}% • Grade:{" "}
                    {modalReportCard.academic.overallGrade}
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Evaluation Scale
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1 text-[10px] text-slate-600">
                    {modalReportCard.gradingScales &&
                      modalReportCard.gradingScales.map((s, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-white rounded border border-slate-200">
                          {s.grade}: {s.minPercentage}-{s.maxPercentage}%
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
