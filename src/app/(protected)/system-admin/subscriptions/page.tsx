"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CreditCard,
  Search,
  RotateCw,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  Edit,
  Sparkles,
  Users,
  ShieldCheck,
  ChevronRight,
  Filter,
} from "lucide-react";
import { SCHOOL_PLANS, SUBSCRIPTION_STATUSES, SchoolPlan, SubscriptionStatus } from "@/lib/validation/school";

interface SubscriptionItem {
  id: string;
  name: string;
  code: string;
  plan: SchoolPlan;
  status: string;
  studentLimit: number;
  subscriptionStartDate: string;
  subscriptionExpiryDate: string;
  subscriptionStatus: SubscriptionStatus;
  enabledModules: string[];
  usage: {
    totalStudents: number;
    totalTeachers: number;
    totalAdmins: number;
  };
  createdAt: string;
}

export default function SubscriptionsDirectoryPage() {
  const [schools, setSchools] = useState<SubscriptionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [planFilter, setPlanFilter] = useState<string>("ALL");

  // Summary Metrics
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    trial: 0,
    expiringSoon: 0,
    expired: 0,
  });

  const fetchSubscriptions = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      params.append("limit", "100");
      if (search.trim()) params.append("search", search.trim());
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (planFilter !== "ALL") params.append("plan", planFilter);

      const res = await fetch(`/api/system-admin/schools?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load subscriptions");
      }

      const items: SubscriptionItem[] = json.data.schools || [];
      setSchools(items);

      // Compute statistics
      const now = new Date().getTime();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;

      let activeCount = 0;
      let trialCount = 0;
      let expiringCount = 0;
      let expiredCount = 0;

      items.forEach((item) => {
        if (item.subscriptionStatus === "ACTIVE") activeCount++;
        if (item.subscriptionStatus === "TRIAL") trialCount++;
        if (item.subscriptionStatus === "EXPIRED" || item.subscriptionStatus === "CANCELLED") expiredCount++;

        const expiryTime = new Date(item.subscriptionExpiryDate).getTime();
        if (expiryTime > now && expiryTime - now <= thirtyDays) {
          expiringCount++;
        }
      });

      setStats({
        total: json.data.pagination?.total || items.length,
        active: activeCount,
        trial: trialCount,
        expiringSoon: expiringCount,
        expired: expiredCount,
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error fetching subscriptions");
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, planFilter]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const getDaysRemaining = (expiryDateStr: string) => {
    const now = new Date();
    const expiry = new Date(expiryDateStr);
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (status: SubscriptionStatus, daysRemaining: number) => {
    if (status === "ACTIVE") {
      if (daysRemaining <= 7) {
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Expiring Soon ({daysRemaining}d)</span>
          </span>
        );
      }
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          <span>Active</span>
        </span>
      );
    }
    if (status === "TRIAL") {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          <span>Trial ({daysRemaining > 0 ? `${daysRemaining}d left` : "Expired"})</span>
        </span>
      );
    }
    if (status === "SUSPENDED") {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          <span>Suspended</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-muted text-muted-foreground border border-border flex items-center gap-1">
        <Clock className="w-3 h-3" />
        <span>{status}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            <span>License & Entitlements</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Subscription Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track tenant school license periods, plan allocations, student quotas, and renewals.
          </p>
        </div>

        <button
          onClick={() => fetchSubscriptions()}
          className="p-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-foreground transition-all flex items-center gap-2 text-xs font-medium cursor-pointer shadow-sm self-start sm:self-auto"
        >
          <RotateCw className={`w-4 h-4 text-primary ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Licenses</span>
          <div className="text-2xl font-extrabold text-foreground mt-1">{stats.total}</div>
          <span className="text-[10px] text-muted-foreground">All onboarded schools</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Active</span>
          <div className="text-2xl font-extrabold text-foreground mt-1">{stats.active}</div>
          <span className="text-[10px] text-muted-foreground">Operational subscriptions</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">Free Trial</span>
          <div className="text-2xl font-extrabold text-foreground mt-1">{stats.trial}</div>
          <span className="text-[10px] text-muted-foreground">Evaluating platform</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">Expiring in 30d</span>
          <div className="text-2xl font-extrabold text-foreground mt-1">{stats.expiringSoon}</div>
          <span className="text-[10px] text-muted-foreground">Require renewal</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs col-span-2 lg:col-span-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500">Expired / Inactive</span>
          <div className="text-2xl font-extrabold text-foreground mt-1">{stats.expired}</div>
          <span className="text-[10px] text-muted-foreground">Needs intervention</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search school name or code..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-input border border-input-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Plan Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium">Plan:</span>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-input border border-input-border text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Plans</option>
              {SCHOOL_PLANS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-input border border-input-border text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Statuses</option>
              {SUBSCRIPTION_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      {isLoading ? (
        <div className="p-12 rounded-2xl bg-card border border-border text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground font-medium">Loading school subscriptions...</p>
        </div>
      ) : schools.length === 0 ? (
        <div className="p-12 rounded-2xl bg-card border border-border text-center space-y-3 shadow-sm">
          <div className="p-4 rounded-2xl bg-primary/10 text-primary w-fit mx-auto">
            <CreditCard className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-foreground">No matching subscriptions found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Adjust your search or status filters to view active subscriptions.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-1/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3.5 px-4">School</th>
                  <th className="py-3.5 px-4">Current Plan</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">License Period</th>
                  <th className="py-3.5 px-4">Student Capacity</th>
                  <th className="py-3.5 px-4">Modules</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {schools.map((school) => {
                  const daysRemaining = getDaysRemaining(school.subscriptionExpiryDate);
                  const studentsCount = school.usage?.totalStudents || 0;
                  const usagePercent = Math.min(
                    100,
                    Math.round((studentsCount / (school.studentLimit || 1)) * 100)
                  );

                  return (
                    <tr
                      key={school.id}
                      className="hover:bg-surface-1/50 transition-colors"
                    >
                      {/* School info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-foreground block">{school.name}</span>
                            <span className="font-mono text-[10px] text-muted-foreground uppercase">
                              {school.code}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-md bg-surface-2 border border-border text-[11px] font-bold font-mono text-foreground">
                          {school.plan}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(school.subscriptionStatus, daysRemaining)}
                      </td>

                      {/* Dates & Countdown */}
                      <td className="py-3.5 px-4 space-y-1">
                        <div className="flex items-center gap-1 text-[11px] text-foreground">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span>Expires: {new Date(school.subscriptionExpiryDate).toLocaleDateString()}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground block font-mono">
                          {daysRemaining > 0 ? `${daysRemaining} days remaining` : "Expired"}
                        </span>
                      </td>

                      {/* Capacity progress */}
                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-medium text-foreground">
                            <span>{studentsCount.toLocaleString()} / {school.studentLimit.toLocaleString()}</span>
                            <span className="text-muted-foreground font-mono">{usagePercent}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-surface-2 overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                usagePercent > 90
                                  ? "bg-destructive"
                                  : usagePercent > 70
                                  ? "bg-amber-500"
                                  : "bg-primary"
                              }`}
                              style={{ width: `${usagePercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Modules */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-surface-2 border border-border text-[10px] font-medium text-muted-foreground">
                          {school.enabledModules?.length || 0} Modules
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/system-admin/schools/${school.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border text-foreground font-medium text-xs transition-all shadow-xs"
                        >
                          <Edit className="w-3 h-3 text-primary" />
                          <span>Manage</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
