"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  School,
  Building2,
  Users,
  ShieldCheck,
  PlusCircle,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  Activity,
  Sparkles,
  Layers,
  GraduationCap,
} from "lucide-react";

interface DashboardData {
  schools: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    trial: number;
    expired: number;
  };
  users: {
    total: number;
    active: number;
    systemAdmins: number;
    admins: number;
  };
  students: {
    total: number;
    note: string;
  };
  teachers: {
    total: number;
    note: string;
  };
  parents: {
    total: number;
    note: string;
  };
  recentSchools: Array<{
    id: string;
    name: string;
    code: string;
    plan: string;
    status: string;
    subscriptionStatus: string;
    studentLimit: number;
    createdAt: string;
  }>;
}

export default function SystemAdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/system-admin/dashboard");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load dashboard statistics");
      }
      setData(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading dashboard");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "INACTIVE":
        return "bg-surface-3 text-muted-foreground border-border";
      case "SUSPENDED":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default:
        return "bg-surface-3 text-muted-foreground border-border";
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case "ENTERPRISE":
        return "bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30";
      case "PROFESSIONAL":
        return "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30";
      case "STANDARD":
        return "bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30";
      default:
        return "bg-surface-2 text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-xl relative overflow-hidden">
        <div className="space-y-1.5 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Platform Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            System Admin Overview
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
            Monitor tenant institutions, subscription statuses, platform users, and multi-tenant telemetry in real time.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-muted-foreground hover:text-foreground transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/system-admin/schools/create"
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs sm:text-sm font-semibold shadow-lg shadow-primary/20 flex items-center gap-2 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create School</span>
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchDashboardData}
            className="underline hover:opacity-80 font-medium cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Schools */}
        <div className="p-5 rounded-2xl bg-card border border-border space-y-3 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Schools
            </span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <School className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground">
              {isLoading ? "—" : data?.schools.total ?? 0}
            </span>
            <span className="text-xs text-muted-foreground font-medium">registered</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1 border-t border-border">
            <span className="text-emerald-500 font-medium">
              {data?.schools.active ?? 0} Active
            </span>
            <span>•</span>
            <span className="text-amber-500 font-medium">
              {data?.schools.trial ?? 0} Trial
            </span>
            <span>•</span>
            <span className="text-rose-500 font-medium">
              {data?.schools.suspended ?? 0} Suspended
            </span>
          </div>
        </div>

        {/* Active Schools */}
        <div className="p-5 rounded-2xl bg-card border border-border space-y-3 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Active Schools
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-500">
              {isLoading ? "—" : data?.schools.active ?? 0}
            </span>
            <span className="text-xs text-muted-foreground font-medium">in operation</span>
          </div>
          <p className="text-[11px] text-muted-foreground pt-1 border-t border-border">
            Live tenants with active subscription
          </p>
        </div>

        {/* Platform Users */}
        <div className="p-5 rounded-2xl bg-card border border-border space-y-3 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Platform Users
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground">
              {isLoading ? "—" : data?.users.total ?? 0}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              ({data?.users.active ?? 0} active)
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1 border-t border-border">
            <span className="text-primary font-medium">
              {data?.users.systemAdmins ?? 0} System Admins
            </span>
            <span>•</span>
            <span className="text-foreground font-medium">
              {data?.users.admins ?? 0} Admins
            </span>
          </div>
        </div>

        {/* Student/Teacher Modules Telemetry */}
        <div className="p-5 rounded-2xl bg-card border border-border space-y-3 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Student Accounts
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground">
              {isLoading ? "—" : data?.students.total ?? 0}
            </span>
            <span className="text-xs text-muted-foreground font-medium">enrolled</span>
          </div>
          <p className="text-[11px] text-muted-foreground pt-1 border-t border-border">
            {data?.students.note || "Calculated from MongoDB"}
          </p>
        </div>
      </div>

      {/* Quick Action Cards & Recent Schools Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Schools Table (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm text-foreground">
                Recently Added Schools
              </h2>
            </div>
            <Link
              href="/system-admin/schools"
              className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
              Loading schools from database...
            </div>
          ) : !data?.recentSchools || data.recentSchools.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <School className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground">No schools created yet.</p>
              <Link
                href="/system-admin/schools/create"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-medium transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create First School</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground uppercase tracking-wider text-[10px]">
                    <th className="pb-3 font-semibold">School Name</th>
                    <th className="pb-3 font-semibold">Code</th>
                    <th className="pb-3 font-semibold">Plan</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.recentSchools.map((school) => (
                    <tr
                      key={school.id}
                      className="hover:bg-surface-2/50 transition-colors group"
                    >
                      <td className="py-3 font-medium text-foreground">
                        <Link
                          href={`/system-admin/schools/${school.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          {school.name}
                        </Link>
                      </td>
                      <td className="py-3 font-mono text-muted-foreground">
                        {school.code}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getPlanBadge(
                            school.plan
                          )}`}
                        >
                          {school.plan}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider ${getStatusBadge(
                            school.status
                          )}`}
                        >
                          {school.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/system-admin/schools/${school.id}`}
                          className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-surface-3 text-foreground transition-all text-[11px] font-medium inline-flex items-center gap-1 border border-border shadow-sm"
                        >
                          <span>Manage</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Action Shortcuts & System Info (1 col) */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <span>Administrative Actions</span>
            </h3>

            <div className="space-y-2.5">
              <Link
                href="/system-admin/schools/create"
                className="flex items-center justify-between p-3 rounded-xl bg-surface-2 border border-border hover:border-primary/50 hover:bg-surface-3 transition-all text-xs font-medium text-foreground group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <span>Onboard New School</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>

              <Link
                href="/system-admin/schools"
                className="flex items-center justify-between p-3 rounded-xl bg-surface-2 border border-border hover:border-primary/50 hover:bg-surface-3 transition-all text-xs font-medium text-foreground group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                    <School className="w-4 h-4" />
                  </div>
                  <span>Manage All Schools</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
              </Link>

              <Link
                href="/system-admin/users"
                className="flex items-center justify-between p-3 rounded-xl bg-surface-2 border border-border hover:border-primary/50 hover:bg-surface-3 transition-all text-xs font-medium text-foreground group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
                    <Users className="w-4 h-4" />
                  </div>
                  <span>Platform Users Directory</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-500 transition-colors" />
              </Link>
            </div>
          </div>

          {/* SaaS Core Status */}
          <div className="p-5 rounded-2xl bg-card border border-border space-y-3 text-xs shadow-sm">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Platform Health</span>
            </h4>
            <div className="space-y-2 text-muted-foreground">
              <div className="flex justify-between items-center py-1 border-b border-border">
                <span>Database:</span>
                <span className="text-emerald-500 font-mono">MongoDB Atlas (Connected)</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border">
                <span>Auth Protocol:</span>
                <span className="text-foreground font-mono">JWT + HTTP-Only Cookie</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span>Phase Status:</span>
                <span className="text-primary font-mono">Phase 1: Multi-Tenant Core</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
