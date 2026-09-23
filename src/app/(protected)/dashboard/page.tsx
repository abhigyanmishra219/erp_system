"use client";

import React from "react";
import Link from "next/link";
import {
  Building2,
  LogOut,
  ShieldAlert,
  Users,
  GraduationCap,
  BookOpen,
  UserCheck,
  Activity,
  Layers,
  ArrowRight,
  School,
  Sparkles,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import ThemeToggle from "@/components/ThemeToggle";

export default function DashboardPage() {
  const { user, logout } = useUser();

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case "SYSTEM_ADMIN":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      case "ADMIN":
        return "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
      case "TEACHER":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "STUDENT":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "PARENT":
        return "bg-cyan-500/10 text-cyan-500 border-cyan-500/20";
      default:
        return "bg-surface-3 text-muted-foreground border-border";
    }
  };

  const getRoleDisplayName = (role?: string) => {
    switch (role) {
      case "SYSTEM_ADMIN":
        return "System Admin";
      case "ADMIN":
        return "School Administrator";
      case "TEACHER":
        return "Teacher";
      case "STUDENT":
        return "Student";
      case "PARENT":
        return "Parent";
      default:
        return role || "User";
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background text-foreground">
      {/* Top Navigation */}
      <header className="border-b border-border bg-header backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-none text-foreground">
              ERP Nexus
            </h1>
            <span className="text-[11px] text-muted-foreground">
              Protected Workspace
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-surface-2 border border-border">
            <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-xs">
              {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-foreground leading-none">
                {user?.name || "User"}
              </p>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border inline-block mt-0.5 ${getRoleBadgeColor(
                  user?.role
                )}`}
              >
                {getRoleDisplayName(user?.role)}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-surface-2 hover:bg-surface-3 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 border border-border cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Dashboard Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 sm:p-8 space-y-8">
        {/* System Admin Direct Access Banner */}
        {user?.role === "SYSTEM_ADMIN" ? (
          <div className="p-6 rounded-2xl bg-card border border-primary/40 shadow-xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 relative z-10">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                <span>Phase 1 Module Active</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                System Admin Control Center
              </h2>
              <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                Manage all SaaS tenant schools, configure student limits, inspect subscriptions, and monitor platform users.
              </p>
            </div>

            <Link
              href="/system-admin"
              className="px-5 py-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold shadow-lg shadow-primary/20 flex items-center gap-2 transition-all shrink-0 cursor-pointer"
            >
              <School className="w-4 h-4" />
              <span>Enter System Admin Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : user?.role === "ADMIN" ? (
          <div className="p-6 rounded-2xl bg-card border border-primary/40 shadow-xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 relative z-10">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                <span>School Administrator Portal Active</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                Institution Management Workspace
              </h2>
              <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                Manage your institution&apos;s academic operations, classes, teachers, and enrolled students under your tenant instance.
              </p>
            </div>

            <Link
              href="/admin"
              className="px-5 py-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold shadow-lg shadow-primary/20 flex items-center gap-2 transition-all shrink-0 cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              <span>Enter School Admin Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : user?.role === "TEACHER" ? (
          <div className="p-6 rounded-2xl bg-card border border-amber-500/40 shadow-xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 relative z-10">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                <span>Teacher Portal Active</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                Academic Faculty Workspace
              </h2>
              <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                Access your assigned classes, mark attendance, distribute coursework, record exam marks, and coordinate with students.
              </p>
            </div>

            <Link
              href="/teacher/dashboard"
              className="px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-lg shadow-amber-600/20 flex items-center gap-2 transition-all shrink-0 cursor-pointer"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Enter Teacher Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : null}

        {/* Welcome Card */}
        <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
              <Activity className="w-3.5 h-3.5 text-success" />
              <span>Authentication Verified Server-Side</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Welcome back, {user?.name || user?.email}!
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You are logged in with role{" "}
              <span className="text-primary font-semibold">{getRoleDisplayName(user?.role)}</span>.
              This route is protected by both server-side cookie verification and the global UserContext provider.
            </p>
          </div>
        </div>

        {/* Role & User Detail Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-primary" />
              <span>Current User Credentials</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">User ID:</span>
                <span className="text-foreground font-mono text-[11px]">{user?.id || "N/A"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Email Address:</span>
                <span className="text-foreground font-mono">{user?.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Role Status:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getRoleBadgeColor(
                    user?.role
                  )}`}
                >
                  {getRoleDisplayName(user?.role)} ({user?.role})
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-success" />
              <span>System Role Permissions</span>
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-surface-2 border border-border flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">SYSTEM_ADMIN</p>
                  <p className="text-[10px] text-muted-foreground">Full Platform Control</p>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-2 border border-border flex items-center gap-2">
                <Users className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">ADMIN (School Admin)</p>
                  <p className="text-[10px] text-muted-foreground">Institution Manager</p>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-2 border border-border flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">TEACHER</p>
                  <p className="text-[10px] text-muted-foreground">Classes & Grading</p>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-2 border border-border flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">STUDENT / PARENT</p>
                  <p className="text-[10px] text-muted-foreground">Portal Access</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Return to Landing */}
        <div className="pt-2 text-center">
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors"
          >
            ← Return to Public Homepage
          </Link>
        </div>
      </main>
    </div>
  );
}
