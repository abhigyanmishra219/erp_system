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
  UserCheck,
  ShieldCheck,
  Copy,
  Check,
  ArrowRight,
  AlertTriangle,
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

interface CreatedOnboardingData {
  school: {
    id: string;
    name: string;
    code: string;
    plan: string;
    status: string;
    subscriptionStatus: string;
    studentLimit: number;
    enabledModules: string[];
    createdAt: string;
  };
  schoolAdmin: {
    id: string;
    email: string;
    role: string;
  };
  temporaryPassword: string;
}

export default function CreateSchoolPage() {
  const router = useRouter();

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    schoolAdminEmail: "",
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

  // Success Modal State for Temporary Credentials
  const [createdData, setCreatedData] = useState<CreatedOnboardingData | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

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

  const handleCopyPassword = () => {
    if (!createdData) return;
    navigator.clipboard.writeText(createdData.temporaryPassword);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleCopyAll = () => {
    if (!createdData) return;
    const text = `ERP Nexus — School Onboarding Credentials\n==========================================\nSchool Name: ${createdData.school.name}\nSchool ID / Code: ${createdData.school.code}\nSchool Admin Email: ${createdData.schoolAdmin.email}\nRole: School Administrator (ADMIN)\nTemporary Password: ${createdData.temporaryPassword}\n\nNote: The administrator is required to change this password upon first login.`;
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleContinueToSchool = () => {
    if (!createdData) return;
    const schoolId = createdData.school.id;
    // Clear credentials state before navigating
    setCreatedData(null);
    router.push(`/system-admin/schools/${schoolId}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.name.trim()) {
      setErrorMessage("Please provide a School Name.");
      return;
    }

    if (!formData.schoolAdminEmail.trim()) {
      setErrorMessage("Please provide a School Administrator Email address.");
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
          schoolAdminEmail: formData.schoolAdminEmail.trim().toLowerCase(),
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(
          json.error?.message || json.error || "Failed to create school and administrator"
        );
      }

      // Show credentials dialog instead of navigating immediately
      setCreatedData(json.data);
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
              Provision a new multi-tenant school database instance and create its initial School Administrator account.
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

        {/* Section 2: School Administrator Account */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm border-b border-border pb-3">
            <UserCheck className="w-4 h-4 text-indigo-500" />
            <span>2. School Administrator</span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Create the primary administrator account for this school. The administrator will use the temporary password generated during onboarding and will be required to change it after the first login.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
            {/* School Admin Email */}
            <div className="space-y-1.5">
              <label htmlFor="schoolAdminEmail" className="font-medium text-foreground flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-primary" />
                <span>School Admin Email <span className="text-destructive">*</span></span>
              </label>
              <input
                id="schoolAdminEmail"
                type="email"
                value={formData.schoolAdminEmail}
                onChange={(e) =>
                  setFormData({ ...formData, schoolAdminEmail: e.target.value })
                }
                placeholder="admin@school.edu"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border focus:border-primary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="text-[10px] text-muted-foreground">
                This email will be used by the school administrator to sign in.
              </p>
            </div>

            {/* Role Display (Immutable & Informational) */}
            <div className="space-y-1.5">
              <label className="font-medium text-foreground flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span>Assigned Role</span>
              </label>
              <div className="px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  School Administrator
                </span>
                <span className="px-2 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider font-mono">
                  ADMIN
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Role is strictly server-enforced as School Administrator (ADMIN).
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Contact & Location */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm border-b border-border pb-3">
            <MapPin className="w-4 h-4 text-emerald-500" />
            <span>3. Location & Contact Details</span>
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
                <span>Official General Email</span>
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

        {/* Section 4: Subscription & Plan Tier */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm border-b border-border pb-3">
            <Layers className="w-4 h-4 text-purple-500" />
            <span>4. Subscription & Student Capacity</span>
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

        {/* Section 5: Enabled Modules Configuration */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
              <CheckSquare className="w-4 h-4 text-primary" />
              <span>5. Enabled Modules Configuration</span>
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
            <span>{isSubmitting ? "Creating School & Admin..." : "Save & Provision School"}</span>
          </button>
        </div>
      </form>

      {/* Credential Success Dialog */}
      {createdData && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-popover border border-border rounded-2xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl text-foreground animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-success/10 border border-success/20 text-success rounded-full flex items-center justify-center mx-auto shadow-md">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                School Created Successfully
              </h2>
              <p className="text-xs text-muted-foreground">
                The tenant school and its primary administrator account have been provisioned.
              </p>
            </div>

            {/* Credentials Card */}
            <div className="p-4 rounded-xl bg-surface-2 border border-border space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-border">
                <span className="text-muted-foreground">School Name:</span>
                <span className="font-semibold text-foreground">{createdData.school.name}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-border">
                <span className="text-muted-foreground">School ID / Code:</span>
                <span className="font-mono font-bold text-primary">{createdData.school.code}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-border">
                <span className="text-muted-foreground">School Admin Email:</span>
                <span className="font-mono text-foreground">{createdData.schoolAdmin.email}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-border">
                <span className="text-muted-foreground">Role:</span>
                <span className="px-2 py-0.5 rounded bg-primary/15 text-primary font-bold uppercase tracking-wider text-[10px]">
                  School Administrator ({createdData.schoolAdmin.role})
                </span>
              </div>

              {/* Temporary Password Highlight Box */}
              <div className="pt-2">
                <span className="text-muted-foreground block text-[11px] mb-1 font-medium">
                  Temporary Password:
                </span>
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface-1 border border-primary/30 font-mono text-sm font-bold text-primary tracking-wider select-all">
                  <span>{createdData.temporaryPassword}</span>
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-surface-3 text-foreground text-xs font-medium flex items-center gap-1 transition-all border border-border cursor-pointer"
                  >
                    {copiedPassword ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-success" />
                        <span className="text-success">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Warning Callout */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold block">Save these credentials securely!</span>
                The temporary password will only be shown now and cannot be retrieved later.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopyAll}
                className="flex-1 py-2.5 px-4 rounded-xl bg-surface-2 hover:bg-surface-3 text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-border cursor-pointer shadow-sm"
              >
                {copiedAll ? (
                  <>
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-success">Credentials Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy All Credentials</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleContinueToSchool}
                className="flex-1 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-primary/25 cursor-pointer"
              >
                <span>Continue to School</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
