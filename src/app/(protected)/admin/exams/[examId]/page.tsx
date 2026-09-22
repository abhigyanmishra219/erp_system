"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  ArrowLeft,
  Calendar,
  Building2,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  RotateCw,
  Plus,
  Trash2,
  Edit3,
  FileCheck2,
  Users,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { formatAttendanceDate } from "@/lib/utils/date";

interface ExamTargetGroup {
  class: {
    _id: string;
    name: string;
    code?: string;
  };
  sections: Array<{
    targetId: string;
    section: {
      _id: string;
      name: string;
    };
  }>;
}

interface ExamSubjectGroup {
  class: {
    _id: string;
    name: string;
    code?: string;
  };
  subjects: Array<{
    examSubjectId: string;
    subject: {
      _id: string;
      name: string;
      code?: string;
    };
    examDate?: string;
    maximumMarks: number;
    passingMarks: number;
  }>;
}

interface ExamDetails {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: "DRAFT" | "SCHEDULED" | "ONGOING" | "COMPLETED" | "PUBLISHED";
  academicYear?: { id: string; name: string } | null;
  targets: ExamTargetGroup[];
  subjects: ExamSubjectGroup[];
  stats: {
    targetsCount: number;
    subjectsCount: number;
    totalResults: number;
    draftResults: number;
    reviewedResults: number;
    publishedResults: number;
  };
}

export default function ExamHubPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = use(params);
  const router = useRouter();

  const [exam, setExam] = useState<ExamDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"targets" | "subjects" | "stats">("targets");

  // Load Exam Details
  const fetchExamDetails = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/admin/exams/${examId}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load exam details");
      }
      setExam(json.data.exam);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to fetch exam data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExamDetails();
  }, [examId]);

  // Handle Status Update
  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/exams/${examId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update status");
      }
      setSuccessMessage(`Exam status updated to ${newStatus}`);
      fetchExamDetails();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update status");
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3">
        <RotateCw className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-xs text-muted-foreground">Loading examination details & specifications...</p>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-sm font-bold text-foreground">Examination Not Found</h3>
        <p className="text-xs text-muted-foreground">The requested exam could not be located.</p>
        <Link
          href="/admin/exams"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
        >
          Back to Exams
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/exams"
            className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-foreground">{exam.name}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  exam.status === "PUBLISHED" || exam.status === "COMPLETED"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : exam.status === "ONGOING"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : exam.status === "SCHEDULED"
                    ? "bg-primary/10 text-primary"
                    : "bg-surface-2 text-muted-foreground"
                }`}
              >
                {exam.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {exam.academicYear?.name || "Academic Session"} • {formatAttendanceDate(new Date(exam.startDate))} to{" "}
              {formatAttendanceDate(new Date(exam.endDate))}
            </p>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Switcher */}
          <select
            value={exam.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
          >
            <option value="SCHEDULED">Status: Scheduled</option>
            <option value="ONGOING">Status: Ongoing</option>
            <option value="COMPLETED">Status: Completed</option>
            <option value="PUBLISHED">Status: Published</option>
            <option value="DRAFT">Status: Draft</option>
          </select>

          <Link
            href={`/admin/exams/${exam.id}/marks`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/25 hover:opacity-90 transition-all cursor-pointer"
          >
            <Edit3 className="w-4 h-4" />
            <span>Enter Student Marks</span>
          </Link>

          <Link
            href={`/admin/results?examId=${exam.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-600/25 hover:opacity-90 transition-all cursor-pointer"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Review Results &amp; Report Cards</span>
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Target Scope
          </span>
          <span className="text-xl font-extrabold text-foreground">
            {exam.targets.length} Classes ({exam.stats.targetsCount} Sections)
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
            Total Subjects
          </span>
          <span className="text-xl font-extrabold text-primary">{exam.stats.subjectsCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
            Marks Records
          </span>
          <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
            {exam.stats.totalResults} Recorded
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
            Published Results
          </span>
          <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {exam.stats.publishedResults}
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("targets")}
          className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "targets"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Participating Classes &amp; Sections ({exam.targets.length})
        </button>
        <button
          onClick={() => setActiveTab("subjects")}
          className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "subjects"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Configured Subjects &amp; Max Marks ({exam.stats.subjectsCount})
        </button>
      </div>

      {/* TAB 1: TARGETS */}
      {activeTab === "targets" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {exam.targets.map((group) => (
              <div
                key={group.class._id}
                className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="font-bold text-xs text-foreground">{group.class.name}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {group.sections.length} sections
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {group.sections.map((s) => (
                    <span
                      key={s.targetId}
                      className="px-2.5 py-1 rounded-xl bg-surface-2 border border-border text-foreground font-semibold text-xs"
                    >
                      Sec {s.section.name}
                    </span>
                  ))}
                </div>

                <div className="pt-2 border-t border-border flex justify-end">
                  <Link
                    href={`/admin/exams/${exam.id}/marks?classId=${group.class._id}`}
                    className="text-primary hover:underline text-[11px] font-bold flex items-center gap-1"
                  >
                    Enter Marks <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: SUBJECTS */}
      {activeTab === "subjects" && (
        <div className="space-y-4">
          {exam.subjects.map((group) => (
            <div
              key={group.class._id}
              className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span>{group.class.name}</span>
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {group.subjects.length} subjects
                </span>
              </div>

              <div className="rounded-xl border border-border overflow-hidden bg-card">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Exam Date</th>
                      <th className="py-2.5 px-3">Maximum Marks</th>
                      <th className="py-2.5 px-3">Passing Marks</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {group.subjects.map((sub) => (
                      <tr key={sub.examSubjectId} className="hover:bg-surface-2/40">
                        <td className="py-2 px-3 font-semibold text-foreground">
                          {sub.subject.name}
                          {sub.subject.code && (
                            <span className="text-muted-foreground text-[10px] font-mono ml-1.5">
                              ({sub.subject.code})
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">
                          {sub.examDate ? formatAttendanceDate(new Date(sub.examDate)) : "—"}
                        </td>
                        <td className="py-2 px-3 font-bold text-foreground">{sub.maximumMarks}</td>
                        <td className="py-2 px-3 text-muted-foreground">{sub.passingMarks}</td>
                        <td className="py-2 px-3 text-right">
                          <Link
                            href={`/admin/exams/${exam.id}/marks?classId=${group.class._id}&subjectId=${sub.subject._id}&examSubjectId=${sub.examSubjectId}`}
                            className="inline-flex items-center gap-1 text-primary font-bold hover:underline text-[11px]"
                          >
                            <span>Marks</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
