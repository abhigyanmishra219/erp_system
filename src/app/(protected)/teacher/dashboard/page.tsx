"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  CalendarCheck,
  FileText,
  BookOpen,
  Award,
  Clock,
  CalendarX,
  Bell,
  ArrowRight,
  Sparkles,
  GraduationCap,
  Layers,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  AlertTriangle,
  Clock4,
  Check,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useUser } from "@/context/UserContext";

interface DashboardData {
  summary: {
    assignedClassesCount: number;
    assignedSectionsCount: number;
    assignedSubjectsCount: number;
    todayClassesCount: number;
    pendingAttendanceCount: number;
    activeAssignmentsCount: number;
    pendingSubmissionsCount: number;
    upcomingExamsCount: number;
  };
  academicYear: {
    _id: string;
    name: string;
    status: string;
  } | null;
  todayDayOfWeek: string;
  todayClasses: Array<{
    _id: string;
    classId: string;
    className: string;
    sectionId: string;
    sectionName: string;
    subjectId: string;
    subjectName: string;
    subjectCode?: string;
    startTime: string;
    endTime: string;
    room?: string;
  }>;
  assignedClasses: Array<{
    classId: string;
    className: string;
    sectionId: string;
    sectionName: string;
    subjectId?: string;
    subjectName?: string;
    isClassTeacher: boolean;
    assignmentType: string;
  }>;
  assignedSubjects: Array<{
    subjectId: string;
    name: string;
    code?: string;
  }>;
  pendingAttendance: Array<{
    classId: string;
    className: string;
    sectionId: string;
    sectionName: string;
    isClassTeacher: boolean;
  }>;
  activeAssignments: Array<{
    _id: string;
    title: string;
    description: string;
    className: string;
    sectionName: string;
    subjectName: string;
    assignedDate: string;
    dueDate: string;
    maximumMarks?: number;
    totalSubmissions: number;
    pendingReviewSubmissions: number;
  }>;
  upcomingExams: Array<{
    _id: string;
    examId: string;
    examName: string;
    className: string;
    subjectName: string;
    examDate: string;
    maximumMarks: number;
    passingMarks: number;
    examStatus: string;
  }>;
  recentNotices: Array<{
    _id: string;
    title: string;
    description: string;
    targetType: string;
    publishedAt: string;
    attachmentsCount: number;
  }>;
}

export default function TeacherDashboardPage() {
  const { user } = useUser();
  const [profileData, setProfileData] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function loadData() {
    try {
      const [meRes, dashRes] = await Promise.all([
        fetch("/api/teacher/me"),
        fetch("/api/teacher/dashboard"),
      ]);
      const [meJson, dashJson] = await Promise.all([
        meRes.json(),
        dashRes.json(),
      ]);

      if (meJson.success) {
        setProfileData(meJson.data);
      }
      if (dashJson.success) {
        setDashboardData(dashJson.data);
      }
    } catch (err) {
      console.error("Failed to load teacher dashboard data:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const summary = dashboardData?.summary || {
    assignedClassesCount: 0,
    assignedSectionsCount: 0,
    assignedSubjectsCount: 0,
    todayClassesCount: 0,
    pendingAttendanceCount: 0,
    activeAssignmentsCount: 0,
    pendingSubmissionsCount: 0,
    upcomingExamsCount: 0,
  };

  const todayClasses = dashboardData?.todayClasses || [];
  const pendingAttendance = dashboardData?.pendingAttendance || [];
  const activeAssignments = dashboardData?.activeAssignments || [];
  const upcomingExams = dashboardData?.upcomingExams || [];
  const recentNotices = dashboardData?.recentNotices || [];
  const assignedClasses = dashboardData?.assignedClasses || [];

  return (
    <div className="space-y-8">
      {/* Top Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/25 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Academic Faculty Workspace</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Welcome back, {profileData?.teacher?.firstName ? `${profileData.teacher.firstName} ${profileData.teacher.lastName}` : user?.name || "Teacher"}!
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Track your daily teaching timetable, submit class roll-call attendance, manage student homework assignments, and prepare upcoming exams.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-2.5 text-xs">
              {profileData?.teacher?.department && (
                <span className="px-3 py-1.5 rounded-xl bg-card border border-border text-foreground font-medium flex items-center gap-1.5 shadow-xs">
                  <Building2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>Dept: {profileData.teacher.department}</span>
                </span>
              )}
              {profileData?.teacher?.employeeId && (
                <span className="px-3 py-1.5 rounded-xl bg-card border border-border text-foreground font-medium flex items-center gap-1.5 shadow-xs">
                  <GraduationCap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Emp ID: {profileData.teacher.employeeId}</span>
                </span>
              )}
              {dashboardData?.academicYear && (
                <span className="px-3 py-1.5 rounded-xl bg-card border border-border text-foreground font-medium flex items-center gap-1.5 shadow-xs">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>Term: {dashboardData.academicYear.name}</span>
                </span>
              )}
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Active Faculty</span>
              </span>
            </div>
          </div>

          <div className="flex flex-row md:flex-col items-start md:items-end gap-2 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-xl bg-card hover:bg-surface-2 border border-border text-foreground text-xs font-semibold flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-amber-500" : "text-muted-foreground"}`} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh Feed"}</span>
            </button>
            <div className="text-right text-[11px] text-muted-foreground hidden md:block">
              Today: <strong className="text-foreground">{dashboardData?.todayDayOfWeek || "..."}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Classes */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-2 hover:border-amber-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Today&apos;s Classes
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">
            {isLoading ? "..." : summary.todayClassesCount}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {summary.todayClassesCount === 1 ? "1 Period Scheduled" : `${summary.todayClassesCount} Periods Scheduled`}
          </p>
        </div>

        {/* Attendance Pending */}
        <div className={`p-5 rounded-2xl bg-card border shadow-xs space-y-2 transition ${
          summary.pendingAttendanceCount > 0
            ? "border-amber-500/40 bg-amber-500/5"
            : "border-border"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Pending Attendance
            </span>
            <div className={`p-2 rounded-xl ${
              summary.pendingAttendanceCount > 0
                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            }`}>
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-black ${
            summary.pendingAttendanceCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
          }`}>
            {isLoading ? "..." : summary.pendingAttendanceCount}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {summary.pendingAttendanceCount > 0
              ? `${summary.pendingAttendanceCount} Section${summary.pendingAttendanceCount > 1 ? "s" : ""} require roll-call`
              : "All sections marked today"}
          </p>
        </div>

        {/* Active Assignments */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-2 hover:border-blue-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Active Assignments
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">
            {isLoading ? "..." : summary.activeAssignmentsCount}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {summary.pendingSubmissionsCount > 0
              ? `${summary.pendingSubmissionsCount} submissions to review`
              : "Coursework active"}
          </p>
        </div>

        {/* Assigned Classes & Subjects */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-2 hover:border-purple-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Assigned Subjects
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">
            {isLoading ? "..." : summary.assignedSubjectsCount}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Across {summary.assignedSectionsCount} Assigned Sections
          </p>
        </div>
      </div>

      {/* Grid: Today's Classes / Timetable + Attendance Pending */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Timetable (2 cols on lg) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Today&apos;s Timetable & Classes</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Scheduled teaching periods for today ({dashboardData?.todayDayOfWeek || "Today"})
              </p>
            </div>
            <Link
              href="/teacher/timetable"
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              <span>Weekly View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-8 rounded-2xl bg-card border border-border text-center text-xs text-muted-foreground">
              Loading today&apos;s timetable...
            </div>
          ) : todayClasses.length === 0 ? (
            <div className="p-8 rounded-2xl bg-card border border-dashed border-border text-center space-y-2">
              <Clock4 className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold text-foreground">No Classes Scheduled Today</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                You have no teaching periods scheduled in the timetable for {dashboardData?.todayDayOfWeek || "today"}.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayClasses.map((item, idx) => (
                <div
                  key={item._id || idx}
                  className="p-4 sm:p-5 rounded-2xl bg-card border border-border hover:border-amber-500/40 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 font-mono font-bold text-xs text-center shrink-0">
                      <div>{item.startTime}</div>
                      <div className="text-[10px] text-muted-foreground font-normal">to</div>
                      <div>{item.endTime}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-foreground">
                          {item.className} - {item.sectionName}
                        </h3>
                        {item.room && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-2 border border-border text-muted-foreground">
                            Room: {item.room}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{item.subjectName}</span>
                        {item.subjectCode && (
                          <span className="text-muted-foreground font-mono text-[10px]">({item.subjectCode})</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Link
                      href={`/teacher/attendance?classId=${item.classId}&sectionId=${item.sectionId}`}
                      className="px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-foreground text-xs font-semibold transition"
                    >
                      Roll-call
                    </Link>
                    <Link
                      href={`/teacher/assignments?classId=${item.classId}&sectionId=${item.sectionId}&subjectId=${item.subjectId}`}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-semibold transition"
                    >
                      Assignments
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Attendance Action Box (1 col) */}
        <div className="space-y-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-emerald-500" />
              <span>Attendance Status</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Today&apos;s roll-call status across your assigned sections
            </p>
          </div>

          {isLoading ? (
            <div className="p-8 rounded-2xl bg-card border border-border text-center text-xs text-muted-foreground">
              Checking attendance...
            </div>
          ) : pendingAttendance.length === 0 ? (
            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Attendance Completed</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  All your assigned sections have attendance marked for today.
                </p>
              </div>
              <Link
                href="/teacher/attendance"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline pt-1"
              >
                <span>View Attendance Logs</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <p className="font-bold text-amber-700 dark:text-amber-400">Attendance Pending</p>
                  <p className="text-muted-foreground">
                    Please submit attendance for the following assigned classes today:
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {pendingAttendance.map((sec) => (
                  <div
                    key={`${sec.classId}-${sec.sectionId}`}
                    className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between gap-3 shadow-xs hover:border-amber-500/40 transition"
                  >
                    <div>
                      <h4 className="font-bold text-xs text-foreground">
                        {sec.className} - {sec.sectionName}
                      </h4>
                      {sec.isClassTeacher && (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          Class Teacher Role
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/teacher/attendance?classId=${sec.classId}&sectionId=${sec.sectionId}`}
                      className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs shadow-xs transition"
                    >
                      Mark Now
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Active Assignments + Upcoming Exams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Assignments */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <span>Active Assignments</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Coursework and student homework tasks
              </p>
            </div>
            <Link
              href="/teacher/assignments"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>Manage All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-8 rounded-2xl bg-card border border-border text-center text-xs text-muted-foreground">
              Loading assignments...
            </div>
          ) : activeAssignments.length === 0 ? (
            <div className="p-8 rounded-2xl bg-card border border-dashed border-border text-center space-y-2">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold text-foreground">No Active Assignments</p>
              <p className="text-xs text-muted-foreground">
                You currently have no active published assignments.
              </p>
              <div className="pt-2">
                <Link
                  href="/teacher/assignments"
                  className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-xs inline-block"
                >
                  Create New Assignment
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {activeAssignments.map((asgn) => (
                <div
                  key={asgn._id}
                  className="p-4 rounded-2xl bg-card border border-border hover:border-blue-500/40 transition shadow-xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-sm text-foreground">{asgn.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {asgn.className} - {asgn.sectionName} • <strong className="text-foreground">{asgn.subjectName}</strong>
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                      Due: {new Date(asgn.dueDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                      <span>Total: <strong className="text-foreground">{asgn.totalSubmissions}</strong></span>
                      <span>•</span>
                      <span>
                        Pending Review:{" "}
                        <strong className={asgn.pendingReviewSubmissions > 0 ? "text-amber-600 dark:text-amber-400 font-bold" : "text-foreground"}>
                          {asgn.pendingReviewSubmissions}
                        </strong>
                      </span>
                    </div>

                    <Link
                      href={`/teacher/assignments`}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>Review Submissions</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Exams */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-500" />
                <span>Upcoming Exams & Evaluations</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Tests scheduled for your assigned subjects & classes
              </p>
            </div>
            <Link
              href="/teacher/exams"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>Exams Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-8 rounded-2xl bg-card border border-border text-center text-xs text-muted-foreground">
              Loading exam schedules...
            </div>
          ) : upcomingExams.length === 0 ? (
            <div className="p-8 rounded-2xl bg-card border border-dashed border-border text-center space-y-2">
              <Award className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold text-foreground">No Upcoming Exams</p>
              <p className="text-xs text-muted-foreground">
                No active exam schedules found for your assigned subjects.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingExams.map((exam) => (
                <div
                  key={exam._id}
                  className="p-4 rounded-2xl bg-card border border-border hover:border-purple-500/40 transition shadow-xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-sm text-foreground">{exam.examName}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {exam.className} • <strong className="text-foreground">{exam.subjectName}</strong>
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
                      Date: {new Date(exam.examDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                      <span>Max Marks: <strong className="text-foreground">{exam.maximumMarks}</strong></span>
                      <span>•</span>
                      <span>Passing: <strong className="text-foreground">{exam.passingMarks}</strong></span>
                    </div>

                    <Link
                      href={`/teacher/exams`}
                      className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                    >
                      <span>Enter Marks</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grid: School Notices + Teaching Allocations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Notices (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-500" />
                <span>School Notices</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Circulars & faculty announcements
              </p>
            </div>
            <Link
              href="/teacher/notices"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-8 rounded-2xl bg-card border border-border text-center text-xs text-muted-foreground">
              Loading notices...
            </div>
          ) : recentNotices.length === 0 ? (
            <div className="p-6 rounded-2xl bg-card border border-dashed border-border text-center space-y-1">
              <Bell className="w-6 h-6 text-muted-foreground mx-auto" />
              <p className="text-xs font-semibold text-foreground">No Active Notices</p>
              <p className="text-[11px] text-muted-foreground">
                School circulars will appear here when published.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentNotices.map((n) => (
                <div
                  key={n._id}
                  className="p-3.5 rounded-2xl bg-card border border-border hover:border-emerald-500/40 transition shadow-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-xs text-foreground truncate">{n.title}</h3>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-surface-2 border border-border text-muted-foreground uppercase">
                      {n.targetType}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {n.description}
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{new Date(n.publishedAt).toLocaleDateString()}</span>
                    {n.attachmentsCount > 0 && (
                      <span className="text-primary font-semibold">{n.attachmentsCount} Attachment(s)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assigned Classes Allocations (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                <span>My Teaching Allocations</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Classes and subjects assigned by school administration
              </p>
            </div>
            <Link
              href="/teacher/profile"
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              <span>Full Profile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-8 rounded-2xl bg-card border border-border text-center text-xs text-muted-foreground">
              Loading allocations...
            </div>
          ) : assignedClasses.length === 0 ? (
            <div className="p-8 rounded-2xl bg-card border border-dashed border-border text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold text-foreground">No Academic Allocations Yet</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Your school administrator has not linked your profile to any class or section yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {assignedClasses.map((item, idx) => (
                <div
                  key={`${item.classId}-${item.sectionId}-${item.subjectId || idx}`}
                  className="p-4 rounded-2xl bg-card border border-border hover:border-amber-500/40 transition shadow-xs space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-foreground">
                        {item.className} - {item.sectionName}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.subjectName ? `Subject: ${item.subjectName}` : "General / All Subjects"}
                      </p>
                    </div>
                    {item.isClassTeacher && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        Class Teacher
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-[10px] text-muted-foreground capitalize font-medium">
                      {item.assignmentType?.replace("_", " ").toLowerCase()}
                    </span>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/teacher/attendance?classId=${item.classId}&sectionId=${item.sectionId}`}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Attendance
                      </Link>
                      <span className="text-border">|</span>
                      <Link
                        href={`/teacher/assignments?classId=${item.classId}&sectionId=${item.sectionId}`}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Assignments
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
