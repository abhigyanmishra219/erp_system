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
  ShieldCheck,
  School,
  Sparkles,
} from "lucide-react";
import { useUser } from "@/context/UserContext";

export default function DashboardPage() {
  const { user, logout } = useUser();

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case "SYSTEM_ADMIN":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "ADMIN":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "TEACHER":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "STUDENT":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "PARENT":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-none text-zinc-100">
              ERP Nexus
            </h1>
            <span className="text-[11px] text-zinc-400">
              Protected Workspace
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
              {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-zinc-200 leading-none">
                {user?.name || "User"}
              </p>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border inline-block mt-0.5 ${getRoleBadgeColor(
                  user?.role
                )}`}
              >
                {user?.role || "SYSTEM_ADMIN"}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 border border-zinc-700/60 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Dashboard Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 sm:p-8 space-y-8">
        {/* System Admin Direct Access Banner */}
        {user?.role === "SYSTEM_ADMIN" && (
          <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-zinc-900 border border-indigo-500/40 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 relative z-10">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                <span>Phase 1 Module Active</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                System Admin Control Center
              </h2>
              <p className="text-xs text-zinc-300 max-w-xl leading-relaxed">
                Manage all SaaS tenant schools, configure student limits, inspect subscriptions, and monitor platform users.
              </p>
            </div>

            <Link
              href="/system-admin"
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-all shrink-0 cursor-pointer"
            >
              <School className="w-4 h-4" />
              <span>Enter System Admin Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Welcome Card */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-zinc-900 via-indigo-950/30 to-zinc-900 border border-zinc-800/80 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Authentication Verified Server-Side</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.name || user?.email}!
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              You are logged in with role{" "}
              <span className="text-indigo-400 font-semibold">{user?.role}</span>.
              This route is protected by both server-side cookie verification and the global UserContext provider.
            </p>
          </div>
        </div>

        {/* Role & User Detail Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
            <h3 className="font-semibold text-sm text-zinc-200 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-400" />
              <span>Current User Credentials</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-2 border-b border-zinc-800/60">
                <span className="text-zinc-400">User ID:</span>
                <span className="text-zinc-300 font-mono text-[11px]">{user?.id || "N/A"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-800/60">
                <span className="text-zinc-400">Email Address:</span>
                <span className="text-zinc-200 font-mono">{user?.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-800/60">
                <span className="text-zinc-400">Role Status:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getRoleBadgeColor(
                    user?.role
                  )}`}
                >
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
            <h3 className="font-semibold text-sm text-zinc-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>System Role Permissions</span>
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <p className="font-semibold text-zinc-200">SYSTEM_ADMIN</p>
                  <p className="text-[10px] text-zinc-400">Full System Control</p>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <p className="font-semibold text-zinc-200">ADMIN</p>
                  <p className="text-[10px] text-zinc-400">Institution Manager</p>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <p className="font-semibold text-zinc-200">TEACHER</p>
                  <p className="text-[10px] text-zinc-400">Classes & Grading</p>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-semibold text-zinc-200">STUDENT / PARENT</p>
                  <p className="text-[10px] text-zinc-400">Portal Access</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Return to Landing */}
        <div className="pt-2 text-center">
          <Link
            href="/"
            className="text-xs text-zinc-500 hover:text-zinc-300 hover:underline transition-colors"
          >
            ← Return to Public Homepage
          </Link>
        </div>
      </main>
    </div>
  );
}
