"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Layers,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Users,
  HardDrive,
  ShieldCheck,
  Building2,
  Edit,
  Power,
  RotateCw,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { SchoolModule } from "@/lib/validation/school";

interface PlanItem {
  id: string;
  name: string;
  code: string;
  description: string;
  maxStudents: number;
  storageLimit: number;
  maxAdmins: number;
  enabledModules: SchoolModule[];
  price: number;
  currency: string;
  billingPeriod: string;
  isActive: boolean;
  subscribedSchoolsCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function PlansManagementPage() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const [togglingPlanId, setTogglingPlanId] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const res = await fetch(`/api/system-admin/plans?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load plans");
      }

      setPlans(json.data.plans || []);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error fetching plans");
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleToggleStatus = async (plan: PlanItem) => {
    setTogglingPlanId(plan.id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const newStatus = !plan.isActive;
      const res = await fetch(`/api/system-admin/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update plan status");
      }

      setSuccessMessage(
        `Plan '${plan.name}' has been ${newStatus ? "activated" : "deactivated"} successfully.`
      );
      fetchPlans();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error updating plan status");
    } finally {
      setTogglingPlanId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Platform Configuration</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Plan & Limit Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure dynamic subscription tiers, student capacity, storage limits, and module entitlements.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchPlans()}
            className="p-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-foreground transition-all flex items-center gap-2 text-xs font-medium cursor-pointer shadow-sm"
            title="Refresh plans list"
          >
            <RotateCw className={`w-4 h-4 text-primary ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <Link
            href="/system-admin/plans/create"
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center gap-2 shadow-md shadow-primary/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Plan</span>
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2.5">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by plan name, code, description..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-input border border-input-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
            Status:
          </span>
          <div className="flex items-center p-1 rounded-xl bg-surface-2 border border-border text-xs">
            {(["ALL", "ACTIVE", "INACTIVE"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  statusFilter === st
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st === "ALL" ? "All Plans" : st === "ACTIVE" ? "Active" : "Inactive"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Plans List / Grid */}
      {isLoading ? (
        <div className="p-12 rounded-2xl bg-card border border-border text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground font-medium">Loading platform plans...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="p-12 rounded-2xl bg-card border border-border text-center space-y-4 shadow-sm">
          <div className="p-4 rounded-2xl bg-primary/10 text-primary w-fit mx-auto">
            <Layers className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">No plans have been configured yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              Create your first subscription tier to define student limits, storage capacities, and enabled modules.
            </p>
          </div>
          <Link
            href="/system-admin/plans/create"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-md shadow-primary/25 hover:bg-primary/90 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Plan</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const isToggling = togglingPlanId === plan.id;
            return (
              <div
                key={plan.id}
                className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between shadow-sm hover:shadow-md ${
                  plan.isActive
                    ? "bg-card border-border hover:border-primary/40"
                    : "bg-surface-1 border-border/60 opacity-80"
                }`}
              >
                <div className="p-5 space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-foreground">{plan.name}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-surface-2 text-foreground border border-border">
                          {plan.code}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {plan.description || "No description provided."}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                        plan.isActive
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {plan.isActive ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          <span>Inactive</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Pricing Display */}
                  <div className="p-3.5 rounded-xl bg-surface-2 border border-border flex items-baseline justify-between">
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                        Pricing
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-xl font-extrabold text-foreground">
                          {plan.currency} {plan.price.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-medium">
                          / {plan.billingPeriod.toLowerCase()}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Active Subscribers
                      </span>
                      <div className="flex items-center justify-end gap-1 text-xs font-bold text-primary mt-0.5">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{plan.subscribedSchoolsCount} School{plan.subscribedSchoolsCount === 1 ? "" : "s"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Limits Breakdown */}
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Plan Enforcements & Limits
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-surface-1 border border-border/70 text-center">
                        <Users className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
                        <span className="text-xs font-bold text-foreground block">
                          {plan.maxStudents.toLocaleString()}
                        </span>
                        <span className="text-[9px] text-muted-foreground">Max Students</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-surface-1 border border-border/70 text-center">
                        <HardDrive className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                        <span className="text-xs font-bold text-foreground block">
                          {plan.storageLimit >= 1024
                            ? `${(plan.storageLimit / 1024).toFixed(1)} GB`
                            : `${plan.storageLimit} MB`}
                        </span>
                        <span className="text-[9px] text-muted-foreground">Storage</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-surface-1 border border-border/70 text-center">
                        <ShieldCheck className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                        <span className="text-xs font-bold text-foreground block">
                          {plan.maxAdmins}
                        </span>
                        <span className="text-[9px] text-muted-foreground">Max Admins</span>
                      </div>
                    </div>
                  </div>

                  {/* Module Entitlements */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold uppercase tracking-wider text-muted-foreground">
                        Enabled Modules
                      </span>
                      <span className="text-[10px] font-mono text-primary font-semibold">
                        {plan.enabledModules.length} Modules
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                      {plan.enabledModules.map((mod) => (
                        <span
                          key={mod}
                          className="px-2 py-0.5 rounded-md bg-surface-2 border border-border text-[10px] font-medium text-foreground"
                        >
                          {mod.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 border-t border-border bg-surface-1/50 rounded-b-2xl flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleToggleStatus(plan)}
                    disabled={isToggling}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border cursor-pointer ${
                      plan.isActive
                        ? "bg-surface-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive border-border hover:border-destructive/30"
                        : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    }`}
                  >
                    <Power className={`w-3.5 h-3.5 ${isToggling ? "animate-spin" : ""}`} />
                    <span>{plan.isActive ? "Deactivate" : "Activate"}</span>
                  </button>

                  <Link
                    href={`/system-admin/plans/${plan.id}/edit`}
                    className="px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border text-foreground text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Edit className="w-3.5 h-3.5 text-primary" />
                    <span>Edit Plan</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
