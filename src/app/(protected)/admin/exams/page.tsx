"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Award,
  Plus,
  Search,
  Calendar,
  Building2,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  RotateCw,
  ChevronRight,
  Eye,
  FileCheck2,
  Users,
  Edit3,
  ExternalLink,
} from "lucide-react";
import { formatAttendanceDate } from "@/lib/utils/date";

interface AcademicYearOption {
  id: string;
  _id?: string;
  name: string;
  status: string;
}

interface ExamItem {
  id: string;
  name: string;
  description?: string;
  academicYear?: { id: string; name: string } | null;
  startDate: string;
  endDate: string;
  status: "DRAFT" | "SCHEDULED" | "ONGOING" | "COMPLETED" | "PUBLISHED";
  classes: Array<{ id: string; name: string }>;
  targetsCount: number;
  subjectsCount: number;
  resultStats: {
    total: number;
    draft: number;
    reviewed: number;
    published: number;
  };
  createdAt: string;
}

export default function AdminExamsPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [exams, setExams] = useState<ExamItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Initial Load Academic Years
  useEffect(() => {
    async function loadYears() {
      try {
        const res = await fetch("/api/admin/academic-years");
        const json = await res.json();
        if (json.success && json.data) {
          const list: AcademicYearOption[] = json.data.academicYears || json.data;
          setAcademicYears(list);
          const active = list.find((y) => y.status === "ACTIVE") || list[0];
          if (active) {
            setSelectedYearId(active.id || active._id || "");
          }
        }
      } catch (err) {
        console.error("Failed to load academic years:", err);
      }
    }
    loadYears();
  }, []);

  // 2. Fetch Exams List
  const fetchExams = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      if (selectedYearId) params.append("academicYearId", selectedYearId);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);

      const res = await fetch(`/api/admin/exams?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load exams");
      }
      setExams(json.data.exams || []);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to fetch exams");
      setExams([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedYearId, statusFilter, searchQuery]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  // KPI calculations
  const totalExams = exams.length;
  const ongoingExams = exams.filter((e) => e.status === "ONGOING").length;
  const scheduledExams = exams.filter((e) => e.status === "SCHEDULED").length;
  const publishedResultsExams = exams.filter((e) => e.resultStats.published > 0).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Award className="w-7 h-7 text-primary" />
            <span>Exams & Assessments</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Create exams, configure subjects & maximum marks, record student marks, and publish report cards.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/results"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-surface-2 hover:bg-surface-3 border border-border text-foreground text-xs font-bold transition-all cursor-pointer"
          >
            <FileCheck2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Review & Publish Results</span>
          </Link>
          <Link
            href="/admin/exams/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/25 hover:opacity-90 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Exam</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Total Examinations
          </span>
          <span className="text-2xl font-extrabold text-foreground">{totalExams}</span>
        </div>
        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
            Scheduled Exams
          </span>
          <span className="text-2xl font-extrabold text-primary">{scheduledExams}</span>
        </div>
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
            Ongoing Assessments
          </span>
          <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
            {ongoingExams}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
            Published Results
          </span>
          <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {publishedResultsExams}
          </span>
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

      {/* Filter Bar */}
      <div className="p-5 rounded-3xl bg-card border border-border shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Academic Session */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Academic Session
            </label>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {academicYears.map((yr) => (
                <option key={yr.id || yr._id} value={yr.id || yr._id}>
                  {yr.name} {yr.status === "ACTIVE" ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Exam Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="ALL">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="ONGOING">Ongoing</option>
              <option value="COMPLETED">Completed</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>

          {/* Search Bar */}
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Search Exams
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by exam name..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-2 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Exams Roster Table */}
      {isLoading ? (
        <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3">
          <RotateCw className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-xs text-muted-foreground">Loading examination schedules & targets...</p>
        </div>
      ) : exams.length === 0 ? (
        <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3">
          <Award className="w-10 h-10 text-muted-foreground/50 mx-auto" />
          <h3 className="text-sm font-bold text-foreground">No examinations found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No exams match your search and filter criteria. Create your first exam to configure subjects and record marks.
          </p>
          <Link
            href="/admin/exams/create"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Exam
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">Exam Name</th>
                  <th className="py-3 px-4">Date Schedule</th>
                  <th className="py-3 px-4">Classes & Sections</th>
                  <th className="py-3 px-4">Subjects</th>
                  <th className="py-3 px-4">Results Status</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {exams.map((item) => {
                  return (
                    <tr key={item.id} className="hover:bg-surface-2/40 transition-colors">
                      {/* Name & Academic Year */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <Link
                            href={`/admin/exams/${item.id}`}
                            className="font-bold text-foreground hover:text-primary transition-colors block text-xs"
                          >
                            {item.name}
                          </Link>
                          <span className="inline-block text-[10px] text-muted-foreground font-semibold">
                            {item.academicYear?.name || "Academic Session"}
                          </span>
                        </div>
                      </td>

                      {/* Date Schedule */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>{formatAttendanceDate(new Date(item.startDate))}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground block pl-4.5">
                            to {formatAttendanceDate(new Date(item.endDate))}
                          </span>
                        </div>
                      </td>

                      {/* Classes & Targets */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 items-center max-w-[200px]">
                          {item.classes.length > 0 ? (
                            item.classes.slice(0, 3).map((c) => (
                              <span
                                key={c.id}
                                className="px-2 py-0.5 rounded-lg bg-surface-2 text-foreground font-semibold text-[10px]"
                              >
                                {c.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-foreground italic text-[10px]">No targets</span>
                          )}
                          {item.classes.length > 3 && (
                            <span className="text-[10px] text-muted-foreground font-bold">
                              +{item.classes.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Subjects */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-2 border border-border text-foreground font-semibold text-[11px]">
                          <BookOpen className="w-3.5 h-3.5 text-primary" />
                          <span>{item.subjectsCount} subjects</span>
                        </span>
                      </td>

                      {/* Results Stats */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {item.resultStats.published > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              {item.resultStats.published} Published
                            </span>
                          ) : item.resultStats.reviewed > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                              {item.resultStats.reviewed} Reviewed
                            </span>
                          ) : item.resultStats.total > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              {item.resultStats.total} Entered
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground font-medium">
                              No marks entered
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Exam Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === "PUBLISHED" || item.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : item.status === "ONGOING"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : item.status === "SCHEDULED"
                              ? "bg-primary/10 text-primary"
                              : "bg-surface-2 text-muted-foreground"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/admin/exams/${item.id}/marks`}
                            title="Enter / View Marks"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Marks</span>
                          </Link>
                          <Link
                            href={`/admin/exams/${item.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-foreground text-xs font-semibold transition-colors"
                          >
                            <span>Manage</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
