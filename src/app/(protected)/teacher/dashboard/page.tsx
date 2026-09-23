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
} from "lucide-react";
import { useUser } from "@/context/UserContext";

interface ScopeClass {
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  subjectId?: string;
  subjectName?: string;
  isClassTeacher: boolean;
  assignmentType: string;
}

export default function TeacherDashboardPage() {
  const { user } = useUser();
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTeacherData() {
      try {
        const res = await fetch("/api/teacher/me");
        const json = await res.json();
        if (json.success) {
          setProfileData(json.data);
        }
      } catch (err) {
        console.error("Failed to load teacher context:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadTeacherData();
  }, []);

  const assignedClasses: ScopeClass[] = profileData?.scope?.assignedClasses || [];
  const classTeacherSections = assignedClasses.filter((c) => c.isClassTeacher);

  return (
    <div className="space-y-8">
      {/* Top Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/25 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Academic Faculty Workspace</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Welcome back, {profileData?.teacher?.firstName ? `${profileData.teacher.firstName} ${profileData.teacher.lastName}` : user?.name || "Teacher"}!
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Manage your daily class attendance, track assignment submissions, publish study materials, record exam marks, and coordinate with students across your assigned classes.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
            {profileData?.teacher?.department && (
              <span className="px-3 py-1.5 rounded-xl bg-card border border-border text-foreground font-medium flex items-center gap-1.5 shadow-xs">
                <Building2 className="w-3.5 h-3.5 text-amber-500" />
                <span>Department: {profileData.teacher.department}</span>
              </span>
            )}
            {profileData?.teacher?.employeeId && (
              <span className="px-3 py-1.5 rounded-xl bg-card border border-border text-foreground font-medium flex items-center gap-1.5 shadow-xs">
                <GraduationCap className="w-3.5 h-3.5 text-amber-500" />
                <span>Employee ID: {profileData.teacher.employeeId}</span>
              </span>
            )}
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Active Tenant Verified</span>
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Assigned Classes
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground">
            {isLoading ? "..." : assignedClasses.length}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {classTeacherSections.length > 0 ? `${classTeacherSections.length} Class Teacher Role` : "Subject Allocations"}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Attendance Module
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground">
            Ready
          </div>
          <p className="text-[11px] text-muted-foreground">
            Fast Roll-call & Status Entry
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Assignments
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground">
            Active
          </div>
          <p className="text-[11px] text-muted-foreground">
            Coursework & Submission Tracking
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Exams & Marks
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground">
            Scoped
          </div>
          <p className="text-[11px] text-muted-foreground">
            Assigned Subjects Evaluation
          </p>
        </div>
      </div>

      {/* Assigned Classes Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              My Teaching Allocations & Classes
            </h2>
            <p className="text-xs text-muted-foreground">
              Classes and subjects linked to your teaching profile
            </p>
          </div>
          <Link
            href="/teacher/profile"
            className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
          >
            <span>View All Assignments</span>
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
              Your school administrator has not linked your profile to any class or section yet. Please reach out to your administrator to assign your academic classes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedClasses.map((item, idx) => (
              <div
                key={`${item.classId}-${item.sectionId}-${item.subjectId || idx}`}
                className="p-5 rounded-2xl bg-card border border-border hover:border-amber-500/40 transition-all shadow-xs space-y-3"
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
                  <span className="text-[11px] text-muted-foreground capitalize">
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

      {/* Quick Access Modules Navigation */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            Academic Operations Hub
          </h2>
          <p className="text-xs text-muted-foreground">
            Quick links to daily teacher workflows
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <Link
            href="/teacher/students"
            className="p-4 rounded-2xl bg-card border border-border hover:border-primary/50 hover:bg-surface-2 transition-all shadow-xs space-y-2 group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
              My Students
            </h3>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Class roster & student profiles
            </p>
          </Link>

          <Link
            href="/teacher/attendance"
            className="p-4 rounded-2xl bg-card border border-border hover:border-primary/50 hover:bg-surface-2 transition-all shadow-xs space-y-2 group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
              Attendance
            </h3>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Mark & inspect class attendance
            </p>
          </Link>

          <Link
            href="/teacher/assignments"
            className="p-4 rounded-2xl bg-card border border-border hover:border-primary/50 hover:bg-surface-2 transition-all shadow-xs space-y-2 group"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
              Assignments
            </h3>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Homework & coursework tasks
            </p>
          </Link>

          <Link
            href="/teacher/study-material"
            className="p-4 rounded-2xl bg-card border border-border hover:border-primary/50 hover:bg-surface-2 transition-all shadow-xs space-y-2 group"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
              Study Material
            </h3>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Syllabus, notes & lesson files
            </p>
          </Link>

          <Link
            href="/teacher/exams"
            className="p-4 rounded-2xl bg-card border border-border hover:border-primary/50 hover:bg-surface-2 transition-all shadow-xs space-y-2 group"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
              Exams & Marks
            </h3>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Exam schedules & score entries
            </p>
          </Link>

          <Link
            href="/teacher/timetable"
            className="p-4 rounded-2xl bg-card border border-border hover:border-primary/50 hover:bg-surface-2 transition-all shadow-xs space-y-2 group"
          >
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
              Timetable
            </h3>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Weekly class timetable schedule
            </p>
          </Link>

          <Link
            href="/teacher/leave"
            className="p-4 rounded-2xl bg-card border border-border hover:border-primary/50 hover:bg-surface-2 transition-all shadow-xs space-y-2 group"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <CalendarX className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
              Leave
            </h3>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Apply for leave & view balance
            </p>
          </Link>

          <Link
            href="/teacher/notices"
            className="p-4 rounded-2xl bg-card border border-border hover:border-primary/50 hover:bg-surface-2 transition-all shadow-xs space-y-2 group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
              Notices
            </h3>
            <p className="text-[11px] text-muted-foreground leading-tight">
              School circulars & announcements
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
