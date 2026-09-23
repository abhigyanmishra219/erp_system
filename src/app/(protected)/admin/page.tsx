"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  Layers,
  BookOpen,
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Settings,
  User,
  Users,
  GraduationCap,
  RotateCw,
  AlertCircle,
  ExternalLink,
  CalendarCheck,
} from "lucide-react";

interface SetupItem {
  key: string;
  label: string;
  completed: boolean;
  href: string;
}

interface DashboardData {
  school: {
    id: string;
    name: string;
    code: string; // Internal
    logo?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    email?: string;
    phone?: string;
    website?: string;
    plan: string;
    status: string;
    subscriptionStatus: string;
    subscriptionStartDate: string;
    subscriptionExpiryDate: string;
    enabledModules: string[];
    studentLimit: number;
    createdAt: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    mustChangePassword: boolean;
  };
  academics: {
    activeAcademicYear: {
      id: string;
      name: string;
      startDate: string;
      endDate: string;
      status: string;
    } | null;
    totalAcademicYears: number;
    totalClasses: number;
    totalSections: number;
    totalSubjects: number;
  };
  students?: {
    total: number;
    active: number;
    inactive: number;
    transferred: number;
    graduated: number;
  };
  parents?: {
    total: number;
    active: number;
  };
  teachers?: {
    total: number;
    active: number;
    inactive: number;
  };
  attendance?: {
    presentToday: number;
    absentToday: number;
    lateToday: number;
    leaveToday: number;
    totalMarkedToday: number;
    attendanceRateToday: number;
  };
  fees?: {
    totalRevenue: number;
    totalCollected?: number;
    totalPending: number;
    totalAssigned: number;
    paidCount: number;
    partialCount: number;
    unpaidCount: number;
    totalAccounts: number;
  };
  setup: {
    items: SetupItem[];
    completedSteps: number;
    totalSteps: number;
    percentage: number;
    isFullyConfigured: boolean;
  };
}

export default function SchoolAdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dashboard");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load dashboard data");
      }
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error connecting to server");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getDaysRemaining = (expiryDateStr?: string) => {
    if (!expiryDateStr) return 0;
    const expiry = new Date(expiryDateStr);
    const now = new Date();
    const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
        <RotateCw className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-medium">
          Loading institutional metrics...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 rounded-3xl bg-card border border-destructive/30 text-center space-y-4 max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Unable to load dashboard</h2>
        <p className="text-xs text-muted-foreground">{error}</p>
        <button
          onClick={() => fetchDashboardData()}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { school, user, academics, setup } = data;
  const daysRemaining = getDaysRemaining(school.subscriptionExpiryDate);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>School ERP Control Center</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Welcome, {user.name}!
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            You are managing <strong className="text-foreground">{school.name}</strong>. All operations and records in this workspace are isolated strictly to your institution.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10">
          <div className="p-3.5 rounded-2xl bg-surface-2 border border-border flex items-center gap-3 text-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                Plan & Validity
              </span>
              <span className="font-extrabold text-foreground">
                {school.plan} ({daysRemaining} days left)
              </span>
            </div>
          </div>

          <button
            onClick={() => fetchDashboardData()}
            className="p-3.5 rounded-2xl bg-surface-2 border border-border hover:bg-muted text-foreground transition-colors cursor-pointer flex items-center justify-center"
            title="Refresh Metrics"
          >
            <RotateCw className="w-4 h-4 text-primary" />
          </button>
        </div>
      </div>

      {/* Row 1: Real Academic, Teacher, Student & Parent Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Students */}
        <Link
          href="/admin/students"
          className="p-5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all space-y-3 shadow-xs group cursor-pointer block"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Students
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-extrabold text-foreground block">
              {data?.students ? data.students.total : 0}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {data?.students?.active || 0} active students
            </span>
          </div>
        </Link>

        {/* Total Teachers */}
        <Link
          href="/admin/teachers"
          className="p-5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all space-y-3 shadow-xs group cursor-pointer block"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Teachers & Staff
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-extrabold text-foreground block">
              {data?.teachers ? data.teachers.total : 0}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {data?.teachers?.active || 0} active faculty members
            </span>
          </div>
        </Link>

        {/* Total Parents */}
        <Link
          href="/admin/parents"
          className="p-5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all space-y-3 shadow-xs group cursor-pointer block"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Parents
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-extrabold text-foreground block">
              {data?.parents ? data.parents.total : 0}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {data?.parents?.active || 0} active guardian profiles
            </span>
          </div>
        </Link>

        {/* Classes Count */}
        <Link
          href="/admin/academics/classes"
          className="p-5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all space-y-3 shadow-xs group cursor-pointer block"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Classes & Sections
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 group-hover:scale-105 transition-transform">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-extrabold text-foreground block">
              {academics.totalClasses > 0 ? `${academics.totalClasses} Classes` : "No Classes"}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {academics.totalSections > 0 ? `${academics.totalSections} sections` : "0 sections configured"}
            </span>
          </div>
        </Link>

        {/* Active Academic Year */}
        <Link
          href="/admin/academics/academic-years"
          className="p-5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all space-y-3 shadow-xs group cursor-pointer block"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Active Academic Session
            </span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-lg font-bold text-foreground block">
              {academics.activeAcademicYear
                ? academics.activeAcademicYear.name
                : "Not Configured"}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {academics.activeAcademicYear
                ? "Active Calendar Session"
                : "Click to configure session"}
            </span>
          </div>
        </Link>
      </div>

      {/* Attendance Today Snapshot */}
      {data?.attendance && (
        <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Today's Attendance Snapshot</h2>
                <p className="text-[11px] text-muted-foreground">Real-time daily student attendance across all sections</p>
              </div>
            </div>
            <Link
              href="/admin/attendance"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>Manage Attendance</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-2xl bg-surface-2 border border-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Total Marked</span>
              <span className="text-xl font-extrabold text-foreground">{data.attendance.totalMarkedToday}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Present</span>
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{data.attendance.presentToday}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">Absent</span>
              <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400">{data.attendance.absentToday}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">Late</span>
              <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400">{data.attendance.lateToday}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">On Leave</span>
              <span className="text-xl font-extrabold text-purple-600 dark:text-purple-400">{data.attendance.leaveToday}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">Turnout Rate</span>
              <span className="text-xl font-extrabold text-primary">{data.attendance.attendanceRateToday}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Fee Collection & Financials Snapshot */}
      {data?.fees && (
        <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Fee Collection & Financial Snapshot</h2>
                <p className="text-[11px] text-muted-foreground">Live institutional fee receivables, collections, and student account statuses</p>
              </div>
            </div>
            <Link
              href="/admin/fees"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>Fee Hub Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-surface-2 border border-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Total Receivables</span>
              <span className="text-xl font-extrabold text-foreground">₹{(data.fees?.totalAssigned ?? 0).toLocaleString("en-IN")}</span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">{data.fees?.totalAccounts ?? 0} student accounts</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Total Collected</span>
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">₹{(data.fees?.totalRevenue ?? data.fees?.totalCollected ?? 0).toLocaleString("en-IN")}</span>
              <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 block mt-0.5">{data.fees?.paidCount ?? 0} fully settled</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">Pending Outstanding</span>
              <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400">₹{(data.fees?.totalPending ?? 0).toLocaleString("en-IN")}</span>
              <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80 block mt-0.5">{(data.fees?.unpaidCount ?? 0) + (data.fees?.partialCount ?? 0)} pending/partial</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">Collection Rate</span>
              <span className="text-xl font-extrabold text-primary">
                {(data.fees?.totalAssigned ?? 0) > 0
                  ? `${Math.round(((data.fees?.totalRevenue ?? data.fees?.totalCollected ?? 0) / (data.fees?.totalAssigned || 1)) * 100)}%`
                  : "0%"}
              </span>
              <span className="text-[10px] text-primary/80 block mt-0.5">Realization efficiency</span>
            </div>
          </div>
        </div>
      )}

      {/* Row 2: Real 10-Step Setup Progress Checklist */}
      <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <span>School Setup Progress</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Complete these institutional configuration milestones to prepare for student admissions and operations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs font-bold text-foreground">
                {setup.completedSteps} of {setup.totalSteps} Configured
              </span>
              <span className="text-[10px] text-muted-foreground block">
                {setup.percentage}% Completed
              </span>
            </div>
            <div className="w-16 h-2 rounded-full bg-surface-3 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${setup.percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* 10 Checklist Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {setup.items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all hover:border-primary/50 group ${
                item.completed
                  ? "bg-surface-2 border-border text-foreground"
                  : "bg-surface-2/50 border-border/70 text-muted-foreground hover:bg-surface-2"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {item.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                )}
                <span className={`font-semibold ${item.completed ? "text-foreground" : "text-muted-foreground"}`}>
                  {item.label}
                </span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
            </Link>
          ))}
        </div>
      </div>

      {/* Row 3: Quick Action Shortcuts */}
      <div className="space-y-3">
        <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>Quick Actions & Workspaces</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {[
            { label: "Student Directory", href: "/admin/students", icon: Users, color: "text-indigo-500" },
            { label: "Enroll Student", href: "/admin/students/create", icon: User, color: "text-primary" },
            { label: "Bulk Promotion", href: "/admin/students/promote", icon: GraduationCap, color: "text-purple-500" },
            { label: "Parents Directory", href: "/admin/parents", icon: ShieldCheck, color: "text-emerald-500" },
            { label: "Classes & Sections", href: "/admin/academics/classes", icon: Building2, color: "text-amber-500" },
            { label: "Subjects Catalog", href: "/admin/academics/subjects", icon: BookOpen, color: "text-cyan-500" },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className="p-4 rounded-2xl bg-card border border-border flex flex-col items-center justify-center text-center space-y-2 shadow-xs group hover:border-primary/40 transition-all cursor-pointer"
              >
                <div className={`p-2.5 rounded-xl bg-surface-2 group-hover:scale-105 transition-transform ${action.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="font-bold text-xs text-foreground block">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Row 4: School Profile Overview & View-Only Subscription */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: School Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl bg-card border border-border space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <span>Institution Profile</span>
              </h3>
              <Link
                href="/admin/settings"
                className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
              >
                <span>Edit Settings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground block text-[11px]">School Name:</span>
                <span className="font-bold text-sm text-foreground">{school.name}</span>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground block text-[11px]">Location:</span>
                <span className="text-foreground">
                  {school.city ? `${school.city}, ` : ""}{school.state ? `${school.state}, ` : ""}{school.country}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground block text-[11px]">Contact Email:</span>
                <span className="font-mono text-foreground">{school.email || user.email}</span>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground block text-[11px]">Phone / Helpline:</span>
                <span className="text-foreground">{school.phone || "Not configured"}</span>
              </div>
            </div>

            {/* Active Licensed Modules */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                  Active Licensed Modules ({school.enabledModules.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {school.enabledModules.map((mod) => (
                  <span
                    key={mod}
                    className="px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-[11px] font-medium text-foreground"
                  >
                    {mod.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Subscription & License View-Only Card */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-card border border-border space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-500" />
                <span>Subscription License</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/20">
                {school.subscriptionStatus}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Current Plan:</span>
                <span className="font-bold text-foreground font-mono">{school.plan}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Student Limit:</span>
                <span className="font-bold text-foreground font-mono">{school.studentLimit} Students</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Days Remaining:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {daysRemaining} Days
                </span>
              </div>

              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Renewal Expiry:</span>
                <span className="font-mono text-foreground">
                  {new Date(school.subscriptionExpiryDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
