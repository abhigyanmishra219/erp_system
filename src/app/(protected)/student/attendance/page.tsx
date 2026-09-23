"use client";

import React, { useEffect, useState } from "react";
import {
  CalendarCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock4,
  FileCheck2,
  Filter,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  BarChart3,
  CalendarDays,
  Layers,
  ChevronDown,
  Info,
} from "lucide-react";

interface AttendanceData {
  academicContext: {
    academicYear: {
      _id: string;
      name: string;
      status: string;
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
    availableAcademicYears: Array<{
      _id: string;
      name: string;
      status: string;
      isCurrent: boolean;
    }>;
  };
  summary: {
    totalMarked: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    leaveCount: number;
    attendedCount: number;
    percentage: number;
  };
  monthlyBreakdown: Array<{
    monthKey: string;
    monthName: string;
    year: number;
    month: number;
    totalMarked: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    leaveCount: number;
    attendedCount: number;
    percentage: number;
  }>;
  history: Array<{
    _id: string;
    date: string;
    dayOfWeek: string;
    status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
    remarks: string;
  }>;
}

export default function StudentAttendancePage() {
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  const fetchAttendance = async (yearId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (yearId) params.set("academicYearId", yearId);

      const res = await fetch(`/api/student/attendance?${params.toString()}`);
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || "Failed to load attendance records");
      }

      setData(result.data);
      if (!selectedYearId && result.data.academicContext.academicYear._id) {
        setSelectedYearId(result.data.academicContext.academicYear._id);
      }
    } catch (err: any) {
      console.error("Attendance fetch error:", err);
      setError(err.message || "Network error loading attendance");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const handleYearChange = (yearId: string) => {
    setSelectedYearId(yearId);
    setSelectedMonth("ALL");
    setSelectedStatus("ALL");
    fetchAttendance(yearId);
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Loading your attendance records...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto bg-card rounded-3xl border border-destructive/30 shadow-lg mt-8 space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="text-lg font-bold text-foreground">Unable to load attendance</h2>
        <p className="text-xs text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={() => fetchAttendance(selectedYearId)}
          className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90 transition shadow-xs cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { academicContext, summary, monthlyBreakdown, history } = data;

  // Filter history logs on client
  const filteredHistory = history.filter((rec) => {
    if (selectedStatus !== "ALL" && rec.status !== selectedStatus) return false;
    if (selectedMonth !== "ALL") {
      const d = new Date(rec.date);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const monthKey = `${d.getFullYear()}-${mm}`;
      if (monthKey !== selectedMonth) return false;
    }
    return true;
  });

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      {/* 1. Header & Academic Year Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-card via-card to-primary/5 border border-border p-6 rounded-3xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Attendance Record</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              Class {academicContext.class.name} - {academicContext.section.name}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Track your daily attendance sessions and monthly consistency
          </p>
        </div>

        {/* Academic Year Selector */}
        {academicContext.availableAcademicYears.length > 0 && (
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Session:</label>
            <div className="relative w-full sm:w-48">
              <select
                value={selectedYearId}
                onChange={(e) => handleYearChange(e.target.value)}
                className="w-full appearance-none px-3.5 py-2 pr-9 rounded-2xl bg-background border border-border text-foreground text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition cursor-pointer"
              >
                {academicContext.availableAcademicYears.map((yr) => (
                  <option key={yr._id} value={yr._id}>
                    {yr.name} {yr.status === "ACTIVE" ? "(Current)" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* 2. Key Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Attendance Rate */}
        <div className="p-4 sm:p-5 rounded-3xl bg-card border border-border shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Attendance Rate
          </span>
          <div className="flex items-baseline gap-1.5 my-1">
            <span
              className={`text-2xl sm:text-3xl font-extrabold ${
                summary.percentage >= 75
                  ? "text-emerald-600 dark:text-emerald-400"
                  : summary.percentage >= 60
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-destructive"
              }`}
            >
              {summary.percentage}%
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground block mt-1">
            {summary.attendedCount} of {summary.totalMarked} marked
          </span>
        </div>

        {/* Total Sessions */}
        <div className="p-4 sm:p-5 rounded-3xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Days</span>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="text-xl sm:text-2xl font-bold text-foreground block my-1">{summary.totalMarked}</span>
          <span className="text-[11px] text-muted-foreground">Working sessions</span>
        </div>

        {/* Present */}
        <div className="p-4 sm:p-5 rounded-3xl bg-card border border-emerald-500/20 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Present</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-xl sm:text-2xl font-bold text-foreground block my-1">{summary.presentCount}</span>
          <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">On time</span>
        </div>

        {/* Late */}
        <div className="p-4 sm:p-5 rounded-3xl bg-card border border-amber-500/20 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Late</span>
            <Clock4 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-xl sm:text-2xl font-bold text-foreground block my-1">{summary.lateCount}</span>
          <span className="text-[11px] text-amber-600/80 dark:text-amber-400/80">Late arrivals</span>
        </div>

        {/* Absent */}
        <div className="p-4 sm:p-5 rounded-3xl bg-card border border-destructive/20 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-destructive uppercase tracking-wider">Absent</span>
            <XCircle className="w-4 h-4 text-destructive" />
          </div>
          <span className="text-xl sm:text-2xl font-bold text-foreground block my-1">{summary.absentCount}</span>
          <span className="text-[11px] text-destructive/80">Unexcused</span>
        </div>

        {/* Leave */}
        <div className="p-4 sm:p-5 rounded-3xl bg-card border border-blue-500/20 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Leave</span>
            <FileCheck2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-xl sm:text-2xl font-bold text-foreground block my-1">{summary.leaveCount}</span>
          <span className="text-[11px] text-blue-600/80 dark:text-blue-400/80">Authorized</span>
        </div>
      </div>

      {/* 3. Monthly Attendance Breakdown */}
      <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">Monthly Attendance Breakdown</h2>
            <p className="text-xs text-muted-foreground">Monthly breakdown and percentage consistency</p>
          </div>
        </div>

        {monthlyBreakdown.length === 0 ? (
          <div className="py-10 text-center rounded-2xl bg-muted/30 border border-dashed border-border">
            <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs font-semibold text-foreground">No monthly attendance records available.</p>
            <p className="text-[11px] text-muted-foreground mt-1">Attendance records will appear once roll-call is taken.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {monthlyBreakdown.map((m) => (
              <div
                key={m.monthKey}
                className="p-5 rounded-2xl bg-background border border-border hover:border-primary/40 transition-all flex flex-col justify-between shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-bold text-foreground text-sm sm:text-base">{m.monthName}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        m.percentage >= 75
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : m.percentage >= 60
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          : "bg-destructive/10 text-destructive border border-destructive/20"
                      }`}
                    >
                      {m.percentage}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-muted rounded-full h-2 mb-4 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        m.percentage >= 75
                          ? "bg-emerald-500"
                          : m.percentage >= 60
                          ? "bg-amber-500"
                          : "bg-destructive"
                      }`}
                      style={{ width: `${Math.min(m.percentage, 100)}%` }}
                    />
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-muted/40 border border-border/50">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 block">{m.presentCount}</span>
                      <span className="text-[10px] text-muted-foreground">Present</span>
                    </div>
                    <div className="p-2 rounded-xl bg-muted/40 border border-border/50">
                      <span className="font-bold text-amber-600 dark:text-amber-400 block">{m.lateCount}</span>
                      <span className="text-[10px] text-muted-foreground">Late</span>
                    </div>
                    <div className="p-2 rounded-xl bg-muted/40 border border-border/50">
                      <span className="font-bold text-destructive block">{m.absentCount}</span>
                      <span className="text-[10px] text-muted-foreground">Absent</span>
                    </div>
                    <div className="p-2 rounded-xl bg-muted/40 border border-border/50">
                      <span className="font-bold text-blue-600 dark:text-blue-400 block">{m.leaveCount}</span>
                      <span className="text-[10px] text-muted-foreground">Leave</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/60 text-[11px] text-muted-foreground text-right">
                  Total marked: <strong className="text-foreground">{m.totalMarked} days</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Daily Attendance History Log */}
      <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">Attendance Logs</h2>
              <p className="text-xs text-muted-foreground">Day-by-day attendance history</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Month Filter */}
            {monthlyBreakdown.length > 0 && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-background border border-border text-foreground text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-primary transition cursor-pointer"
              >
                <option value="ALL">All Months</option>
                {monthlyBreakdown.map((m) => (
                  <option key={m.monthKey} value={m.monthKey}>
                    {m.monthName}
                  </option>
                ))}
              </select>
            )}

            {/* Status Filter */}
            <div className="flex items-center bg-muted/60 rounded-xl p-0.5 border border-border">
              {["ALL", "PRESENT", "LATE", "ABSENT", "LEAVE"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStatus(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    selectedStatus === st
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st === "ALL" ? "All" : st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="py-12 text-center rounded-2xl bg-muted/30 border border-dashed border-border">
            <Info className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs font-semibold text-foreground">No attendance logs matching selected filters.</p>
            <p className="text-[11px] text-muted-foreground mt-1">Try resetting the status or month filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Day</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Remarks / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredHistory.map((rec) => (
                  <tr key={rec._id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground text-xs sm:text-sm">
                      {new Date(rec.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{rec.dayOfWeek}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          rec.status === "PRESENT"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : rec.status === "LATE"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : rec.status === "ABSENT"
                            ? "bg-destructive/10 text-destructive border border-destructive/20"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                        }`}
                      >
                        {rec.status === "PRESENT" && <CheckCircle2 className="w-3 h-3" />}
                        {rec.status === "LATE" && <Clock4 className="w-3 h-3" />}
                        {rec.status === "ABSENT" && <XCircle className="w-3 h-3" />}
                        {rec.status === "LEAVE" && <FileCheck2 className="w-3 h-3" />}
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {rec.remarks || <span className="text-muted-foreground/50">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
