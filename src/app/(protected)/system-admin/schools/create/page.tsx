"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  School as SchoolIcon,
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  Layers,
  Users,
  CheckSquare,
  Square,
  AlertCircle,
  Save,
} from "lucide-react";
import {
  SCHOOL_PLANS,
  SUBSCRIPTION_STATUSES,
  SCHOOL_MODULES,
  SchoolModule,
} from "@/lib/validation/school";
import { Sparkles, RefreshCw } from "lucide-react";

function derivePrefix(name: string): string {
  const sanitized = name.trim().replace(/[^a-zA-Z0-9\s]/g, "");
  const words = sanitized.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "SCH";
  if (words.length >= 2) {
    const initials = words.map((w) => w[0].toUpperCase()).join("").slice(0, 4);
    if (initials.length >= 2) return initials;
  }
  const single = words[0].toUpperCase().slice(0, 4);
  return single.length >= 2 ? single : `${single}SCH`.slice(0, 4);
}

function generateCode(name: string): string {
  const prefix = derivePrefix(name);
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `${prefix}${randomNum}`;
}

export default function CreateSchoolPage() {
  const router = useRouter();

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    phone: "",
    email: "",
    website: "",
    logo: "",
    plan: "BASIC" as (typeof SCHOOL_PLANS)[number],
    studentLimit: 200,
    subscriptionStartDate: new Date().toISOString().split("T")[0],
    subscriptionExpiryDate: (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      return d.toISOString().split("T")[0];
    })(),
    subscriptionStatus: "TRIAL" as (typeof SUBSCRIPTION_STATUSES)[number],
    status: "ACTIVE" as "ACTIVE" | "INACTIVE" | "SUSPENDED",
    enabledModules: [
      "ATTENDANCE",
      "ASSIGNMENTS",
      "EXAMS",
      "RESULTS",
      "FEES",
      "NOTICES",
    ] as SchoolModule[],
  });

  const [isCodeCustomized, setIsCodeCustomized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleNameChange = (name: string) => {
    setFormData((prev) => {
      const newCode = isCodeCustomized
        ? prev.code
        : name.trim()
        ? generateCode(name)
        : "";
      return {
        ...prev,
        name,
        code: newCode,
      };
    });
  };

  const handleRegenerateCode = () => {
    const freshCode = generateCode(formData.name || "SCH");
    setFormData((prev) => ({ ...prev, code: freshCode }));
    setIsCodeCustomized(false);
  };

  const handleModuleToggle = (module: SchoolModule) => {
    setFormData((prev) => {
      const exists = prev.enabledModules.includes(module);
      return {
        ...prev,
        enabledModules: exists
          ? prev.enabledModules.filter((m) => m !== module)
          : [...prev.enabledModules, module],
      };
    });
  };

  const handlePlanChange = (plan: (typeof SCHOOL_PLANS)[number]) => {
    let limit = 200;
    if (plan === "STANDARD") limit = 500;
    if (plan === "PROFESSIONAL") limit = 1000;
    if (plan === "ENTERPRISE") limit = 5000;

    setFormData((prev) => ({
      ...prev,
      plan,
      studentLimit: limit,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.name.trim()) {
      setErrorMessage("Please provide a School Name.");
      return;
    }

    const finalCode = formData.code.trim()
      ? formData.code.trim().toUpperCase()
      : generateCode(formData.name);

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/system-admin/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          code: finalCode,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to create school");
      }

      // Redirect to newly created school overview page
      router.push(`/system-admin/schools/${json.data.id}`);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to create school"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Back Button & Header */}
      <div className="space-y-2">
        <Link
          href="/system-admin/schools"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Schools List</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <SchoolIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Onboard New Tenant School
            </h1>
            <p className="text-xs text-muted-foreground">
              Provision a new multi-tenant school database instance and configure initial subscription parameters.
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-destructive hover:opacity-80 font-bold cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Section 1: Basic Information */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm border-b border-border pb-3">
            <Building2 className="w-4 h-4 text-primary" />
            <span>1. Basic School Information</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* School Name */}
            <div className="space-y-1.5">
              <label htmlFor="name" className="font-medium text-foreground">
                School Name <span className="text-destructive">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. City Montessori School, CMS, St. Xavier's"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border focus:border-primary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* School Code */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="code" className="font-medium text-foreground">
                  School Code
                </label>
                <span className="text-[10px] text-primary font-medium inline-flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  <Sparkles className="w-2.5 h-2.5 text-primary" />
                  <span>Auto-Generated & Unique</span>
                </span>
              </div>
              <div className="relative flex items-center">
                <input
                  id="code"
                  type="text"
                  value={formData.code}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
                    });
                    setIsCodeCustomized(true);
                  }}
                  placeholder="Auto-generated on typing school name..."
                  className="w-full pl-3.5 pr-24 py-2.5 rounded-xl bg-input border border-input-border focus:border-primary font-mono uppercase text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleRegenerateCode}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-foreground text-[11px] font-medium transition-all flex items-center gap-1 border border-border cursor-pointer shadow-sm"
                  title="Generate a new unique code"
                >
                  <RefreshCw className="w-3 h-3 text-primary" />
                  <span>Refresh</span>
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Generated automatically from school initials + random identifier.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Contact & Location */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm border-b border-border pb-3">
            <MapPin className="w-4 h-4 text-emerald-500" />
            <span>2. Location & Contact Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="sm:col-span-3 space-y-1.5">
              <label htmlFor="address" className="font-medium text-foreground">
                Street Address
              </label>
              <input
                id="address"
                type="text"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="e.g. 104 Campus Boulevard, Knowledge Park"
                className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border focus:border-primary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="city" className="font-medium text-foreground">
                City
              </label>
              <input
                id="city"
                type="text"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                placeholder="e.g. Mumbai"
                className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border focus:border-primary text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="state" className="font-medium text-foreground">
                State
              </label>
              <input
                id="state"
                type="text"
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
                placeholder="e.g. Maharashtra"
                className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border focus:border-primary text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="country" className="font-medium text-foreground">
                Country
              </label>
              <input
                id="country"
                type="text"
                value={formData.country}
                onChange={(e) =>
                  setFormData({ ...formData, country: e.target.value })
                }
                placeholder="e.g. India"
                className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border focus:border-primary text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="font-medium text-foreground flex items-center gap-1">
                <Mail className="w-3 h-3 text-muted-foreground" />
                <span>Official Email</span>
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="contact@school.edu"
                className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border focus:border-primary text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="phone" className="font-medium text-foreground flex items-center gap-1">
                <Phone className="w-3 h-3 text-muted-foreground" />
                <span>Contact Phone</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border focus:border-primary text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="website" className="font-medium text-foreground flex items-center gap-1">
                <Globe className="w-3 h-3 text-muted-foreground" />
                <span>Website URL</span>
              </label>
              <input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
                placeholder="https://www.school.edu"
                className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border focus:border-primary text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Subscription & Plan Tier */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm border-b border-border pb-3">
            <Layers className="w-4 h-4 text-purple-500" />
            <span>3. Subscription & Student Capacity</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Plan Tier */}
            <div className="space-y-1.5">
              <label htmlFor="plan" className="font-medium text-foreground">
                Plan Tier
              </label>
              <select
                id="plan"
                value={formData.plan}
                onChange={(e) =>
                  handlePlanChange(
                    e.target.value as (typeof SCHOOL_PLANS)[number]
                  )
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border focus:border-primary text-foreground focus:outline-none"
              >
                {SCHOOL_PLANS.map((plan) => (
                  <option key={plan} value={plan}>
                    {plan}
                  </option>
                ))}
              </select>
            </div>

            {/* Student Limit */}
            <div className="space-y-1.5">
              <label htmlFor="studentLimit" className="font-medium text-foreground flex items-center gap-1">
                <Users className="w-3 h-3 text-muted-foreground" />
                <span>Max Student Limit</span>
              </label>
              <input
                id="studentLimit"
                type="number"
                min={1}
                value={formData.studentLimit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    studentLimit: parseInt(e.target.value, 10) || 1,
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border focus:border-primary text-foreground focus:outline-none"
              />
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <label htmlFor="subscriptionStartDate" className="font-medium text-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span>Start Date</span>
              </label>
              <input
                id="subscriptionStartDate"
                type="date"
                value={formData.subscriptionStartDate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    subscriptionStartDate: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border focus:border-primary text-foreground focus:outline-none"
              />
            </div>

            {/* Expiry Date */}
            <div className="space-y-1.5">
              <label htmlFor="subscriptionExpiryDate" className="font-medium text-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span>Expiry Date</span>
              </label>
              <input
                id="subscriptionExpiryDate"
                type="date"
                value={formData.subscriptionExpiryDate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    subscriptionExpiryDate: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border focus:border-primary text-foreground focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Enabled Modules Configuration */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
              <CheckSquare className="w-4 h-4 text-primary" />
              <span>4. Enabled Modules Configuration</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {formData.enabledModules.length} selected
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {SCHOOL_MODULES.map((mod) => {
              const isChecked = formData.enabledModules.includes(mod);
              return (
                <button
                  type="button"
                  key={mod}
                  onClick={() => handleModuleToggle(mod)}
                  className={`p-3 rounded-xl border text-xs text-left transition-all flex items-center gap-2 cursor-pointer ${
                    isChecked
                      ? "bg-primary/15 border-primary/40 text-primary font-medium shadow-inner"
                      : "bg-surface-2 border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                  )}
                  <span className="truncate">{mod}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/system-admin/schools"
            className="px-5 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-xs font-medium text-foreground transition-all border border-border shadow-sm"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold shadow-lg shadow-primary/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? "Creating School..." : "Save & Provision School"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
