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
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || "Failed to load dashboard data");
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
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-sm text-zinc-400 font-medium">Loading your student portal...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto bg-zinc-900/60 rounded-2xl border border-red-500/20 backdrop-blur-xl mt-8">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-white mb-2">Unable to load dashboard</h2>
        <p className="text-sm text-zinc-400 mb-6">{error || "An unexpected error occurred."}</p>
        <button
          onClick={fetchDashboard}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const { profileSummary, todayTimetable, todayDayOfWeek, attendance, assignments, upcomingExams, recentResults, recentNotices, notifications } = data;

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header Profile Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/80 via-zinc-900 to-teal-950/80 p-6 md:p-8 border border-emerald-500/20 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            {profileSummary.avatarUrl ? (
              <img
                src={profileSummary.avatarUrl}
                alt={profileSummary.fullName}
                className="w-20 h-20 rounded-2xl object-cover ring-2 ring-emerald-500/40 shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white text-2xl font-bold ring-2 ring-emerald-500/40 shadow-lg">
                {profileSummary.firstName[0]}
                {profileSummary.lastName[0]}
              </div>
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  Welcome back, {profileSummary.firstName}!
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Sparkles className="w-3 h-3" />
                  Student Portal
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-sm text-zinc-300">
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
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700/90 text-zinc-200 text-sm font-medium border border-zinc-700/60 shadow transition"
            >
              <User className="w-4 h-4 text-emerald-400" />
              View Profile
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Rate */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-emerald-500/30 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Attendance Rate</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-bold text-white">{attendance.summary.percentage}%</span>
            <span className="text-xs text-zinc-400">
              ({attendance.summary.present}/{attendance.summary.totalDays} days)
            </span>
          </div>
          <div className="mt-3 w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                attendance.summary.percentage >= 75 ? "bg-emerald-500" : "bg-amber-500"
              }`}
              style={{ width: `${Math.min(attendance.summary.percentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Pending Assignments */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-blue-500/30 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Pending Tasks</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-bold text-white">{assignments.pending}</span>
            <span className="text-xs text-zinc-400">of {assignments.total} active</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-blue-400">
            <Clock4 className="w-3.5 h-3.5" />
            <span>{assignments.submitted} assignments completed</span>
          </div>
        </div>

        {/* Upcoming Exams */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-purple-500/30 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Upcoming Exams</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-bold text-white">{upcomingExams.length}</span>
            <span className="text-xs text-zinc-400">scheduled</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-purple-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>Check exam dates & syllabus</span>
          </div>
        </div>

        {/* Recent Results */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-amber-500/30 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Recent Results</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-bold text-white">{recentResults.length}</span>
            <span className="text-xs text-zinc-400">scores published</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-400">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>View report cards & scores</span>
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Today's Timetable + Assignments */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Today's Timetable */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Today's Timetable</h2>
                  <p className="text-xs text-zinc-400">Schedule for {todayDayOfWeek}</p>
                </div>
              </div>
              <Link
                href="/student/timetable"
                className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition"
              >
                Full Week
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {todayTimetable.length === 0 ? (
              <div className="py-10 text-center rounded-2xl bg-zinc-950/40 border border-dashed border-zinc-800">
                <Clock className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-zinc-400">No classes scheduled for today.</p>
                <p className="text-xs text-zinc-500 mt-1">Enjoy your break or check the full timetable.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {todayTimetable.map((period, idx) => (
                  <div
                    key={period._id || idx}
                    className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 hover:border-emerald-500/30 transition flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-semibold text-white text-base">{period.subjectName}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {period.startTime} - {period.endTime}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-800/60">
                      <span>Faculty: <strong className="text-zinc-200">{period.teacherName}</strong></span>
                      {period.room && (
                        <span className="flex items-center gap-1 text-zinc-400">
                          <MapPin className="w-3 h-3 text-zinc-500" />
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
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Active Assignments</h2>
                  <p className="text-xs text-zinc-400">Coursework and homework tasks</p>
                </div>
              </div>
              <Link
                href="/student/assignments"
                className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
              >
                View All ({assignments.total})
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {assignments.list.length === 0 ? (
              <div className="py-10 text-center rounded-2xl bg-zinc-950/40 border border-dashed border-zinc-800">
                <FileCheck className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-zinc-400">All caught up! No active assignments.</p>
                <p className="text-xs text-zinc-500 mt-1">New assignments will appear here when posted by teachers.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.list.slice(0, 5).map((asg) => (
                  <div
                    key={asg._id}
                    className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 hover:border-blue-500/30 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">{asg.title}</span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-800 text-zinc-300">
                          {asg.subjectName}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-1">{asg.description}</p>
                      <div className="flex items-center gap-4 text-xs text-zinc-500 pt-1">
                        <span>Due: <strong className="text-zinc-300">{new Date(asg.dueDate).toLocaleDateString()}</strong></span>
                        <span>Faculty: <strong className="text-zinc-300">{asg.teacherName}</strong></span>
                        {asg.maximumMarks && <span>Max: {asg.maximumMarks} pts</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          asg.submissionStatus === "REVIEWED"
                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            : asg.submissionStatus === "SUBMITTED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {asg.submissionStatus}
                      </span>
                      <Link
                        href="/student/assignments"
                        className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition"
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
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Upcoming Examinations</h2>
                  <p className="text-xs text-zinc-400">Schedules and subject dates</p>
                </div>
              </div>
              <Link
                href="/student/exams"
                className="text-xs font-medium text-purple-400 hover:text-purple-300 flex items-center gap-1 transition"
              >
                View Exams
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {upcomingExams.length === 0 ? (
              <div className="py-10 text-center rounded-2xl bg-zinc-950/40 border border-dashed border-zinc-800">
                <GraduationCap className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-zinc-400">No upcoming exams scheduled.</p>
                <p className="text-xs text-zinc-500 mt-1">Examination schedules will appear once published by the school.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingExams.map((exam) => (
                  <div
                    key={exam._id}
                    className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 hover:border-purple-500/30 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div>
                        <h3 className="font-bold text-white text-base">{exam.name}</h3>
                        <p className="text-xs text-zinc-400">
                          {new Date(exam.startDate).toLocaleDateString()} - {new Date(exam.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 self-start sm:self-auto">
                        {exam.status}
                      </span>
                    </div>

                    {exam.subjects.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-zinc-800/60">
                        {exam.subjects.map((sub) => (
                          <div key={sub._id} className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs">
                            <span className="font-semibold text-zinc-200 block">{sub.subjectName}</span>
                            <div className="flex items-center justify-between text-zinc-500 mt-1">
                              <span>Max: {sub.maximumMarks}</span>
                              <span>Pass: {sub.passingMarks}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Attendance Summary, Results, Notices, Notifications */}
        <div className="space-y-8">
          
          {/* Attendance Breakdown Card */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">Attendance Breakdown</h3>
              </div>
              <Link
                href="/student/attendance"
                className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                Logs
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-emerald-500/20 text-center">
                <span className="text-2xl font-bold text-emerald-400">{attendance.summary.present}</span>
                <span className="block text-xs text-zinc-400 mt-0.5">Present Days</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-red-500/20 text-center">
                <span className="text-2xl font-bold text-red-400">{attendance.summary.absent}</span>
                <span className="block text-xs text-zinc-400 mt-0.5">Absent Days</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-amber-500/20 text-center">
                <span className="text-2xl font-bold text-amber-400">{attendance.summary.late}</span>
                <span className="block text-xs text-zinc-400 mt-0.5">Late Marks</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-blue-500/20 text-center">
                <span className="text-2xl font-bold text-blue-400">{attendance.summary.leave}</span>
                <span className="block text-xs text-zinc-400 mt-0.5">Authorized Leaves</span>
              </div>
            </div>

            {/* Recent 7 days strip */}
            {attendance.recent.length > 0 && (
              <div className="pt-3 border-t border-zinc-800/80">
                <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block mb-2">
                  Recent Attendance Record
                </span>
                <div className="flex items-center gap-1.5">
                  {attendance.recent.map((rec) => (
                    <div
                      key={rec._id}
                      title={`${new Date(rec.date).toLocaleDateString()}: ${rec.status}`}
                      className={`flex-1 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                        rec.status === "PRESENT"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : rec.status === "ABSENT"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : rec.status === "LATE"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      }`}
                    >
                      {rec.status[0]}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent Published Results */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">Published Results</h3>
              </div>
              <Link
                href="/student/results"
                className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                View All
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentResults.length === 0 ? (
              <div className="py-8 text-center rounded-2xl bg-zinc-950/40 border border-dashed border-zinc-800">
                <Award className="w-6 h-6 text-zinc-600 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-zinc-400">No published results yet.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentResults.slice(0, 4).map((res) => (
                  <div
                    key={res._id}
                    className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-white text-sm block">{res.subjectName}</span>
                      <span className="text-xs text-zinc-400">{res.examName}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-400 text-sm block">
                        {res.marks !== null ? `${res.marks} pts` : "N/A"}
                      </span>
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300">
                        Grade {res.grade || "-"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Notices */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                  <Bell className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">Notice Board</h3>
              </div>
              <Link
                href="/student/notices"
                className="text-xs font-medium text-teal-400 hover:text-teal-300 flex items-center gap-1"
              >
                All Notices
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentNotices.length === 0 ? (
              <div className="py-8 text-center rounded-2xl bg-zinc-950/40 border border-dashed border-zinc-800">
                <Bell className="w-6 h-6 text-zinc-600 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-zinc-400">No current notices.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentNotices.map((n) => (
                  <div
                    key={n._id}
                    className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 hover:border-teal-500/30 transition space-y-1"
                  >
                    <span className="font-semibold text-zinc-200 text-sm block">{n.title}</span>
                    <p className="text-xs text-zinc-400 line-clamp-2">{n.description}</p>
                    <span className="text-[10px] text-zinc-500 block pt-1">
                      {new Date(n.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">Notifications</h3>
              </div>
              <Link
                href="/student/notifications"
                className="text-xs font-medium text-rose-400 hover:text-rose-300 flex items-center gap-1"
              >
                Inbox ({notifications.unreadCount})
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {notifications.list.length === 0 ? (
              <div className="py-8 text-center rounded-2xl bg-zinc-950/40 border border-dashed border-zinc-800">
                <CheckCircle2 className="w-6 h-6 text-zinc-600 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-zinc-400">No recent notifications.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {notifications.list.map((notif) => (
                  <div
                    key={notif._id}
                    className={`p-3 rounded-2xl border transition ${
                      notif.isRead
                        ? "bg-zinc-950/40 border-zinc-800/60"
                        : "bg-rose-500/5 border-rose-500/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-white text-xs block">{notif.title}</span>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">{notif.message}</p>
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
