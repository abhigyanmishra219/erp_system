"use client";

import React, { useState } from "react";
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

export default function CreatePlanPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    maxStudents: 500 as number | string,
    storageLimit: 5120 as number | string, // 5 GB in MB
    maxAdmins: 2 as number | string,
    enabledModules: [
      "ATTENDANCE",
      "ASSIGNMENTS",
      "STUDY_MATERIAL",
      "EXAMS",
      "RESULTS",
      "FEES",
      "NOTICES",
      "NOTIFICATIONS",
    ] as SchoolModule[],
    price: 9999 as number | string,
    currency: "INR",
    billingPeriod: "YEARLY" as BillingPeriod,
    isActive: true,
  });

  const [isCodeCustomized, setIsCodeCustomized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleModuleToggle = (mod: SchoolModule) => {
    setFormData((prev) => {
      const exists = prev.enabledModules.includes(mod);
      const updated = exists
        ? prev.enabledModules.filter((m) => m !== mod)
        : [...prev.enabledModules, mod];
      return { ...prev, enabledModules: updated };
    });
    if (fieldErrors.enabledModules) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy.enabledModules;
        return copy;
      });
    }
  };

  const handleSelectAllModules = () => {
    setFormData((prev) => ({
      ...prev,
      enabledModules: [...SCHOOL_MODULES],
    }));
    if (fieldErrors.enabledModules) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy.enabledModules;
        return copy;
      });
    }
  };

  const handleDeselectAllModules = () => {
    setFormData((prev) => ({
      ...prev,
      enabledModules: [],
    }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      errors.name = "Plan name is required.";
    } else if (trimmedName.length > 60) {
      errors.name = "Plan name cannot exceed 60 characters.";
    }

    const trimmedCode = formData.code.trim().toUpperCase();
    if (!trimmedCode) {
      errors.code = "Plan code is required.";
    } else if (!/^[A-Z0-9_-]+$/.test(trimmedCode)) {
      errors.code = "Plan code can only contain letters, numbers, hyphens, and underscores.";
    } else if (trimmedCode.length > 30) {
      errors.code = "Plan code cannot exceed 30 characters.";
    }

    if (formData.description && formData.description.length > 500) {
      errors.description = "Description cannot exceed 500 characters.";
    }

    const maxStudentsNum = Number(formData.maxStudents);
    if (isNaN(maxStudentsNum) || !Number.isInteger(maxStudentsNum) || maxStudentsNum < 1) {
      errors.maxStudents = "Maximum students must be an integer greater than 0.";
    }

    const storageLimitNum = Number(formData.storageLimit);
    if (isNaN(storageLimitNum) || !Number.isInteger(storageLimitNum) || storageLimitNum < 100) {
      errors.storageLimit = "Storage limit must be at least 100 MB.";
    }

    const maxAdminsNum = Number(formData.maxAdmins);
    if (isNaN(maxAdminsNum) || !Number.isInteger(maxAdminsNum) || maxAdminsNum < 1) {
      errors.maxAdmins = "Maximum school admins must be an integer greater than 0.";
    }

    const priceNum = Number(formData.price);
    if (isNaN(priceNum) || priceNum < 0) {
      errors.price = "Price cannot be negative.";
    }

    if (formData.enabledModules.length === 0) {
      errors.enabledModules = "Please select at least one module for this plan.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateForm()) {
      setErrorMessage("Please fix the validation errors below before submitting.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      description: formData.description.trim(),
      maxStudents: Number(formData.maxStudents),
      storageLimit: Number(formData.storageLimit),
      maxAdmins: Number(formData.maxAdmins),
      enabledModules: formData.enabledModules,
      price: Number(formData.price),
      currency: formData.currency.trim().toUpperCase() || "INR",
      billingPeriod: formData.billingPeriod,
      isActive: Boolean(formData.isActive),
    };

    try {
      const res = await fetch("/api/system-admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        // Map backend validation error details if available
        if (json.error?.details && Array.isArray(json.error.details)) {
          const apiFieldErrors: Record<string, string> = {};
          json.error.details.forEach((item: { field: string; message: string }) => {
            if (item.field) {
              apiFieldErrors[item.field] = item.message;
            }
          });
          setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }));
        } else if (json.error?.validationErrors?.fieldErrors) {
          const apiFieldErrors: Record<string, string> = {};
          Object.entries(json.error.validationErrors.fieldErrors).forEach(([k, v]) => {
            if (Array.isArray(v) && v.length > 0) {
              apiFieldErrors[k] = v[0];
            }
          });
          setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }));
        }

        if (json.error?.code === "DUPLICATE_CODE") {
          setFieldErrors((prev) => ({
            ...prev,
            code: json.error?.message || "Plan code already exists.",
          }));
        }

        throw new Error(json.error?.message || "Failed to create plan.");
      }

      router.push("/system-admin/plans");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error creating plan.");
      setIsSubmitting(false);
    }
  };

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
              <span>Tier Definition</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Create Subscription Plan
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Define pricing, student thresholds, storage quotas, and feature entitlements.
            </p>
          </div>
        </div>
      </div>

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
            <span>1. Plan Identity & Description</span>
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
                onChange={(e) => {
                  const nameVal = e.target.value;
                  const autoCode = nameVal.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "_").slice(0, 30);
                  setFormData((prev) => ({
                    ...prev,
                    name: nameVal,
                    code: isCodeCustomized ? prev.code : autoCode,
                  }));
                  if (fieldErrors.name) {
                    setFieldErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.name;
                      return copy;
                    });
                  }
                }}
                placeholder="e.g. Professional Tier"
                required
                className={`w-full px-3.5 py-2.5 rounded-xl bg-input border ${
                  fieldErrors.name ? "border-destructive focus:ring-destructive" : "border-input-border focus:border-primary focus:ring-primary"
                } text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1`}
              />
              {fieldErrors.name && (
                <p className="text-[11px] text-destructive font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{fieldErrors.name}</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="code" className="font-medium text-foreground">
                Plan Code <span className="text-destructive">*</span> (Unique Identifier)
              </label>
              <input
                id="code"
                type="text"
                value={formData.code}
                onChange={(e) => {
                  setIsCodeCustomized(true);
                  const codeVal = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
                  setFormData((prev) => ({
                    ...prev,
                    code: codeVal,
                  }));
                  if (fieldErrors.code) {
                    setFieldErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.code;
                      return copy;
                    });
                  }
                }}
                placeholder="e.g. PROFESSIONAL"
                required
                className={`w-full px-3.5 py-2.5 rounded-xl bg-input border font-mono uppercase ${
                  fieldErrors.code ? "border-destructive focus:ring-destructive" : "border-input-border focus:border-primary focus:ring-primary"
                } text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1`}
              />
              {fieldErrors.code ? (
                <p className="text-[11px] text-destructive font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{fieldErrors.code}</span>
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Used in system enforcements and database tenant links.
                </p>
              )}
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label htmlFor="description" className="font-medium text-foreground">
                Plan Description
              </label>
              <textarea
                id="description"
                rows={2}
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  if (fieldErrors.description) {
                    setFieldErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.description;
                      return copy;
                    });
                  }
                }}
                placeholder="Brief summary of who this plan is suitable for..."
                className={`w-full px-3.5 py-2.5 rounded-xl bg-input border ${
                  fieldErrors.description ? "border-destructive focus:ring-destructive" : "border-input-border focus:border-primary focus:ring-primary"
                } text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1`}
              />
              {fieldErrors.description && (
                <p className="text-[11px] text-destructive font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{fieldErrors.description}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Platform Limits & Quotas */}
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
                onChange={(e) => {
                  const val = e.target.value === "" ? "" : Number(e.target.value);
                  setFormData({ ...formData, maxStudents: val });
                  if (fieldErrors.maxStudents) {
                    setFieldErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.maxStudents;
                      return copy;
                    });
                  }
                }}
                required
                className={`w-full px-3.5 py-2.5 rounded-xl bg-input border ${
                  fieldErrors.maxStudents ? "border-destructive focus:ring-destructive" : "border-input-border focus:border-primary focus:ring-primary"
                } text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1`}
              />
              {fieldErrors.maxStudents ? (
                <p className="text-[11px] text-destructive font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{fieldErrors.maxStudents}</span>
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Total active student enrollment quota.
                </p>
              )}
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
                onChange={(e) => {
                  const val = e.target.value === "" ? "" : Number(e.target.value);
                  setFormData({ ...formData, storageLimit: val });
                  if (fieldErrors.storageLimit) {
                    setFieldErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.storageLimit;
                      return copy;
                    });
                  }
                }}
                required
                className={`w-full px-3.5 py-2.5 rounded-xl bg-input border ${
                  fieldErrors.storageLimit ? "border-destructive focus:ring-destructive" : "border-input-border focus:border-primary focus:ring-primary"
                } text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1`}
              />
              {fieldErrors.storageLimit ? (
                <p className="text-[11px] text-destructive font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{fieldErrors.storageLimit}</span>
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  {typeof formData.storageLimit === "number" && formData.storageLimit >= 1024
                    ? `Equivalent to ${(formData.storageLimit / 1024).toFixed(1)} GB`
                    : `${formData.storageLimit || 0} MB`}
                </p>
              )}
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
                onChange={(e) => {
                  const val = e.target.value === "" ? "" : Number(e.target.value);
                  setFormData({ ...formData, maxAdmins: val });
                  if (fieldErrors.maxAdmins) {
                    setFieldErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.maxAdmins;
                      return copy;
                    });
                  }
                }}
                required
                className={`w-full px-3.5 py-2.5 rounded-xl bg-input border ${
                  fieldErrors.maxAdmins ? "border-destructive focus:ring-destructive" : "border-input-border focus:border-primary focus:ring-primary"
                } text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1`}
              />
              {fieldErrors.maxAdmins ? (
                <p className="text-[11px] text-destructive font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{fieldErrors.maxAdmins}</span>
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Admin accounts allowed for the tenant.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Pricing & Billing Period */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm border-b border-border pb-3">
            <CreditCard className="w-4 h-4 text-emerald-500" />
            <span>3. Commercials & Billing Cadence</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1.5">
              <label htmlFor="price" className="font-medium text-foreground">
                Price Amount <span className="text-destructive">*</span>
              </label>
              <input
                id="price"
                type="number"
                min={0}
                value={formData.price}
                onChange={(e) => {
                  const val = e.target.value === "" ? "" : Number(e.target.value);
                  setFormData({ ...formData, price: val });
                  if (fieldErrors.price) {
                    setFieldErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.price;
                      return copy;
                    });
                  }
                }}
                required
                className={`w-full px-3.5 py-2.5 rounded-xl bg-input border ${
                  fieldErrors.price ? "border-destructive focus:ring-destructive" : "border-input-border focus:border-primary focus:ring-primary"
                } text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1`}
              />
              {fieldErrors.price && (
                <p className="text-[11px] text-destructive font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{fieldErrors.price}</span>
                </p>
              )}
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
          </div>
        </div>

        {/* Section 4: Module Entitlements */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                <CheckSquare className="w-4 h-4 text-primary" />
                <span>4. Included Modules ({formData.enabledModules.length}/{SCHOOL_MODULES.length})</span>
              </div>
              {fieldErrors.enabledModules && (
                <p className="text-[11px] text-destructive font-medium flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{fieldErrors.enabledModules}</span>
                </p>
              )}
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
            <span>{isSubmitting ? "Creating Plan..." : "Save & Publish Plan"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

