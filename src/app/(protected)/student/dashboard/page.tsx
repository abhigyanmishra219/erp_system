"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  CalendarCheck,
  FileText,
  Award,
  Clock,
  Bell,
  Sparkles,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Clock4,
  Calendar,
  Layers,
  ChevronRight,
  RefreshCw,
  User,
  ShieldCheck,
  TrendingUp,
  MapPin,
  FileCheck,
} from "lucide-react";
import { useUser } from "@/context/UserContext";

interface DashboardData {
  profileSummary: {
    _id: string;
    studentId: string;
    admissionNumber: string;
    rollNumber: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
    gender: string;
    dateOfBirth: string;
    bloodGroup: string;
    avatarUrl: string;
    status: string;
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
    school: {
      _id: string;
      name: string;
      logo: string;
    };
  };
  todayTimetable: Array<{
    _id: string;
    subjectName: string;
    subjectCode: string;
    teacherName: string;
    startTime: string;
    endTime: string;
    room: string;
  }>;
  todayDayOfWeek: string;
  attendance: {
    summary: {
      totalDays: number;
      present: number;
      absent: number;
      late: number;
      leave: number;
      percentage: number;
    };
    recent: Array<{
      _id: string;
      date: string;
      status: string;
      remarks: string;
    }>;
  };
  assignments: {
    total: number;
    pending: number;
    submitted: number;
    list: Array<{
      _id: string;
      title: string;
      description: string;
      subjectName: string;
      subjectCode: string;
      teacherName: string;
      assignedDate: string;
      dueDate: string;
      maximumMarks: number | null;
      attachmentCount: number;
      submissionStatus: "PENDING" | "SUBMITTED" | "LATE" | "REVIEWED";
      submittedAt: string | null;
      marksAwarded: number | null;
      feedback: string | null;
    }>;
  };
  upcomingExams: Array<{
    _id: string;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    status: string;
    subjects: Array<{
      _id: string;
      subjectName: string;
      subjectCode: string;
      examDate: string | null;
      maximumMarks: number;
      passingMarks: number;
    }>;
  }>;
  recentResults: Array<{
    _id: string;
    examName: string;
    subjectName: string;
    subjectCode: string;
    marks: number | null;
    grade: string;
    isPassed: boolean;
    remarks: string;
    publishedAt: string;
  }>;
  recentNotices: Array<{
    _id: string;
    title: string;
    description: string;
    targetType: string;
    publishedAt: string;
    attachmentCount: number;
  }>;
  notifications: {
    unreadCount: number;
    list: Array<{
      _id: string;
      title: string;
      message: string;
      type: string;
      actionUrl: string | null;
      isRead: boolean;
      createdAt: string;
    }>;
  };
}

export default function StudentDashboardPage() {
  const { user } = useUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/student/dashboard");
      let result: any = null;
      try {
        result = await res.json();
      } catch (jsonErr) {
        throw new Error(res.statusText || `Server returned error (${res.status})`);
      }
      if (!res.ok || !result?.success) {
        throw new Error(result?.message || "Failed to load dashboard data");
      }
      setData(result.data);
    } catch (err: any) {
      console.error("Failed to fetch student dashboard:", err);
      setError(err.message || "Network error loading dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Loading your student portal...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto bg-card rounded-3xl border border-destructive/30 shadow-lg mt-8 space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="text-lg font-bold text-foreground">Unable to load dashboard</h2>
        <p className="text-xs text-muted-foreground">{error || "An unexpected error occurred."}</p>
        <button
          type="button"
          onClick={fetchDashboard}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer"
        >
          Retry
        </button>
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
    recentNotices,
    notifications,
  } = data;

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      {/* 1. Header Profile Banner (Branded Hero) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-teal-950/90 p-6 md:p-8 border border-emerald-500/25 shadow-xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            {profileSummary.avatarUrl ? (
              <img
                src={profileSummary.avatarUrl}
                alt={profileSummary.fullName}
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-emerald-500/40 shadow-lg"
              />
            ) : (
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white text-xl sm:text-2xl font-bold ring-2 ring-emerald-500/40 shadow-lg">
                {profileSummary.firstName[0]}
                {profileSummary.lastName[0]}
              </div>
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">
                  Welcome back, {profileSummary.firstName}!
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Sparkles className="w-3 h-3" />
                  Student Portal
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs sm:text-sm text-zinc-300">
                <span className="font-semibold text-emerald-400">
                  Class {profileSummary.class.name} - {profileSummary.section.name}
                </span>
                <span className="text-zinc-500">•</span>
                <span>
                  Roll No: <strong className="text-white">{profileSummary.rollNumber || "N/A"}</strong>
                </span>
                <span className="text-zinc-500">•</span>
                <span>
                  Adm No: <strong className="text-white">{profileSummary.admissionNumber}</strong>
                </span>
                <span className="text-zinc-500">•</span>
                <span className="text-zinc-400">{profileSummary.academicYear.name}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Link
              href="/student/profile"
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 shadow-xs transition backdrop-blur-xs"
            >
              <User className="w-4 h-4 text-emerald-400" />
              View Profile
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Attendance Rate */}
        <div className="p-4 sm:p-5 rounded-3xl bg-card border border-border shadow-xs hover:border-emerald-500/30 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attendance Rate</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CalendarCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <span className="text-2xl sm:text-3xl font-bold text-foreground">{attendance.summary.percentage}%</span>
              <span className="text-xs text-muted-foreground">
                ({attendance.summary.present}/{attendance.summary.totalDays} days)
              </span>
            </div>
          </div>
          <div className="mt-3 w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                attendance.summary.percentage >= 75 ? "bg-emerald-500" : "bg-amber-500"
              }`}
              style={{ width: `${Math.min(attendance.summary.percentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Pending Assignments */}
        <div className="p-4 sm:p-5 rounded-3xl bg-card border border-border shadow-xs hover:border-blue-500/30 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Tasks</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <span className="text-2xl sm:text-3xl font-bold text-foreground">{assignments.pending}</span>
              <span className="text-xs text-muted-foreground">of {assignments.total} active</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
            <Clock4 className="w-3.5 h-3.5" />
            <span>{assignments.submitted} completed</span>
          </div>
        </div>

        {/* Upcoming Exams */}
        <div className="p-4 sm:p-5 rounded-3xl bg-card border border-border shadow-xs hover:border-purple-500/30 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upcoming Exams</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <span className="text-2xl sm:text-3xl font-bold text-foreground">{upcomingExams.length}</span>
              <span className="text-xs text-muted-foreground">scheduled</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 font-medium">
            <Calendar className="w-3.5 h-3.5" />
            <span>Datesheet & syllabus</span>
          </div>
        </div>

        {/* Recent Results */}
        <div className="p-4 sm:p-5 rounded-3xl bg-card border border-border shadow-xs hover:border-amber-500/30 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Results</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <span className="text-2xl sm:text-3xl font-bold text-foreground">{recentResults.length}</span>
              <span className="text-xs text-muted-foreground">scores published</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>View report cards</span>
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Today's Timetable + Assignments */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Today's Timetable */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">Today&apos;s Timetable</h2>
                  <p className="text-xs text-muted-foreground">Schedule for {todayDayOfWeek}</p>
                </div>
              </div>
              <Link
                href="/student/timetable"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 transition"
              >
                Full Week
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {todayTimetable.length === 0 ? (
              <div className="py-10 text-center rounded-2xl bg-muted/30 border border-dashed border-border">
                <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs font-semibold text-foreground">No classes scheduled for today.</p>
                <p className="text-[11px] text-muted-foreground mt-1">Enjoy your break or check the full timetable.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {todayTimetable.map((period, idx) => (
                  <div
                    key={period._id || idx}
                    className="p-4 rounded-2xl bg-background border border-border hover:border-primary/40 transition-all flex flex-col justify-between shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-semibold text-foreground text-sm sm:text-base">{period.subjectName}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                        {period.startTime} - {period.endTime}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/60">
                      <span>Faculty: <strong className="text-foreground">{period.teacherName}</strong></span>
                      {period.room && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {period.room}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Assignments */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">Active Assignments</h2>
                  <p className="text-xs text-muted-foreground">Coursework and homework tasks</p>
                </div>
              </div>
              <Link
                href="/student/assignments"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 transition"
              >
                View All ({assignments.total})
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {assignments.list.length === 0 ? (
              <div className="py-10 text-center rounded-2xl bg-muted/30 border border-dashed border-border">
                <FileCheck className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs font-semibold text-foreground">All caught up! No active assignments.</p>
                <p className="text-[11px] text-muted-foreground mt-1">New assignments will appear here when posted by teachers.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.list.slice(0, 5).map((asg) => (
                  <div
                    key={asg._id}
                    className="p-4 rounded-2xl bg-background border border-border hover:border-primary/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">{asg.title}</span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                          {asg.subjectName}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{asg.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                        <span>Due: <strong className="text-foreground">{new Date(asg.dueDate).toLocaleDateString()}</strong></span>
                        <span>Faculty: <strong className="text-foreground">{asg.teacherName}</strong></span>
                        {asg.maximumMarks && <span>Max: {asg.maximumMarks} pts</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          asg.submissionStatus === "REVIEWED"
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                            : asg.submissionStatus === "SUBMITTED"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {asg.submissionStatus}
                      </span>
                      <Link
                        href="/student/assignments"
                        className="px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Exams */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">Upcoming Examinations</h2>
                  <p className="text-xs text-muted-foreground">Class test and term exam schedules</p>
                </div>
              </div>
              <Link
                href="/student/exams"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 transition"
              >
                View Exams
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {upcomingExams.length === 0 ? (
              <div className="py-10 text-center rounded-2xl bg-muted/30 border border-dashed border-border">
                <Award className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs font-semibold text-foreground">No upcoming exams scheduled right now.</p>
                <p className="text-[11px] text-muted-foreground mt-1">Check back when term test schedules are announced.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingExams.map((exam) => (
                  <div
                    key={exam._id}
                    className="p-5 rounded-2xl bg-background border border-border hover:border-primary/40 transition-all space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-foreground text-sm sm:text-base">{exam.name}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        {exam.subjects.length} Subjects
                      </span>
                    </div>

                    {exam.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{exam.description}</p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                      {exam.subjects.map((sub) => (
                        <div
                          key={sub._id}
                          className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-xs flex flex-col justify-between"
                        >
                          <span className="font-semibold text-foreground truncate">{sub.subjectName}</span>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                            <span>{sub.examDate ? new Date(sub.examDate).toLocaleDateString() : "Date TBA"}</span>
                            <span>Max: {sub.maximumMarks} pts</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Attendance Breakdown + Recent Results + Notices */}
        <div className="space-y-8">
          
          {/* Attendance Breakdown */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">Attendance Breakdown</h2>
                  <p className="text-xs text-muted-foreground">Current session attendance</p>
                </div>
              </div>
              <Link
                href="/student/attendance"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Details
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block">Present</span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {attendance.summary.present}
                </span>
                <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">On time</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20">
                <span className="text-xs font-semibold text-destructive block">Absent</span>
                <span className="text-2xl font-bold text-destructive mt-1 block">
                  {attendance.summary.absent}
                </span>
                <span className="text-[10px] text-destructive/80">Unexcused</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 block">Late</span>
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
                  {attendance.summary.late}
                </span>
                <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80">Late arrivals</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 block">Leave</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1 block">
                  {attendance.summary.leave}
                </span>
                <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80">Authorized</span>
              </div>
            </div>

            {/* Recent Attendance Days List */}
            {attendance.recent.length > 0 && (
              <div className="pt-2 border-t border-border/60">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Recent 7 Sessions
                </span>
                <div className="space-y-1.5">
                  {attendance.recent.map((rec) => (
                    <div
                      key={rec._id}
                      className="flex items-center justify-between p-2 rounded-xl bg-background border border-border text-xs"
                    >
                      <span className="text-muted-foreground">{new Date(rec.date).toLocaleDateString()}</span>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-md text-[10px] ${
                          rec.status === "PRESENT"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : rec.status === "LATE"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : rec.status === "ABSENT"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        {rec.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent Results */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">Recent Results</h2>
                  <p className="text-xs text-muted-foreground">Published test and exam grades</p>
                </div>
              </div>
              <Link
                href="/student/results"
                className="text-xs font-semibold text-primary hover:underline"
              >
                All Results
              </Link>
            </div>

            {recentResults.length === 0 ? (
              <div className="py-8 text-center rounded-2xl bg-muted/30 border border-dashed border-border">
                <Award className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs font-semibold text-foreground">No test scores published yet.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentResults.map((res) => (
                  <div
                    key={res._id}
                    className="p-3 rounded-2xl bg-background border border-border flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-foreground text-xs">{res.subjectName}</p>
                      <p className="text-[10px] text-muted-foreground">{res.examName}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-foreground text-sm">{res.marks ?? "--"} pts</span>
                      <span className="block text-[10px] font-bold text-primary">
                        Grade {res.grade}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Notices */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">School Notices</h2>
                  <p className="text-xs text-muted-foreground">Institutional announcements</p>
                </div>
              </div>
              <Link
                href="/student/notices"
                className="text-xs font-semibold text-primary hover:underline"
              >
                View All
              </Link>
            </div>

            {recentNotices.length === 0 ? (
              <div className="py-8 text-center rounded-2xl bg-muted/30 border border-dashed border-border">
                <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs font-semibold text-foreground">No recent announcements.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentNotices.map((notice) => (
                  <div
                    key={notice._id}
                    className="p-3.5 rounded-2xl bg-background border border-border space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-foreground text-xs">{notice.title}</h4>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(notice.publishedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{notice.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notifications Center Card */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">Alerts & Notifications</h2>
                  <p className="text-xs text-muted-foreground">{notifications.unreadCount} unread alerts</p>
                </div>
              </div>
              <Link
                href="/student/notifications"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Inbox
              </Link>
            </div>

            {notifications.list.length === 0 ? (
              <div className="py-8 text-center rounded-2xl bg-muted/30 border border-dashed border-border">
                <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs font-semibold text-foreground">No notifications right now.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {notifications.list.slice(0, 4).map((notif) => (
                  <div
                    key={notif._id}
                    className={`p-3 rounded-2xl border border-border transition-colors ${
                      !notif.isRead ? "bg-primary/5 border-primary/20" : "bg-background"
                    }`}
                  >
                    <p className="font-semibold text-foreground text-xs">{notif.title}</p>
                    <p className="text-muted-foreground text-[11px] line-clamp-2 mt-0.5">{notif.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
