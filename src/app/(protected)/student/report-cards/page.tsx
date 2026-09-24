"use client";

import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  Download,
  Printer,
  Calendar,
  Award,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Eye,
  FileText,
  User,
  ShieldCheck,
  Sparkles,
  X,
  Building,
  School as SchoolIcon,
  ChevronRight,
} from "lucide-react";
import { ReportCardData } from "@/lib/services/reportCardService";

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

interface SummaryStats {
  totalPublishedReportCards: number;
  passedReportCards: number;
  failedReportCards: number;
  averagePercentage: number;
}

export default function StudentReportCardsPage() {
  const [loading, setLoading] = useState(true);
  const [reportCards, setReportCards] = useState<ReportCardSummaryItem[]>([]);
  const [summary, setSummary] = useState<SummaryStats>({
    totalPublishedReportCards: 0,
    passedReportCards: 0,
    failedReportCards: 0,
    averagePercentage: 0,
  });
  const [academicContext, setAcademicContext] = useState<AcademicContext | null>(null);

  // Search & Modal UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [modalReportCard, setModalReportCard] = useState<ReportCardData | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchReportCards = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/student/report-cards");
      if (!res.ok) throw new Error("Failed to fetch published report cards");

      const json = await res.json();
      if (json.success && json.data) {
        setReportCards(json.data.reportCards || []);
        setSummary(json.data.summary || {});
        setAcademicContext(json.data.academicContext || null);
      }
    } catch (err) {
      console.error("Error fetching report cards:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportCards();
  }, []);

  const handleOpenReportCardModal = async (examId: string) => {
    setSelectedExamId(examId);
    setModalLoading(true);
    setModalReportCard(null);
    try {
      const res = await fetch(`/api/student/report-cards/${examId}`);
      const json = await res.json();
      if (json.success && json.data?.reportCard) {
        setModalReportCard(json.data.reportCard);
      }
    } catch (err) {
      console.error("Error loading report card details:", err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDownloadPdf = async (examId: string, examName: string) => {
    try {
      setDownloadingId(examId);
      const res = await fetch(`/api/student/report-cards/${examId}/pdf`);
      if (!res.ok) throw new Error("Failed to generate PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Report_Card_${examName.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error downloading report card PDF:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePrintModal = () => {
    window.print();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getGradeBadge = (grade: string) => {
    const g = grade.toUpperCase();
    if (g.startsWith("A")) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    if (g.startsWith("B")) return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    if (g.startsWith("C") || g.startsWith("D")) return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
  };

  const filteredCards = reportCards.filter((rc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return rc.examName.toLowerCase().includes(q) || rc.academicYear.name.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-card via-card to-primary/5 border border-border p-6 rounded-3xl shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <GraduationCap className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Academic Report Cards
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Access, view, print, and download your official examination report cards and academic statements.
          </p>
        </div>

        {/* Academic Profile Badge */}
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
              <span>Verified Records</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Official Publication Notice */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/20 text-xs">
        <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-foreground">Official Institution Credentials:</span>
          <p className="text-muted-foreground leading-relaxed">
            Report cards displayed here are verified and officially published by the school administration. Downloaded PDFs carry the institution's verification seal and academic endorsement.
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
            <div className="text-xs text-muted-foreground font-medium">Published Cards</div>
            <div className="text-lg sm:text-xl font-bold text-foreground">
              {summary.totalPublishedReportCards || 0}
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
              {summary.averagePercentage || 0}%
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Passed Exams</div>
            <div className="text-lg sm:text-xl font-bold text-foreground">
              {summary.passedReportCards || 0}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Academic Year</div>
            <div className="text-xs sm:text-sm font-bold text-foreground truncate">
              {academicContext?.academicYear?.name || "Current Session"}
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
            placeholder="Search report cards by exam name..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-2xl bg-background border border-border focus:outline-hidden focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setSearchQuery("");
            fetchReportCards();
          }}
          title="Refresh"
          className="p-2 rounded-2xl bg-background border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 5. Report Cards Content Area */}
      {loading ? (
        <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground font-medium">Loading published report cards...</p>
        </div>
      ) : reportCards.length === 0 ? (
        <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-foreground">No report cards available yet.</h3>
            <p className="text-xs text-muted-foreground">
              Report cards will appear here once they are published by the school.
            </p>
          </div>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="p-10 rounded-3xl bg-card border border-border text-center space-y-2">
          <p className="text-xs text-muted-foreground">No report cards match "{searchQuery}".</p>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold cursor-pointer"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCards.map((rc) => {
            const isDownloading = downloadingId === rc.examId;

            return (
              <div
                key={rc.examId}
                className="p-6 rounded-3xl bg-card border border-border hover:border-primary/40 transition-all flex flex-col justify-between gap-5 shadow-xs group"
              >
                {/* Card Header */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-[11px] font-bold border ${
                        rc.isPassed
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      }`}
                    >
                      {rc.isPassed ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span>{rc.statusText}</span>
                    </span>

                    <span className="px-2.5 py-0.5 rounded-xl bg-muted text-[11px] font-semibold text-muted-foreground">
                      {rc.academicYear.name}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {rc.examName}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Published: {formatDate(rc.publishedAt)}</span>
                      </span>
                      <span>•</span>
                      <span>{rc.totalSubjects} Subjects</span>
                    </div>
                  </div>
                </div>

                {/* Score & KPI Snapshot */}
                <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/80 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                      Aggregate
                    </div>
                    <div className="font-bold text-foreground text-sm">
                      {rc.totalObtainedMarks} / {rc.totalMaximumMarks}
                    </div>
                  </div>

                  <div className="w-px h-6 bg-border" />

                  <div>
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                      Percentage
                    </div>
                    <div className="font-bold text-primary text-sm">
                      {rc.percentage}%
                    </div>
                  </div>

                  <div className="w-px h-6 bg-border" />

                  <div>
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                      Grade
                    </div>
                    <div className="font-bold text-foreground text-sm">
                      {rc.overallGrade}
                    </div>
                  </div>

                  <div className="w-px h-6 bg-border" />

                  <div>
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                      Attendance
                    </div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {rc.attendancePercentage.toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-border/60 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenReportCardModal(rc.examId)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-2xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Statement</span>
                  </button>

                  <button
                    type="button"
                    disabled={isDownloading}
                    onClick={() => handleDownloadPdf(rc.examId, rc.examName)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-2xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    {isDownloading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>{isDownloading ? "Generating..." : "Download PDF"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Full Interactive Report Card Statement Modal */}
      {selectedExamId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-card border border-border rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[92vh] overflow-y-auto">
            {/* Modal Controls Top Bar (Hidden on print) */}
            <div className="print:hidden flex items-center justify-between gap-4 border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-primary/10 text-primary">
                  <GraduationCap className="w-5 h-5" />
                </span>
                <span className="text-sm font-bold text-foreground">
                  Official Academic Report Card
                </span>
              </div>

              <div className="flex items-center gap-2">
                {modalReportCard && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(modalReportCard.exam.id, modalReportCard.exam.name)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedExamId(null);
                    setModalReportCard(null);
                  }}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            {modalLoading ? (
              <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs font-medium">Assembling official academic statement...</p>
              </div>
            ) : !modalReportCard ? (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <p className="text-xs">Unable to load report card details.</p>
              </div>
            ) : (
              <div
                id="printable-student-report-card"
                className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 print:border-none print:p-0 print:m-0"
              >
                {/* 1. School Header */}
                <div className="text-center border-b-2 border-slate-200 dark:border-slate-800 pb-5 space-y-2">
                  <div className="flex items-center justify-center gap-3">
                    {modalReportCard.school.logo ? (
                      <img
                        src={modalReportCard.school.logo}
                        alt={modalReportCard.school.name}
                        className="h-12 w-12 object-contain rounded-lg"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl shadow-xs">
                        {modalReportCard.school.name.charAt(0)}
                      </div>
                    )}
                    <div className="text-left">
                      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
                        {modalReportCard.school.name}
                      </h2>
                      {modalReportCard.school.tagline && (
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 italic">
                          {modalReportCard.school.tagline}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-400 max-w-xl mx-auto space-y-0.5">
                    {modalReportCard.school.address && (
                      <div>
                        {modalReportCard.school.address}, {modalReportCard.school.city}, {modalReportCard.school.state}
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-3 flex-wrap text-[11px]">
                      {modalReportCard.school.phone && <span>Tel: {modalReportCard.school.phone}</span>}
                      {modalReportCard.school.email && <span>• Email: {modalReportCard.school.email}</span>}
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="inline-block px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Official Statement of Marks
                    </div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                      {modalReportCard.exam.name} • {modalReportCard.exam.academicYear?.name}
                    </div>
                  </div>
                </div>

                {/* 2. Student Profile Snapshot */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
                  <div className="sm:col-span-1 flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-800 pb-3 sm:pb-0 sm:pr-4">
                    <div className="w-16 h-16 rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 mb-1 shadow-2xs">
                      {modalReportCard.student.photo ? (
                        <img
                          src={modalReportCard.student.photo}
                          alt={modalReportCard.student.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-8 w-8 text-slate-400" />
                      )}
                    </div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white text-center">
                      {modalReportCard.student.name}
                    </span>
                  </div>

                  <div className="sm:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4 pl-0 sm:pl-2">
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 block text-[11px]">Admission No</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {modalReportCard.student.admissionNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 block text-[11px]">Roll Number</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {modalReportCard.student.rollNumber || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 block text-[11px]">Class & Section</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {modalReportCard.student.class.name} - Section {modalReportCard.student.section.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 block text-[11px]">Date of Birth</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatDate(modalReportCard.student.dob)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 block text-[11px]">Father's Name</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {modalReportCard.student.fatherName || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 block text-[11px]">Mother's Name</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {modalReportCard.student.motherName || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Subject Evaluation Table */}
                <div>
                  <table className="w-full border-collapse text-xs border border-slate-200 dark:border-slate-800">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                        <th className="py-2 px-3 text-left w-10">#</th>
                        <th className="py-2 px-3 text-left">Subject</th>
                        <th className="py-2 px-3 text-center w-20">Max</th>
                        <th className="py-2 px-3 text-center w-20">Pass</th>
                        <th className="py-2 px-3 text-center w-24">Obtained</th>
                        <th className="py-2 px-3 text-center w-16">Grade</th>
                        <th className="py-2 px-3 text-left w-28">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {modalReportCard.academic.subjects.map((sub, idx) => (
                        <tr key={sub.subjectId} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                            {sub.subjectName}
                            {sub.subjectCode && (
                              <span className="ml-1 text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                                ({sub.subjectCode})
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400">{sub.maximumMarks}</td>
                          <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400">{sub.passingMarks}</td>
                          <td className="py-2 px-3 text-center font-bold text-slate-900 dark:text-white">
                            {sub.marks !== null ? sub.marks : "—"}
                          </td>
                          <td className="py-2 px-3 text-center font-bold">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                sub.isPassed
                                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                                  : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                              }`}
                            >
                              {sub.grade}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400 text-[11px]">
                            {sub.remarks || (sub.isPassed ? "Pass" : "Needs Review")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 dark:bg-slate-900 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                        <td colSpan={2} className="py-2 px-3 text-right uppercase tracking-wider">
                          Grand Total:
                        </td>
                        <td className="py-2 px-3 text-center">{modalReportCard.academic.totalMaximumMarks}</td>
                        <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400">—</td>
                        <td className="py-2 px-3 text-center text-sm font-extrabold text-primary">
                          {modalReportCard.academic.totalObtainedMarks}
                        </td>
                        <td className="py-2 px-3 text-center text-sm font-extrabold">
                          {modalReportCard.academic.overallGrade}
                        </td>
                        <td className="py-2 px-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {modalReportCard.academic.statusText}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* 4. Aggregate Performance & Attendance */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                    <div className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 text-[11px]">
                      Academic Standing
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="block text-[10px] text-slate-600 dark:text-slate-400">Percentage</span>
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {modalReportCard.academic.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="block text-[10px] text-slate-600 dark:text-slate-400">Grade</span>
                        <span className="text-sm font-extrabold text-primary">
                          {modalReportCard.academic.overallGrade}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="block text-[10px] text-slate-600 dark:text-slate-400">Result</span>
                        <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                          {modalReportCard.academic.statusText}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                    <div className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 text-[11px]">
                      Attendance Summary
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="block text-[10px] text-slate-600 dark:text-slate-400">Total Days</span>
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {modalReportCard.attendance.totalSessions}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="block text-[10px] text-slate-600 dark:text-slate-400">Present</span>
                        <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                          {modalReportCard.attendance.present}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="block text-[10px] text-slate-600 dark:text-slate-400">Attendance %</span>
                        <span className="text-sm font-extrabold text-primary">
                          {modalReportCard.attendance.attendancePercentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Grading Scale Key */}
                {modalReportCard.gradingScales && (
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] bg-slate-50/50 dark:bg-slate-900/30">
                    <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Grading Scale Legend:
                    </span>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-slate-600 dark:text-slate-400">
                      {modalReportCard.gradingScales.map((s) => (
                        <span key={s.grade}>
                          <strong className="text-slate-900 dark:text-white">{s.grade}</strong>: {s.minPercentage}%-{s.maxPercentage}%
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. Signatures */}
                <div className="pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-6 text-center text-[11px]">
                  <div>
                    <div className="h-8 border-b border-dashed border-slate-400 dark:border-slate-600 mb-1.5" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Class Teacher</span>
                  </div>
                  <div>
                    <div className="h-8 border-b border-dashed border-slate-400 dark:border-slate-600 mb-1.5" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Exam Controller</span>
                  </div>
                  <div>
                    <div className="h-8 border-b border-dashed border-slate-400 dark:border-slate-600 mb-1.5" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Principal & Seal</span>
                  </div>
                </div>

                {/* Footer Timestamp */}
                <div className="text-center text-[10px] text-slate-600 dark:text-slate-400 pt-2">
                  Official Record • Issued by {modalReportCard.school.name} on {formatDate(modalReportCard.generatedAt)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Embedded Print CSS */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 0;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              nav, aside, header, footer, .print\\:hidden, [role="navigation"] {
                display: none !important;
              }
              #printable-student-report-card {
                border: none !important;
                box-shadow: none !important;
                padding: 10mm 12mm !important;
                margin: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                background: #ffffff !important;
                color: #000000 !important;
              }
              a[href]::after {
                content: none !important;
              }
            }
          `,
        }}
      />
    </div>
  );
}
