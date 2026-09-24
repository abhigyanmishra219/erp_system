"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParentChild } from "@/context/ParentChildContext";
import ChildSwitcher from "../components/ChildSwitcher";
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  RefreshCw,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  GraduationCap,
  Filter,
  ChevronDown,
  Info,
  CalendarDays,
} from "lucide-react";

export default function ParentAttendancePage() {
  const { children, selectedChild, selectedChildId, isLoading: isChildrenLoading } = useParentChild();

  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedYearId, setSelectedYearId] = useState<string>("");

  const fetchAttendance = useCallback(
    async (studentId: string, month: string = "ALL", status: string = "ALL", yearId: string = "") => {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("studentId", studentId);
        if (month !== "ALL") params.set("month", month);
        if (status !== "ALL") params.set("status", status);
        if (yearId) params.set("academicYearId", yearId);

        const res = await fetch(`/api/parent/attendance?${params.toString()}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || json.message || "Failed to load attendance records");
        }

        setAttendanceData(json.data);
      } catch (err: any) {
        console.error("Error loading parent attendance:", err);
        setError(err.message || "Could not load attendance data.");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedChildId) {
      fetchAttendance(selectedChildId, selectedMonth, selectedStatus, selectedYearId);
    } else if (!isChildrenLoading && (!children || children.length === 0)) {
      setIsLoading(false);
    }
  }, [selectedChildId, selectedMonth, selectedStatus, selectedYearId, isChildrenLoading, children, fetchAttendance]);

  if (isChildrenLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-pulse">
        <div className="h-16 bg-surface-2 rounded-2xl border border-border" />
        <div className="h-32 bg-surface-2 rounded-3xl border border-border" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-surface-2 rounded-2xl border border-border" />
          ))}
        </div>
      </div>
    );
  }

  if (!children || children.length === 0) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        <div className="p-8 sm:p-12 rounded-3xl bg-card border border-border text-center shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
            <CalendarCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">No Linked Children Found</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Your parent profile does not have any active students attached. Please reach out to the school administration to link your children.
          </p>
          <div className="mt-6">
            <Link
              href="/parent/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { student, academicContext, summary, monthlyBreakdown, history } = attendanceData || {};

  const totalMarked = summary?.totalMarked ?? 0;
  const percentage = summary?.percentage ?? 0;
  const presentCount = summary?.presentCount ?? 0;
  const absentCount = summary?.absentCount ?? 0;
  const lateCount = summary?.lateCount ?? 0;
  const leaveCount = summary?.leaveCount ?? 0;

  const getPercentageTheme = (pct: number, total: number) => {
    if (total === 0) {
      return {
        badge: "bg-surface-2 text-muted-foreground border-border",
        text: "text-muted-foreground",
        label: "No Records Yet",
        barColor: "bg-muted-foreground",
      };
    }
    if (pct >= 85) {
      return {
        badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        text: "text-emerald-600 dark:text-emerald-400",
        label: "Excellent Attendance",
        barColor: "bg-emerald-500",
      };
    }
    if (pct >= 75) {
      return {
        badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        text: "text-blue-600 dark:text-blue-400",
        label: "Good Attendance (Meets 75% Criteria)",
        barColor: "bg-blue-500",
      };
    }
    if (pct >= 60) {
      return {
        badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        text: "text-amber-600 dark:text-amber-400",
        label: "Warning: Below 75% Requirement",
        barColor: "bg-amber-500",
      };
    }
    return {
      badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      text: "text-rose-600 dark:text-rose-400",
      label: "Critical: Chronic Absenteeism",
      barColor: "bg-rose-500",
    };
  };

  const pctTheme = getPercentageTheme(percentage, totalMarked);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Universal Child Switcher */}
      <section aria-label="Switch Child">
        <ChildSwitcher variant="pills" />
      </section>

      {/* 2. Header Information Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-emerald-500/15 via-card to-card border border-border p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Attendance Tracking</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              {student?.fullName || selectedChild?.student.fullName}&apos;s Attendance
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Class {student?.class?.name || selectedChild?.student.class} - {student?.section?.name || selectedChild?.student.section}
              {student?.rollNumber && ` • Roll #${student.rollNumber}`}
              {student?.admissionNumber && ` • Adm #${student.admissionNumber}`}
            </p>
          </div>

          {/* Academic Year Selector & Refresh */}
          <div className="flex items-center gap-2 flex-wrap">
            {academicContext?.availableAcademicYears && academicContext.availableAcademicYears.length > 1 && (
              <select
                aria-label="Select Academic Year"
                value={selectedYearId || academicContext.academicYear._id}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="bg-card hover:bg-surface-2 text-foreground text-xs font-semibold px-3 py-2 rounded-xl border border-border shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-primary cursor-pointer"
              >
                {academicContext.availableAcademicYears.map((ay: any) => (
                  <option key={ay._id} value={ay._id}>
                    {ay.name} {ay.status === "ACTIVE" ? "(Current)" : ""}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() =>
                selectedChildId &&
                fetchAttendance(selectedChildId, selectedMonth, selectedStatus, selectedYearId)
              }
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card hover:bg-surface-2 border border-border text-xs font-semibold text-foreground transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() =>
              selectedChildId &&
              fetchAttendance(selectedChildId, selectedMonth, selectedStatus, selectedYearId)
            }
            className="underline font-bold hover:opacity-80"
          >
            Retry
          </button>
        </div>
      )}

      {/* 3. Main KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Attendance Percentage Main KPI */}
        <div className="sm:col-span-2 lg:col-span-2 p-5 rounded-3xl bg-card border border-border shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Overall Presence
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pctTheme.badge}`}>
              {pctTheme.label}
            </span>
          </div>

          <div className="my-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-foreground tracking-tight">
                {totalMarked === 0 ? "0%" : `${percentage}%`}
              </span>
              <span className="text-xs text-muted-foreground">
                ({presentCount + lateCount} attended / {totalMarked} total marked)
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2.5 bg-surface-2 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full ${pctTheme.barColor} transition-all duration-500 rounded-full`}
                style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
              />
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>
              {totalMarked === 0
                ? "No attendance records entered for this student."
                : percentage >= 75
                ? "Student is eligible for examinations and meets the 75% threshold."
                : "Student is below the mandatory 75% minimum requirement."}
            </span>
          </div>
        </div>

        {/* Present Days */}
        <div className="p-4 sm:p-5 rounded-3xl bg-card border border-border shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Present
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-foreground">{presentCount}</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">Full day presence</p>
          </div>
        </div>

        {/* Absent Days */}
        <div className="p-4 sm:p-5 rounded-3xl bg-card border border-border shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Absent
            </span>
            <div className="w-7 h-7 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-foreground">{absentCount}</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">Unexcused missed days</p>
          </div>
        </div>

        {/* Late & Leave */}
        <div className="p-4 sm:p-5 rounded-3xl bg-card border border-border shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Late / Leave
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-foreground">{lateCount}</span>
              <span className="text-xs text-muted-foreground">Late / {leaveCount} Leave</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Approved or late arrivals</p>
          </div>
        </div>
      </div>

      {/* 4. Monthly Attendance Breakdown Carousel / Grid */}
      {monthlyBreakdown && monthlyBreakdown.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-primary" />
              <span>Monthly Performance Breakdown</span>
            </h2>
            <span className="text-xs text-muted-foreground">
              {monthlyBreakdown.length} {monthlyBreakdown.length === 1 ? "month" : "months"} recorded
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {monthlyBreakdown.map((m: any) => {
              const mTheme = getPercentageTheme(m.percentage, m.totalMarked);
              const isSelected = selectedMonth === m.monthKey;

              return (
                <button
                  key={m.monthKey}
                  type="button"
                  onClick={() => setSelectedMonth(isSelected ? "ALL" : m.monthKey)}
                  className={`p-4 rounded-2xl text-left transition-all border cursor-pointer ${
                    isSelected
                      ? "bg-primary/10 border-primary ring-1 ring-primary/40 shadow-xs"
                      : "bg-card hover:bg-surface-2 border-border hover:border-primary/40 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground truncate">{m.monthName}</span>
                    <span className="text-xs font-black text-foreground font-mono">
                      {m.totalMarked === 0 ? "0%" : `${m.percentage}%`}
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-surface-2 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full ${mTheme.barColor} rounded-full`}
                      style={{ width: `${Math.min(100, Math.max(0, m.percentage))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-2.5 text-[11px] text-muted-foreground">
                    <span>
                      <strong className="text-foreground">{m.presentCount}</strong> Present
                    </span>
                    <span>
                      <strong className="text-rose-500">{m.absentCount}</strong> Absent
                    </span>
                    <span>
                      <strong className="text-amber-500">{m.lateCount}</strong> Late
                    </span>
                    <span>
                      <strong className="text-blue-500">{m.leaveCount}</strong> Leave
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Detailed Attendance History Log & Filters */}
      <div className="p-5 sm:p-6 rounded-3xl bg-card border border-border shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Attendance Daily Log</h2>
              <p className="text-[11px] text-muted-foreground">
                Showing marked sessions for {student?.fullName || selectedChild?.student.fullName}
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-xl border border-border text-xs">
              {(["ALL", "PRESENT", "ABSENT", "LATE", "LEAVE"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStatus(st)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    selectedStatus === st
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st === "ALL" ? "All" : st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* Clear Month Filter if active */}
            {selectedMonth !== "ALL" && (
              <button
                type="button"
                onClick={() => setSelectedMonth("ALL")}
                className="px-2.5 py-1 rounded-xl bg-surface-2 hover:bg-surface-3 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors border border-border"
              >
                Clear Month Filter
              </button>
            )}
          </div>
        </div>

        {/* History Table / Cards */}
        {isLoading ? (
          <div className="space-y-2 py-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-surface-2/60 rounded-xl" />
            ))}
          </div>
        ) : history && history.length > 0 ? (
          <div className="space-y-2">
            {history.map((record: any) => {
              const recDate = new Date(record.date);
              const formattedDate = recDate.toLocaleDateString("en-IN", {
                weekday: "short",
                day: "2-digit",
                month: "short",
                year: "numeric",
              });

              let statusBadge = (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Present</span>
                </span>
              );

              if (record.status === "ABSENT") {
                statusBadge = (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Absent</span>
                  </span>
                );
              } else if (record.status === "LATE") {
                statusBadge = (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Late Arrival</span>
                  </span>
                );
              } else if (record.status === "LEAVE") {
                statusBadge = (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Approved Leave</span>
                  </span>
                );
              }

              return (
                <div
                  key={record._id}
                  className="p-3.5 rounded-2xl bg-surface-2/40 hover:bg-surface-2/80 border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-card border border-border flex flex-col items-center justify-center font-mono text-[10px] shrink-0 font-bold">
                      <span className="text-muted-foreground uppercase leading-none">
                        {recDate.toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      <span className="text-foreground text-xs leading-none mt-0.5">
                        {recDate.getDate()}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{formattedDate}</p>
                      {record.remarks ? (
                        <p className="text-[11px] text-muted-foreground truncate">{record.remarks}</p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">Standard Session</p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto">
                    {statusBadge}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-surface-2/30 border border-dashed border-border text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">No attendance records found</p>
            <p>
              {selectedStatus !== "ALL" || selectedMonth !== "ALL"
                ? "Try clearing the active filters above."
                : "Attendance has not yet been marked for this student."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
