"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import { useParentChild } from "@/context/ParentChildContext";
import ChildSwitcher from "../components/ChildSwitcher";
import {
  Calendar,
  CheckCircle2,
  Clock,
  BookOpen,
  GraduationCap,
  CreditCard,
  Bell,
  FileText,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  Building2,
  Phone,
  Mail,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";

export default function ParentDashboardPage() {
  const { user } = useUser();
  const { children, selectedChild, selectedChildId, isLoading: isChildrenLoading } = useParentChild();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async (studentId?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const url = studentId
        ? `/api/parent/dashboard?studentId=${encodeURIComponent(studentId)}`
        : "/api/parent/dashboard";

      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || json.message || "Failed to load dashboard data");
      }

      setDashboardData(json.data);
    } catch (err: any) {
      console.error("Dashboard load error:", err);
      setError(err.message || "An unexpected error occurred while loading dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      fetchDashboard(selectedChildId);
    } else if (!isChildrenLoading && (!children || children.length === 0)) {
      setIsLoading(false);
    }
  }, [selectedChildId, isChildrenLoading, children, fetchDashboard]);

  if (isChildrenLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-surface-2 rounded-3xl border border-border" />
        <div className="h-24 bg-surface-2 rounded-2xl border border-border" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-surface-2 rounded-2xl border border-border" />
          ))}
        </div>
      </div>
    );
  }

  if (!children || children.length === 0) {
    return (
      <div className="space-y-6">
        <div className="p-8 sm:p-12 rounded-3xl bg-card border border-border text-center shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Welcome to Parent Portal</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            You are logged in as a registered Guardian. However, there are currently no active students linked to your profile.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/parent/profile"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              Check Guardian Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const {
    profileSummary,
    todayTimetable,
    todayDayOfWeek,
    attendance,
    assignments,
    upcomingExams,
    recentResults,
    feeSummary,
    recentNotices,
    notifications,
  } = dashboardData || {};

  const attPct = attendance?.summary?.percentage ?? 0;
  const getAttBadgeColor = (pct: number) => {
    if (pct >= 85) return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (pct >= 75) return "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20";
    if (pct >= 60) return "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20";
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary/15 via-card to-card border border-border p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Parent / Guardian Portal</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Hello, {user?.name || "Parent"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Viewing academic progress, attendance, and finances for{" "}
              <strong className="text-foreground">
                {selectedChild?.student.fullName || "your child"}
              </strong>
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => selectedChildId && fetchDashboard(selectedChildId)}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card hover:bg-surface-2 border border-border text-xs font-semibold text-foreground transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
              <span>Refresh</span>
            </button>
            <Link
              href="/parent/children"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-xs"
            >
              <span>All Children</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Mobile-First Child Switcher */}
      <section aria-label="Select Child">
        <ChildSwitcher variant="cards" />
      </section>

      {/* Error notification if any */}
      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => selectedChildId && fetchDashboard(selectedChildId)}
            className="underline font-bold hover:opacity-80"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state for data */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-surface-2 rounded-2xl border border-border" />
          ))}
        </div>
      )}

      {/* Main Content (when data loaded) */}
      {!isLoading && dashboardData && (
        <>
          {/* 3. Quick KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Attendance KPI */}
            <Link
              href="/parent/attendance"
              className="group p-4 sm:p-5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Attendance
                </span>
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-foreground">{attPct}%</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getAttBadgeColor(
                      attPct
                    )}`}
                  >
                    {attPct >= 75 ? "Good" : "Needs Attention"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {attendance?.summary?.present || 0} Present / {attendance?.summary?.totalDays || 0} Days
                </p>
              </div>
            </Link>

            {/* Assignments KPI */}
            <Link
              href="/parent/assignments"
              className="group p-4 sm:p-5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Assignments
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-foreground">
                    {assignments?.pending || 0}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Pending
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {assignments?.submitted || 0} Submitted ({assignments?.total || 0} Total)
                </p>
              </div>
            </Link>

            {/* Upcoming Exams KPI */}
            <Link
              href="/parent/exams"
              className="group p-4 sm:p-5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Exams
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-foreground">
                    {upcomingExams?.length || 0}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    Scheduled
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {upcomingExams?.[0]?.name || "No upcoming tests"}
                </p>
              </div>
            </Link>

            {/* Fees KPI */}
            <Link
              href="/parent/fees"
              className="group p-4 sm:p-5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Fee Status
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                {feeSummary?.isEnabled ? (
                  <>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-foreground">
                        ₹{(feeSummary.pendingAmount || 0).toLocaleString()}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                          feeSummary.pendingAmount === 0
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                        }`}
                      >
                        {feeSummary.pendingAmount === 0 ? "Fully Paid" : "Pending"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Paid: ₹{(feeSummary.paidAmount || 0).toLocaleString()}
                    </p>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-bold text-muted-foreground">Fees N/A</span>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Module not active
                    </p>
                  </>
                )}
              </div>
            </Link>
          </div>

          {/* 4. Two-Column Dashboard Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT 2 COLUMNS: Academic Schedule, Assignments & Results */}
            <div className="lg:col-span-2 space-y-6">
              {/* Today's Timetable */}
              <div className="p-5 sm:p-6 rounded-3xl bg-card border border-border shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        Today&apos;s Schedule ({todayDayOfWeek || "Today"})
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Class {profileSummary?.class?.name} - {profileSummary?.section?.name}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/parent/timetable"
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>Full Week</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {todayTimetable && todayTimetable.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {todayTimetable.map((slot: any, idx: number) => (
                      <div
                        key={slot._id || idx}
                        className="p-3 rounded-xl bg-surface-2/60 border border-border/70 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">
                            {slot.subjectName}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {slot.teacherName} {slot.room ? `• Room ${slot.room}` : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[11px] font-mono font-semibold text-foreground px-2 py-0.5 rounded-md bg-card border border-border">
                            {slot.startTime} - {slot.endTime}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center rounded-2xl bg-surface-2/40 border border-dashed border-border text-xs text-muted-foreground">
                    No scheduled periods found for today.
                  </div>
                )}
              </div>

              {/* Pending Assignments */}
              <div className="p-5 sm:p-6 rounded-3xl bg-card border border-border shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        Assignments & Homework
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Recent coursework assigned by teachers
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/parent/assignments"
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>View All ({assignments?.total || 0})</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {assignments?.list && assignments.list.length > 0 ? (
                  <div className="space-y-2.5">
                    {assignments.list.slice(0, 4).map((item: any) => {
                      const isPending = item.submissionStatus === "PENDING";
                      return (
                        <div
                          key={item._id}
                          className="p-3.5 rounded-2xl bg-surface-2/50 border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-foreground">
                                {item.title}
                              </span>
                              <span className="text-[10px] px-2 py-0.2 rounded-md bg-primary/10 text-primary font-semibold">
                                {item.subjectName}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Assigned by {item.teacherName} • Due:{" "}
                              {new Date(item.dueDate).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                              })}
                            </p>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                                isPending
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              }`}
                            >
                              {item.submissionStatus}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center rounded-2xl bg-surface-2/40 border border-dashed border-border text-xs text-muted-foreground">
                    No active assignments for this child.
                  </div>
                )}
              </div>

              {/* Recent Examination Results */}
              <div className="p-5 sm:p-6 rounded-3xl bg-card border border-border shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        Recent Exam Results
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Published scorecards and grades
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/parent/results"
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>All Results</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {recentResults && recentResults.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {recentResults.slice(0, 4).map((r: any) => (
                      <div
                        key={r._id}
                        className="p-3.5 rounded-2xl bg-surface-2/50 border border-border/70 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">
                            {r.subjectName}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {r.examName}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-black text-foreground">
                            {r.marks} pts
                          </span>
                          {r.grade && (
                            <p className="text-[10px] font-bold text-primary font-mono">
                              Grade {r.grade}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center rounded-2xl bg-surface-2/40 border border-dashed border-border text-xs text-muted-foreground">
                    No published exam results available yet.
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT 1 COLUMN: Student Info, Notices, Notifications & Quick Actions */}
            <div className="space-y-6">
              {/* Selected Child Profile Card */}
              <div className="p-5 sm:p-6 rounded-3xl bg-card border border-border shadow-2xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                    {profileSummary?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profileSummary.avatarUrl}
                        alt={profileSummary.fullName}
                        className="w-full h-full rounded-2xl object-cover"
                      />
                    ) : (
                      <span>{profileSummary?.firstName?.[0] || "S"}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-foreground truncate">
                      {profileSummary?.fullName}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Class {profileSummary?.class?.name} - {profileSummary?.section?.name}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs border-t border-border pt-3">
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Admission No:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {profileSummary?.admissionNumber}
                    </span>
                  </div>
                  {profileSummary?.rollNumber && (
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Roll No:</span>
                      <span className="font-mono font-semibold text-foreground">
                        {profileSummary.rollNumber}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Academic Year:</span>
                    <span className="font-semibold text-foreground">
                      {profileSummary?.academicYear?.name || "Current"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Guardian Link:</span>
                    <span className="font-semibold text-primary capitalize">
                      {profileSummary?.guardianRelation?.relationship || "Parent"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border">
                  <Link
                    href="/parent/leave"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-foreground text-xs font-semibold transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    <span>Apply for Leave</span>
                  </Link>
                </div>
              </div>

              {/* School Notices */}
              <div className="p-5 sm:p-6 rounded-3xl bg-card border border-border shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Bell className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">School Circulars</h3>
                  </div>
                  <Link
                    href="/parent/notices"
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    View All
                  </Link>
                </div>

                {recentNotices && recentNotices.length > 0 ? (
                  <div className="space-y-3">
                    {recentNotices.slice(0, 3).map((notice: any) => (
                      <div
                        key={notice._id}
                        className="p-3 rounded-2xl bg-surface-2/50 border border-border/70 space-y-1"
                      >
                        <p className="text-xs font-bold text-foreground line-clamp-1">
                          {notice.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {notice.description}
                        </p>
                        <span className="text-[10px] text-muted-foreground block font-mono">
                          {new Date(notice.publishedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center rounded-2xl bg-surface-2/40 border border-dashed border-border text-xs text-muted-foreground">
                    No active school notices at this time.
                  </div>
                )}
              </div>

              {/* In-App Notifications */}
              <div className="p-5 sm:p-6 rounded-3xl bg-card border border-border shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                      <Bell className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">Recent Alerts</h3>
                  </div>
                  {notifications?.unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold">
                      {notifications.unreadCount} unread
                    </span>
                  )}
                </div>

                {notifications?.list && notifications.list.length > 0 ? (
                  <div className="space-y-2.5">
                    {notifications.list.slice(0, 3).map((n: any) => (
                      <div
                        key={n._id}
                        className={`p-3 rounded-2xl border text-xs ${
                          n.isRead
                            ? "bg-surface-2/40 border-border/70 text-muted-foreground"
                            : "bg-primary/5 border-primary/20 text-foreground font-medium"
                        }`}
                      >
                        <p className="font-bold text-foreground text-xs leading-tight">
                          {n.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center rounded-2xl bg-surface-2/40 border border-dashed border-border text-xs text-muted-foreground">
                    No alerts or notifications.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
