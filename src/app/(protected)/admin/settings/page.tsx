"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Settings,
  Building2,
  Image as ImageIcon,
  GraduationCap,
  CalendarCheck,
  CreditCard,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Plus,
  Trash2,
  Sparkles,
  Eye,
  ArrowLeft,
  Users,
} from "lucide-react";

type SettingsTab = "info" | "branding" | "grading" | "attendance" | "fees" | "roles";

interface GradingScaleItem {
  grade: string;
  minPercentage: number;
  maxPercentage: number;
  gradePoint?: number;
  description?: string;
}

export default function SchoolSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("info");
  const [isLoading, setIsLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tab 1: School Profile Form
  const [schoolInfo, setSchoolInfo] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    phone: "",
    email: "",
    website: "",
  });
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  // Tab 2: School Branding Form
  const [branding, setBranding] = useState({
    logo: "",
    favicon: "",
    primaryColor: "#4f46e5",
    secondaryColor: "#06b6d4",
  });
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  // Tab 3: Grading Settings Form
  const [gradingSettings, setGradingSettings] = useState<{
    gradingType: "PERCENTAGE" | "GRADE_POINT";
    scales: GradingScaleItem[];
  }>({
    gradingType: "PERCENTAGE",
    scales: [
      { grade: "A+", minPercentage: 90, maxPercentage: 100, gradePoint: 10, description: "Outstanding" },
      { grade: "A", minPercentage: 80, maxPercentage: 89.99, gradePoint: 9, description: "Excellent" },
      { grade: "B+", minPercentage: 70, maxPercentage: 79.99, gradePoint: 8, description: "Very Good" },
      { grade: "B", minPercentage: 60, maxPercentage: 69.99, gradePoint: 7, description: "Good" },
      { grade: "C", minPercentage: 50, maxPercentage: 59.99, gradePoint: 6, description: "Average" },
      { grade: "D", minPercentage: 40, maxPercentage: 49.99, gradePoint: 5, description: "Pass" },
      { grade: "F", minPercentage: 0, maxPercentage: 39.99, gradePoint: 0, description: "Fail" },
    ],
  });
  const [isSavingGrading, setIsSavingGrading] = useState(false);

  // Tab 4: Attendance Settings Form
  const [attendanceSettings, setAttendanceSettings] = useState({
    attendanceTypes: ["PRESENT", "ABSENT", "LATE", "LEAVE"],
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  });
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

  // Tab 5: Fee Settings Form
  const [feeSettings, setFeeSettings] = useState({
    categories: ["Tuition Fee", "Admission Fee", "Examination Fee", "Library Fee", "Transport Fee"],
    paymentFrequencies: ["MONTHLY", "QUARTERLY", "ANNUALLY"],
    lateFeeGraceDays: 7,
    lateFeeFineAmount: 100,
    lateFeeType: "FIXED" as "FIXED" | "PERCENTAGE",
  });
  const [newFeeCategory, setNewFeeCategory] = useState("");
  const [isSavingFees, setIsSavingFees] = useState(false);

  const fetchAllSettings = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [schoolRes, brandingRes, gradingRes, attendanceRes, feesRes] = await Promise.all([
        fetch("/api/admin/school"),
        fetch("/api/admin/settings/branding"),
        fetch("/api/admin/settings/grading"),
        fetch("/api/admin/settings/attendance"),
        fetch("/api/admin/settings/fees"),
      ]);

      if (schoolRes.ok) {
        const json = await schoolRes.json();
        if (json.data) {
          setSchoolInfo({
            name: json.data.name || "",
            address: json.data.address || "",
            city: json.data.city || "",
            state: json.data.state || "",
            country: json.data.country || "India",
            phone: json.data.phone || "",
            email: json.data.email || "",
            website: json.data.website || "",
          });
        }
      }

      if (brandingRes.ok) {
        const json = await brandingRes.json();
        if (json.data?.branding) {
          setBranding({
            logo: json.data.branding.logo || "",
            favicon: json.data.branding.favicon || "",
            primaryColor: json.data.branding.primaryColor || "#4f46e5",
            secondaryColor: json.data.branding.secondaryColor || "#06b6d4",
          });
        }
      }

      if (gradingRes.ok) {
        const json = await gradingRes.json();
        if (json.data?.gradingSettings) {
          setGradingSettings(json.data.gradingSettings);
        }
      }

      if (attendanceRes.ok) {
        const json = await attendanceRes.json();
        if (json.data?.attendanceSettings) {
          setAttendanceSettings(json.data.attendanceSettings);
        }
      }

      if (feesRes.ok) {
        const json = await feesRes.json();
        if (json.data?.feeSettings) {
          setFeeSettings(json.data.feeSettings);
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error loading settings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSettings();
  }, []);

  // Save School Information
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingInfo(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/school", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schoolInfo),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Failed to update profile");
      setSuccessMsg("School profile information updated successfully.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error saving profile");
    } finally {
      setIsSavingInfo(false);
    }
  };

  // Save Branding
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBranding(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/settings/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branding),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Failed to update branding");
      setSuccessMsg("School branding preferences saved successfully.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error saving branding");
    } finally {
      setIsSavingBranding(false);
    }
  };

  // Save Grading Settings
  const handleSaveGrading = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGrading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/settings/grading", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gradingSettings),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Failed to save grading settings");
      setSuccessMsg("Grading scale configuration saved successfully.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error saving grading settings");
    } finally {
      setIsSavingGrading(false);
    }
  };

  // Save Attendance Settings
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAttendance(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/settings/attendance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attendanceSettings),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Failed to save attendance settings");
      setSuccessMsg("Attendance policy configuration saved successfully.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error saving attendance settings");
    } finally {
      setIsSavingAttendance(false);
    }
  };

  // Save Fee Settings
  const handleSaveFees = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingFees(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/settings/fees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feeSettings),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Failed to save fee settings");
      setSuccessMsg("Fee policy configuration saved successfully.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error saving fee settings");
    } finally {
      setIsSavingFees(false);
    }
  };

  // Helpers for grading rows
  const addGradingScaleRow = () => {
    setGradingSettings({
      ...gradingSettings,
      scales: [
        ...gradingSettings.scales,
        { grade: "E", minPercentage: 30, maxPercentage: 39.99, gradePoint: 4, description: "Marginal" },
      ],
    });
  };

  const removeGradingScaleRow = (index: number) => {
    const updated = [...gradingSettings.scales];
    updated.splice(index, 1);
    setGradingSettings({ ...gradingSettings, scales: updated });
  };

  // Helpers for fee categories
  const addFeeCategory = () => {
    if (!newFeeCategory.trim()) return;
    if (feeSettings.categories.includes(newFeeCategory.trim())) return;
    setFeeSettings({
      ...feeSettings,
      categories: [...feeSettings.categories, newFeeCategory.trim()],
    });
    setNewFeeCategory("");
  };

  const removeFeeCategory = (cat: string) => {
    setFeeSettings({
      ...feeSettings,
      categories: feeSettings.categories.filter((c) => c !== cat),
    });
  };

  const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Link href="/admin" className="hover:text-foreground transition-colors">
            School Dashboard
          </Link>
          <span>/</span>
          <span className="text-foreground font-semibold">Settings</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-primary" />
          <span>Institution Settings & Configuration</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your school profile, branding palette, academic grading rules, and administrative operational policies.
        </p>
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-muted-foreground hover:text-foreground text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-muted-foreground hover:text-foreground text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Tabs Navigation Bar */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-surface-2 border border-border">
        {[
          { id: "info", label: "School Info", icon: Building2 },
          { id: "branding", label: "Branding & Colors", icon: ImageIcon },
          { id: "grading", label: "Grading System", icon: GraduationCap },
          { id: "attendance", label: "Attendance Policy", icon: CalendarCheck },
          { id: "fees", label: "Fee Settings", icon: CreditCard },
          { id: "roles", label: "Roles & Permissions", icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as SettingsTab);
                setSuccessMsg(null);
                setErrorMsg(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-3"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-primary" : ""}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground space-y-2">
          <RotateCw className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-xs">Loading institution settings...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: SCHOOL INFO */}
          {activeTab === "info" && (
            <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-sm space-y-6">
              <div className="border-b border-border pb-4">
                <h2 className="text-lg font-bold text-foreground">Official School Profile</h2>
                <p className="text-xs text-muted-foreground">
                  Update public contact details, registered address, and communication channels.
                </p>
              </div>

              <form onSubmit={handleSaveInfo} className="space-y-5 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="font-medium text-foreground">Official School Name *</label>
                    <input
                      type="text"
                      value={schoolInfo.name}
                      onChange={(e) => setSchoolInfo({ ...schoolInfo, name: e.target.value })}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary font-medium"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="font-medium text-foreground">Street / Campus Address</label>
                    <input
                      type="text"
                      placeholder="e.g. 12/B MG Road, Knowledge Park"
                      value={schoolInfo.address}
                      onChange={(e) => setSchoolInfo({ ...schoolInfo, address: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">City</label>
                    <input
                      type="text"
                      placeholder="e.g. Lucknow"
                      value={schoolInfo.city}
                      onChange={(e) => setSchoolInfo({ ...schoolInfo, city: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">State / Province</label>
                    <input
                      type="text"
                      placeholder="e.g. Uttar Pradesh"
                      value={schoolInfo.state}
                      onChange={(e) => setSchoolInfo({ ...schoolInfo, state: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Country</label>
                    <input
                      type="text"
                      placeholder="e.g. India"
                      value={schoolInfo.country}
                      onChange={(e) => setSchoolInfo({ ...schoolInfo, country: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Contact Telephone / Helpline</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 522 2345678"
                      value={schoolInfo.phone}
                      onChange={(e) => setSchoolInfo({ ...schoolInfo, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Official School Email</label>
                    <input
                      type="email"
                      placeholder="e.g. contact@cms.edu.in"
                      value={schoolInfo.email}
                      onChange={(e) => setSchoolInfo({ ...schoolInfo, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">School Website</label>
                    <input
                      type="text"
                      placeholder="e.g. https://www.cms.edu.in"
                      value={schoolInfo.website}
                      onChange={(e) => setSchoolInfo({ ...schoolInfo, website: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end pt-4 border-t border-border">
                  <button
                    type="submit"
                    disabled={isSavingInfo}
                    className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <Save className={`w-4 h-4 ${isSavingInfo ? "animate-spin" : ""}`} />
                    <span>{isSavingInfo ? "Saving Changes..." : "Save School Information"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: BRANDING */}
          {activeTab === "branding" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Branding Edit Form */}
              <div className="lg:col-span-2 p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-sm space-y-6">
                <div className="border-b border-border pb-4">
                  <h2 className="text-lg font-bold text-foreground">School Visual Identity</h2>
                  <p className="text-xs text-muted-foreground">
                    Customize your institution&apos;s crest, favicon, and primary brand palette.
                  </p>
                </div>

                <form onSubmit={handleSaveBranding} className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">School Logo URL / Emblem</label>
                    <input
                      type="text"
                      placeholder="https://example.com/logo.png"
                      value={branding.logo}
                      onChange={(e) => setBranding({ ...branding, logo: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      PNG or SVG image with transparent background recommended (e.g. 200x200).
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Favicon URL</label>
                    <input
                      type="text"
                      placeholder="https://example.com/favicon.ico"
                      value={branding.favicon}
                      onChange={(e) => setBranding({ ...branding, favicon: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2 p-4 rounded-2xl bg-surface-2 border border-border">
                      <label className="font-bold text-foreground block">Primary Brand Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={branding.primaryColor || "#4f46e5"}
                          onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                          className="w-10 h-10 rounded-xl border border-border cursor-pointer bg-transparent"
                        />
                        <input
                          type="text"
                          value={branding.primaryColor}
                          onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                          placeholder="#4F46E5"
                          className="flex-1 px-3 py-2 rounded-xl bg-input border border-input-border font-mono uppercase text-foreground"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 p-4 rounded-2xl bg-surface-2 border border-border">
                      <label className="font-bold text-foreground block">Secondary Accent Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={branding.secondaryColor || "#06b6d4"}
                          onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                          className="w-10 h-10 rounded-xl border border-border cursor-pointer bg-transparent"
                        />
                        <input
                          type="text"
                          value={branding.secondaryColor}
                          onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                          placeholder="#06B6D4"
                          className="flex-1 px-3 py-2 rounded-xl bg-input border border-input-border font-mono uppercase text-foreground"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-4 border-t border-border">
                    <button
                      type="submit"
                      disabled={isSavingBranding}
                      className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <Save className={`w-4 h-4 ${isSavingBranding ? "animate-spin" : ""}`} />
                      <span>{isSavingBranding ? "Saving..." : "Save Branding"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Live Interactive Branding Preview Card */}
              <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-foreground font-bold text-sm border-b border-border pb-3">
                  <Eye className="w-4 h-4 text-primary" />
                  <span>Live Branding Preview</span>
                </div>

                <div className="p-5 rounded-2xl border border-border space-y-4 bg-surface-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-md"
                      style={{ backgroundColor: branding.primaryColor || "#4f46e5" }}
                    >
                      {branding.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={branding.logo}
                          alt="Logo"
                          className="w-full h-full object-cover rounded-2xl"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <Building2 className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-foreground">
                        {schoolInfo.name || "City Montessori School"}
                      </h3>
                      <span className="text-[10px] text-muted-foreground block">
                        {schoolInfo.city ? `${schoolInfo.city}, ` : ""}{schoolInfo.state || "Uttar Pradesh"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-[11px]">Primary Button</span>
                      <button
                        type="button"
                        style={{ backgroundColor: branding.primaryColor || "#4f46e5" }}
                        className="px-3 py-1.5 rounded-lg text-white font-bold text-[11px] shadow-xs cursor-default"
                      >
                        Enroll Student
                      </button>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-[11px]">Accent Badge</span>
                      <span
                        style={{
                          backgroundColor: `${branding.secondaryColor || "#06b6d4"}20`,
                          color: branding.secondaryColor || "#06b6d4",
                          borderColor: `${branding.secondaryColor || "#06b6d4"}40`,
                        }}
                        className="px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase font-mono"
                      >
                        Grade A+
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Note: School branding styles are applied to tenant letterheads, circular headers, and reports without altering the global application dark/light theme preference.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: GRADING SYSTEM */}
          {activeTab === "grading" && (
            <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Grading System & Evaluation Scales</h2>
                  <p className="text-xs text-muted-foreground">
                    Define score percentages, letter grades, and grade points for report cards and assessments.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addGradingScaleRow}
                  className="px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-foreground font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-primary" />
                  <span>Add Grade Row</span>
                </button>
              </div>

              <form onSubmit={handleSaveGrading} className="space-y-5 text-xs">
                <div className="max-w-xs space-y-1.5">
                  <label className="font-medium text-foreground">Grading Evaluation Method</label>
                  <select
                    value={gradingSettings.gradingType}
                    onChange={(e) =>
                      setGradingSettings({
                        ...gradingSettings,
                        gradingType: e.target.value as "PERCENTAGE" | "GRADE_POINT",
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground font-semibold"
                  >
                    <option value="PERCENTAGE">Percentage-based (Letter Grades)</option>
                    <option value="GRADE_POINT">Grade Point (GPA / 10-Point Scale)</option>
                  </select>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
                        <th className="py-2.5 px-3">Grade Label</th>
                        <th className="py-2.5 px-3">Min %</th>
                        <th className="py-2.5 px-3">Max %</th>
                        <th className="py-2.5 px-3">Grade Point</th>
                        <th className="py-2.5 px-3">Remark / Descriptor</th>
                        <th className="py-2.5 px-3 text-right">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {gradingSettings.scales.map((row, idx) => (
                        <tr key={idx} className="hover:bg-surface-2 transition-colors">
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={row.grade}
                              onChange={(e) => {
                                const next = [...gradingSettings.scales];
                                next[idx].grade = e.target.value;
                                setGradingSettings({ ...gradingSettings, scales: next });
                              }}
                              required
                              className="w-20 px-2.5 py-1.5 rounded-lg bg-input border border-input-border font-bold text-center text-foreground"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              max={100}
                              value={row.minPercentage}
                              onChange={(e) => {
                                const next = [...gradingSettings.scales];
                                next[idx].minPercentage = parseFloat(e.target.value) || 0;
                                setGradingSettings({ ...gradingSettings, scales: next });
                              }}
                              required
                              className="w-20 px-2.5 py-1.5 rounded-lg bg-input border border-input-border text-foreground"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              max={100}
                              value={row.maxPercentage}
                              onChange={(e) => {
                                const next = [...gradingSettings.scales];
                                next[idx].maxPercentage = parseFloat(e.target.value) || 0;
                                setGradingSettings({ ...gradingSettings, scales: next });
                              }}
                              required
                              className="w-20 px-2.5 py-1.5 rounded-lg bg-input border border-input-border text-foreground"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              step="0.1"
                              value={row.gradePoint ?? 0}
                              onChange={(e) => {
                                const next = [...gradingSettings.scales];
                                next[idx].gradePoint = parseFloat(e.target.value) || 0;
                                setGradingSettings({ ...gradingSettings, scales: next });
                              }}
                              className="w-20 px-2.5 py-1.5 rounded-lg bg-input border border-input-border text-foreground font-mono"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={row.description || ""}
                              onChange={(e) => {
                                const next = [...gradingSettings.scales];
                                next[idx].description = e.target.value;
                                setGradingSettings({ ...gradingSettings, scales: next });
                              }}
                              placeholder="e.g. Outstanding"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-input border border-input-border text-foreground"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeGradingScaleRow(idx)}
                              disabled={gradingSettings.scales.length <= 1}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer disabled:opacity-30"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-end pt-4 border-t border-border">
                  <button
                    type="submit"
                    disabled={isSavingGrading}
                    className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <Save className={`w-4 h-4 ${isSavingGrading ? "animate-spin" : ""}`} />
                    <span>{isSavingGrading ? "Saving..." : "Save Grading Configuration"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: ATTENDANCE POLICIES */}
          {activeTab === "attendance" && (
            <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-sm space-y-6">
              <div className="border-b border-border pb-4">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider mb-1">
                  <span>Phase A4 Module Foundation</span>
                </div>
                <h2 className="text-lg font-bold text-foreground">Attendance & Working Schedule</h2>
                <p className="text-xs text-muted-foreground">
                  Designate institutional working days and recognized roll-call status indicators.
                </p>
              </div>

              <form onSubmit={handleSaveAttendance} className="space-y-6 text-xs">
                {/* Working Days Selector */}
                <div className="space-y-3">
                  <label className="font-bold text-foreground block text-sm">
                    Institutional Working Days
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Select all days of the week on which classes and attendance roll-calls are held.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {ALL_DAYS.map((day) => {
                      const isChecked = attendanceSettings.workingDays.includes(day);
                      return (
                        <label
                          key={day}
                          className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                            isChecked
                              ? "bg-primary/10 border-primary text-foreground font-bold shadow-xs"
                              : "bg-surface-2 border-border text-muted-foreground"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAttendanceSettings({
                                  ...attendanceSettings,
                                  workingDays: [...attendanceSettings.workingDays, day],
                                });
                              } else {
                                setAttendanceSettings({
                                  ...attendanceSettings,
                                  workingDays: attendanceSettings.workingDays.filter((d) => d !== day),
                                });
                              }
                            }}
                            className="w-4 h-4 rounded text-primary focus:ring-primary"
                          />
                          <span>{day}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Status Types */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <label className="font-bold text-foreground block text-sm">
                    Recognized Attendance Status Types
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {attendanceSettings.attendanceTypes.map((type) => (
                      <span
                        key={type}
                        className="px-3 py-1.5 rounded-xl bg-surface-2 border border-border text-foreground font-mono font-semibold text-xs"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end pt-4 border-t border-border">
                  <button
                    type="submit"
                    disabled={isSavingAttendance}
                    className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <Save className={`w-4 h-4 ${isSavingAttendance ? "animate-spin" : ""}`} />
                    <span>{isSavingAttendance ? "Saving..." : "Save Attendance Policy"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 5: FEE SETTINGS */}
          {activeTab === "fees" && (
            <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-sm space-y-6">
              <div className="border-b border-border pb-4">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider mb-1">
                  <span>Phase A7 Module Foundation</span>
                </div>
                <h2 className="text-lg font-bold text-foreground">Fee Structure & Billing Rules</h2>
                <p className="text-xs text-muted-foreground">
                  Configure school fee categories, installment intervals, and late fee grace periods.
                </p>
              </div>

              <form onSubmit={handleSaveFees} className="space-y-6 text-xs">
                {/* Fee Categories */}
                <div className="space-y-3">
                  <label className="font-bold text-foreground block text-sm">Fee Head Categories</label>
                  <div className="flex items-center gap-2 max-w-md">
                    <input
                      type="text"
                      placeholder="e.g. Science Lab Fee, Sports Fee"
                      value={newFeeCategory}
                      onChange={(e) => setNewFeeCategory(e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={addFeeCategory}
                      className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {feeSettings.categories.map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-2 border border-border text-foreground font-medium"
                      >
                        <span>{cat}</span>
                        <button
                          type="button"
                          onClick={() => removeFeeCategory(cat)}
                          className="text-muted-foreground hover:text-destructive text-xs"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Late Fee Rules */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Grace Period (Days)</label>
                    <input
                      type="number"
                      min={0}
                      value={feeSettings.lateFeeGraceDays}
                      onChange={(e) =>
                        setFeeSettings({
                          ...feeSettings,
                          lateFeeGraceDays: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                    />
                    <p className="text-[10px] text-muted-foreground">Days after due date before late fee applies.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Late Fine Amount</label>
                    <input
                      type="number"
                      min={0}
                      value={feeSettings.lateFeeFineAmount}
                      onChange={(e) =>
                        setFeeSettings({
                          ...feeSettings,
                          lateFeeFineAmount: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Fine Calculation Type</label>
                    <select
                      value={feeSettings.lateFeeType}
                      onChange={(e) =>
                        setFeeSettings({
                          ...feeSettings,
                          lateFeeType: e.target.value as "FIXED" | "PERCENTAGE",
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground font-semibold"
                    >
                      <option value="FIXED">Fixed Amount (e.g. ₹100)</option>
                      <option value="PERCENTAGE">Percentage of Overdue (e.g. 5%)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-4 border-t border-border">
                  <button
                    type="submit"
                    disabled={isSavingFees}
                    className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <Save className={`w-4 h-4 ${isSavingFees ? "animate-spin" : ""}`} />
                    <span>{isSavingFees ? "Saving..." : "Save Fee Settings"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 6: ROLES & PERMISSIONS MATRIX */}
          {activeTab === "roles" && (
            <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-sm space-y-6">
              <div className="border-b border-border pb-4">
                <h2 className="text-lg font-bold text-foreground">Roles & Access Permissions Architecture</h2>
                <p className="text-xs text-muted-foreground">
                  Review the RBAC authorization levels and capabilities mapped to user roles.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-5 rounded-2xl bg-surface-2 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-sm">School Administrator (ADMIN)</span>
                    <span className="px-2 py-0.5 rounded bg-primary/15 text-primary font-bold uppercase font-mono text-[10px]">
                      Your Active Role
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Full operational control within your tenant school: classes, sections, subjects, timetables, teachers, students, and institutional configuration.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-surface-2 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-sm">Teacher (TEACHER)</span>
                    <span className="px-2 py-0.5 rounded bg-surface-3 text-muted-foreground font-bold uppercase font-mono text-[10px]">
                      Upcoming Phase A3
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Class attendance marking, assignment posting, exam marks entry, and student roll-call management for assigned sections.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-surface-2 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-sm">Student (STUDENT)</span>
                    <span className="px-2 py-0.5 rounded bg-surface-3 text-muted-foreground font-bold uppercase font-mono text-[10px]">
                      Upcoming Phase A2
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Personal portal access for attendance percentage, timetables, assignment submissions, report cards, and circulars.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-surface-2 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-sm">Parent (PARENT)</span>
                    <span className="px-2 py-0.5 rounded bg-surface-3 text-muted-foreground font-bold uppercase font-mono text-[10px]">
                      Upcoming Phase A2
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Parent portal for monitoring ward&apos;s daily attendance, exam scorecards, fee invoices, and notices.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
