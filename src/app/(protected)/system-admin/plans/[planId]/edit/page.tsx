"use client";

import React, { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Layers,
  Save,
  CheckSquare,
  Square,
  Sparkles,
  AlertCircle,
  Building2,
  HardDrive,
  Users,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import { SCHOOL_MODULES, SchoolModule } from "@/lib/validation/school";
import { BILLING_PERIODS, BillingPeriod } from "@/lib/validation/plan";

const MODULE_DESCRIPTIONS: Record<SchoolModule, string> = {
  ATTENDANCE: "Daily student & staff attendance tracking with biometric / manual modes",
  ASSIGNMENTS: "Homework submission, grading, and teacher remarks",
  STUDY_MATERIAL: "Curriculum PDFs, digital notes, and syllabus repository",
  EXAMS: "Term exam scheduling, hall tickets, and room allocations",
  RESULTS: "Report cards, percentage calculators, and grading systems",
  FEES: "Fee structures, offline/online payment receipts, and dues tracking",
  NOTICES: "Broadcast circulars, school notices, and emergency alerts",
  NOTIFICATIONS: "In-app alerts and SMS/email push triggers",
  TIMETABLE: "Classroom scheduling, period routines, and teacher substitution",
  LEAVE: "Student and staff leave application and approval workflow",
  REPORTS: "Comprehensive academic, demographic, and operational summaries",
};

export default function EditPlanPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = use(params);
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    maxStudents: 500,
    storageLimit: 5120,
    maxAdmins: 2,
    enabledModules: [] as SchoolModule[],
    price: 0,
    currency: "INR",
    billingPeriod: "YEARLY" as BillingPeriod,
    isActive: true,
  });

  const [subscribedSchoolsCount, setSubscribedSchoolsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchPlan = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/system-admin/plans/${planId}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load plan details");
      }

      const p = json.data;
      setFormData({
        name: p.name || "",
        code: p.code || "",
        description: p.description || "",
        maxStudents: p.maxStudents || 500,
        storageLimit: p.storageLimit || 5120,
        maxAdmins: p.maxAdmins || 2,
        enabledModules: p.enabledModules || [],
        price: p.price || 0,
        currency: p.currency || "INR",
        billingPeriod: p.billingPeriod || "YEARLY",
        isActive: p.isActive ?? true,
      });
      setSubscribedSchoolsCount(p.subscribedSchoolsCount || 0);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error loading plan");
    } finally {
      setIsLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const handleModuleToggle = (mod: SchoolModule) => {
    setFormData((prev) => {
      const exists = prev.enabledModules.includes(mod);
      const updated = exists
        ? prev.enabledModules.filter((m) => m !== mod)
        : [...prev.enabledModules, mod];
      return { ...prev, enabledModules: updated };
    });
  };

  const handleSelectAllModules = () => {
    setFormData((prev) => ({
      ...prev,
      enabledModules: [...SCHOOL_MODULES],
    }));
  };

  const handleDeselectAllModules = () => {
    setFormData((prev) => ({
      ...prev,
      enabledModules: [],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    if (formData.enabledModules.length === 0) {
      setErrorMessage("Please select at least one module for this plan.");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/system-admin/plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update plan.");
      }

      router.push("/system-admin/plans");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error updating plan.");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 rounded-2xl bg-card border border-border text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
        <p className="text-xs text-muted-foreground font-medium">Loading plan configuration...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Back button & Page Header */}
      <div>
        <Link
          href="/system-admin/plans"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Plans</span>
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Modify Configuration</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Edit Plan: {formData.name}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Code: <span className="font-mono font-bold text-foreground">{formData.code}</span>
            </p>
          </div>
        </div>
      </div>

      {subscribedSchoolsCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Active Subscribers Notice:</span>{" "}
            <span>
              {subscribedSchoolsCount} school{subscribedSchoolsCount === 1 ? "" : "s"} currently subscribe to this plan. Changes to default module lists and thresholds will update the source of truth for new schools and subscription renewals.
            </span>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Information */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm border-b border-border pb-3">
            <Layers className="w-4 h-4 text-primary" />
            <span>1. Plan Identity</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label htmlFor="name" className="font-medium text-foreground">
                Plan Name <span className="text-destructive">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-foreground">
                Plan Code (Immutable)
              </label>
              <input
                type="text"
                value={formData.code}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border font-mono uppercase text-muted-foreground cursor-not-allowed"
              />
              <p className="text-[10px] text-muted-foreground">
                Plan code cannot be altered once created to preserve tenant relations.
              </p>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label htmlFor="description" className="font-medium text-foreground">
                Plan Description
              </label>
              <textarea
                id="description"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Limits */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm border-b border-border pb-3">
            <Building2 className="w-4 h-4 text-indigo-500" />
            <span>2. Enforced Limits & Thresholds</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1.5">
              <label htmlFor="maxStudents" className="font-medium text-foreground flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                <span>Max Students Limit <span className="text-destructive">*</span></span>
              </label>
              <input
                id="maxStudents"
                type="number"
                min={1}
                value={formData.maxStudents}
                onChange={(e) =>
                  setFormData({ ...formData, maxStudents: parseInt(e.target.value) || 1 })
                }
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="storageLimit" className="font-medium text-foreground flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
                <span>Storage Limit (MB) <span className="text-destructive">*</span></span>
              </label>
              <input
                id="storageLimit"
                type="number"
                min={100}
                step={512}
                value={formData.storageLimit}
                onChange={(e) =>
                  setFormData({ ...formData, storageLimit: parseInt(e.target.value) || 100 })
                }
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <p className="text-[10px] text-muted-foreground">
                {formData.storageLimit >= 1024
                  ? `${(formData.storageLimit / 1024).toFixed(1)} GB`
                  : `${formData.storageLimit} MB`}
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="maxAdmins" className="font-medium text-foreground flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>Max School Admins <span className="text-destructive">*</span></span>
              </label>
              <input
                id="maxAdmins"
                type="number"
                min={1}
                value={formData.maxAdmins}
                onChange={(e) =>
                  setFormData({ ...formData, maxAdmins: parseInt(e.target.value) || 1 })
                }
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Commercials & Status */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm border-b border-border pb-3">
            <CreditCard className="w-4 h-4 text-emerald-500" />
            <span>3. Commercials & Status</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div className="space-y-1.5">
              <label htmlFor="price" className="font-medium text-foreground">
                Price Amount <span className="text-destructive">*</span>
              </label>
              <input
                id="price"
                type="number"
                min={0}
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                }
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="currency" className="font-medium text-foreground">
                Currency
              </label>
              <input
                id="currency"
                type="text"
                value={formData.currency}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value.toUpperCase() })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border uppercase text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="billingPeriod" className="font-medium text-foreground">
                Billing Cycle
              </label>
              <select
                id="billingPeriod"
                value={formData.billingPeriod}
                onChange={(e) =>
                  setFormData({ ...formData, billingPeriod: e.target.value as BillingPeriod })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {BILLING_PERIODS.map((period) => (
                  <option key={period} value={period}>
                    {period.charAt(0) + period.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="isActive" className="font-medium text-foreground">
                Active Status
              </label>
              <select
                id="isActive"
                value={formData.isActive ? "true" : "false"}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.value === "true" })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="true">Active (Open to subscriptions)</option>
                <option value="false">Inactive (Archived)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Module Entitlements */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
              <CheckSquare className="w-4 h-4 text-primary" />
              <span>4. Included Modules ({formData.enabledModules.length}/{SCHOOL_MODULES.length})</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllModules}
                className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-surface-3 text-[11px] font-medium text-foreground border border-border"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleDeselectAllModules}
                className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-surface-3 text-[11px] font-medium text-foreground border border-border"
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {SCHOOL_MODULES.map((mod) => {
              const isSelected = formData.enabledModules.includes(mod);
              return (
                <div
                  key={mod}
                  onClick={() => handleModuleToggle(mod)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    isSelected
                      ? "bg-primary/5 border-primary/40 shadow-xs"
                      : "bg-surface-1 border-border hover:border-border/80 opacity-75"
                  }`}
                >
                  <div className="mt-0.5 text-primary">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 fill-primary text-primary-foreground" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <span className="font-semibold text-xs text-foreground block">
                      {mod.replace(/_/g, " ")}
                    </span>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      {MODULE_DESCRIPTIONS[mod]}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/system-admin/plans"
            className="px-5 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-foreground text-xs font-semibold transition-all"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-md shadow-primary/25 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className={`w-4 h-4 ${isSubmitting ? "animate-spin" : ""}`} />
            <span>{isSubmitting ? "Saving Changes..." : "Update Plan Configuration"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
