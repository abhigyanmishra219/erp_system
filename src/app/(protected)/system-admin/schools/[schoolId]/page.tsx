"use client";

import React, { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  School as SchoolIcon,
  ArrowLeft,
  Calendar,
  Layers,
  MapPin,
  Mail,
  Phone,
  Globe,
  Edit,
  Trash2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Users,
  GraduationCap,
  HardDrive,
  Clock,
  ShieldCheck,
  Building2,
  X,
  Save,
  CheckSquare,
  Square,
} from "lucide-react";
import {
  SCHOOL_PLANS,
  SUBSCRIPTION_STATUSES,
  SCHOOL_MODULES,
  SchoolModule,
} from "@/lib/validation/school";

interface SchoolDetails {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  logo?: string;
  website?: string;
  plan: string;
  studentLimit: number;
  subscriptionStartDate: string;
  subscriptionExpiryDate: string;
  subscriptionStatus: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  enabledModules: SchoolModule[];
  createdBy?: { name?: string; email?: string; role?: string } | null;
  updatedBy?: { name?: string; email?: string; role?: string } | null;
  createdAt: string;
  updatedAt: string;
  usage: {
    totalStudents: number;
    totalTeachers: number;
    totalParents: number;
    totalAdmins: number;
    storageUsedBytes: number;
    storageUsedFormatted: string;
  };
}

export default function SchoolOverviewPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = use(params);
  const router = useRouter();

  const [school, setSchool] = useState<SchoolDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<SchoolDetails>>({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Delete / Status Action Confirmation Modal
  const [actionType, setActionType] = useState<
    "ACTIVATE" | "DEACTIVATE" | "SUSPEND" | "DELETE" | null
  >(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const fetchSchoolDetails = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/system-admin/schools/${schoolId}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load school details");
      }

      setSchool(json.data);
      setEditFormData(json.data);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error fetching school details"
      );
    } finally {
      setIsLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchSchoolDetails();
  }, [fetchSchoolDetails]);

  const handleStatusChange = async (
    newStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED"
  ) => {
    setIsProcessingAction(true);
    try {
      const res = await fetch(`/api/system-admin/schools/${schoolId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update status");
      }

      setFeedbackMessage(`Status updated to ${newStatus}`);
      setActionType(null);
      fetchSchoolDetails();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error updating status"
      );
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDelete = async () => {
    setIsProcessingAction(true);
    try {
      const res = await fetch(`/api/system-admin/schools/${schoolId}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to archive school");
      }

      // Route back to schools list after deletion
      router.push("/system-admin/schools");
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error deleting school"
      );
      setIsProcessingAction(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingEdit(true);
    try {
      const res = await fetch(`/api/system-admin/schools/${schoolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update school info");
      }

      setFeedbackMessage("School details updated successfully!");
      setIsEditModalOpen(false);
      fetchSchoolDetails();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error saving changes"
      );
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleEditModuleToggle = (mod: SchoolModule) => {
    setEditFormData((prev) => {
      const current = prev.enabledModules || [];
      const exists = current.includes(mod);
      return {
        ...prev,
        enabledModules: exists
          ? current.filter((m) => m !== mod)
          : [...current, mod],
      };
    });
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "INACTIVE":
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
      case "SUSPENDED":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-3">
        <SchoolIcon className="w-8 h-8 text-indigo-400 animate-bounce mx-auto" />
        <p className="text-xs text-zinc-400">Loading school profile from MongoDB...</p>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="py-24 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">School Not Found</h2>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto">
          The requested school does not exist or has been archived.
        </p>
        <Link
          href="/system-admin/schools"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Schools Directory</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Actions Header */}
      <div className="space-y-3">
        <Link
          href="/system-admin/schools"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Schools List</span>
        </Link>

        {/* Feedback Toast */}
        {feedbackMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{feedbackMessage}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-emerald-400 hover:text-emerald-300 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-300 font-bold"
            >
              ×
            </button>
          </div>
        )}

        <div className="p-6 rounded-2xl bg-gradient-to-r from-zinc-900 via-indigo-950/20 to-zinc-900 border border-zinc-800/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-extrabold text-xl shrink-0 shadow-lg shadow-indigo-600/10">
              {school.name[0]?.toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {school.name}
                </h1>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 text-indigo-300 border border-zinc-700 font-semibold">
                  {school.code}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase tracking-wider ${getStatusBadge(
                    school.status
                  )}`}
                >
                  {school.status}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Tenant Database Instance • Plan:{" "}
                <span className="text-indigo-400 font-semibold">
                  {school.plan}
                </span>{" "}
                • Max Students:{" "}
                <span className="text-zinc-200 font-medium">
                  {school.studentLimit}
                </span>
              </p>
            </div>
          </div>

          {/* Action Button Strip */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setEditFormData(school);
                setIsEditModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition-all flex items-center gap-1.5 border border-zinc-700/60 cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5 text-indigo-400" />
              <span>Edit Details</span>
            </button>

            {school.status !== "ACTIVE" && (
              <button
                onClick={() => setActionType("ACTIVATE")}
                className="px-3.5 py-2 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Activate</span>
              </button>
            )}

            {school.status === "ACTIVE" && (
              <button
                onClick={() => setActionType("DEACTIVATE")}
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-all flex items-center gap-1.5 border border-zinc-700 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Deactivate</span>
              </button>
            )}

            {school.status !== "SUSPENDED" && (
              <button
                onClick={() => setActionType("SUSPEND")}
                className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Suspend</span>
              </button>
            )}

            <button
              onClick={() => setActionType("DELETE")}
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Archive</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: 2 Column details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Subscription, Modules & Telemetry */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subscription Card */}
          <div className="p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <h3 className="font-semibold text-sm text-zinc-200 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Subscription & Billing Status</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase">
                {school.subscriptionStatus}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-1">
                <span className="text-zinc-500 block">Plan Tier:</span>
                <span className="text-sm font-bold text-zinc-200">{school.plan}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-1">
                <span className="text-zinc-500 block">Start Date:</span>
                <span className="text-zinc-200 font-medium">
                  {new Date(school.subscriptionStartDate).toLocaleDateString()}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-1">
                <span className="text-zinc-500 block">Expiry Date:</span>
                <span className="text-rose-400 font-medium">
                  {new Date(school.subscriptionExpiryDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Enabled Modules Grid */}
          <div className="p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <h3 className="font-semibold text-sm text-zinc-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Enabled Platform Modules</span>
              </h3>
              <span className="text-xs text-zinc-400">
                {school.enabledModules.length} Modules Active
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {school.enabledModules.map((mod) => (
                <div
                  key={mod}
                  className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center gap-2 text-xs font-medium text-zinc-300"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{mod}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Usage Telemetry (Live / 0 for unbuilt models) */}
          <div className="p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 space-y-4">
            <h3 className="font-semibold text-sm text-zinc-200 flex items-center gap-2 border-b border-zinc-800/80 pb-3">
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              <span>Multi-Tenant Telemetry</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-center">
              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-1">
                <span className="text-2xl font-bold text-white">
                  {school.usage?.totalStudents ?? 0}
                </span>
                <span className="text-[11px] text-zinc-400 block">Enrolled Students</span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Limit: {school.studentLimit}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-1">
                <span className="text-2xl font-bold text-white">
                  {school.usage?.totalTeachers ?? 0}
                </span>
                <span className="text-[11px] text-zinc-400 block">Faculty Teachers</span>
                <span className="text-[10px] text-zinc-500 font-mono">Module Soon</span>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-1">
                <span className="text-2xl font-bold text-white">
                  {school.usage?.totalParents ?? 0}
                </span>
                <span className="text-[11px] text-zinc-400 block">Parent Accounts</span>
                <span className="text-[10px] text-zinc-500 font-mono">Module Soon</span>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-1">
                <span className="text-2xl font-bold text-white">
                  {school.usage?.storageUsedFormatted ?? "0 MB"}
                </span>
                <span className="text-[11px] text-zinc-400 block">Cloud Storage</span>
                <span className="text-[10px] text-zinc-500 font-mono">Phase 1 Default</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Location & Metadata Info */}
        <div className="space-y-6">
          {/* Contact Card */}
          <div className="p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 space-y-4">
            <h3 className="font-semibold text-sm text-zinc-200 flex items-center gap-2 border-b border-zinc-800/80 pb-3">
              <MapPin className="w-4 h-4 text-indigo-400" />
              <span>Contact & Location</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-zinc-400 block">Address:</span>
                  <span className="text-zinc-200">
                    {school.address || "No street address provided"}
                  </span>
                  <span className="text-zinc-400 block text-[11px] mt-0.5">
                    {school.city ? `${school.city}, ` : ""}
                    {school.state ? `${school.state}, ` : ""}
                    {school.country || "India"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2 border-t border-zinc-800/60">
                <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
                <div>
                  <span className="text-zinc-400 block">Email:</span>
                  <span className="text-zinc-200 font-mono">
                    {school.email || "N/A"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2 border-t border-zinc-800/60">
                <Phone className="w-4 h-4 text-zinc-500 shrink-0" />
                <div>
                  <span className="text-zinc-400 block">Phone:</span>
                  <span className="text-zinc-200">
                    {school.phone || "N/A"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2 border-t border-zinc-800/60">
                <Globe className="w-4 h-4 text-zinc-500 shrink-0" />
                <div>
                  <span className="text-zinc-400 block">Website:</span>
                  {school.website ? (
                    <a
                      href={school.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:underline break-all"
                    >
                      {school.website}
                    </a>
                  ) : (
                    <span className="text-zinc-500">N/A</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Metadata Card */}
          <div className="p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 space-y-3 text-xs text-zinc-400">
            <h4 className="font-semibold text-zinc-300 flex items-center gap-2 border-b border-zinc-800/80 pb-2">
              <Clock className="w-4 h-4 text-zinc-500" />
              <span>Record Timestamps</span>
            </h4>
            <div className="flex justify-between py-1">
              <span>Database ID:</span>
              <span className="font-mono text-zinc-500 text-[11px]">{school.id}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Created At:</span>
              <span className="text-zinc-300">{new Date(school.createdAt).toLocaleString()}</span>
            </div>
            {school.createdBy && (
              <div className="flex justify-between py-1">
                <span>Created By:</span>
                <span className="text-zinc-300 font-medium">
                  {school.createdBy.name || school.createdBy.email || "System Admin"}
                </span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span>Last Modified:</span>
              <span className="text-zinc-300">{new Date(school.updatedAt).toLocaleString()}</span>
            </div>
            {school.updatedBy && (
              <div className="flex justify-between py-1">
                <span>Updated By:</span>
                <span className="text-zinc-300 font-medium">
                  {school.updatedBy.name || school.updatedBy.email || "System Admin"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit School Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-2xl w-full my-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit className="w-4 h-4 text-indigo-400" />
                <span>Edit School Information: {school.name}</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-zinc-300">School Name</label>
                  <input
                    type="text"
                    value={editFormData.name || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950/60 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-zinc-300">Plan Tier</label>
                  <select
                    value={editFormData.plan || "BASIC"}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        plan: e.target.value as (typeof SCHOOL_PLANS)[number],
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950/60 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-indigo-500"
                  >
                    {SCHOOL_PLANS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-zinc-300">Max Student Limit</label>
                  <input
                    type="number"
                    min={1}
                    value={editFormData.studentLimit || 200}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        studentLimit: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950/60 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-zinc-300">Subscription Status</label>
                  <select
                    value={editFormData.subscriptionStatus || "TRIAL"}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        subscriptionStatus: e.target.value as (typeof SUBSCRIPTION_STATUSES)[number],
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950/60 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-indigo-500"
                  >
                    {SUBSCRIPTION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-zinc-300">Expiry Date</label>
                  <input
                    type="date"
                    value={
                      editFormData.subscriptionExpiryDate
                        ? new Date(editFormData.subscriptionExpiryDate)
                            .toISOString()
                            .split("T")[0]
                        : ""
                    }
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        subscriptionExpiryDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950/60 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-zinc-300">Email</label>
                  <input
                    type="email"
                    value={editFormData.email || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950/60 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-zinc-300">Phone</label>
                  <input
                    type="tel"
                    value={editFormData.phone || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950/60 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-zinc-300">City</label>
                  <input
                    type="text"
                    value={editFormData.city || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, city: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950/60 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Modules selector */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                <label className="font-medium text-zinc-300 block">
                  Enabled Modules
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SCHOOL_MODULES.map((m) => {
                    const isChecked = editFormData.enabledModules?.includes(m);
                    return (
                      <button
                        type="button"
                        key={m}
                        onClick={() => handleEditModuleToggle(m)}
                        className={`p-2 rounded-lg border text-left flex items-center gap-2 cursor-pointer ${
                          isChecked
                            ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                            : "bg-zinc-950/40 border-zinc-800 text-zinc-400"
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-zinc-600" />
                        )}
                        <span className="truncate text-[11px]">{m}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSubmittingEdit ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action Confirmation Modal */}
      {actionType && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              {actionType === "DELETE" ? (
                <Trash2 className="w-5 h-5 text-rose-400" />
              ) : actionType === "SUSPEND" ? (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              ) : (
                <CheckCircle className="w-5 h-5 text-indigo-400" />
              )}
              <span>
                {actionType === "DELETE"
                  ? "Archive & Soft Delete School"
                  : actionType === "ACTIVATE"
                  ? "Activate School"
                  : actionType === "DEACTIVATE"
                  ? "Deactivate School"
                  : "Suspend School"}
              </span>
            </h3>

            <p className="text-xs text-zinc-400 leading-relaxed">
              {actionType === "DELETE"
                ? `Are you sure you want to archive '${school.name}' (${school.code})? It will be safely deactivated and excluded from normal queries.`
                : `Are you sure you want to transition '${school.name}' to ${actionType}?`}
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={() => setActionType(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isProcessingAction}
                onClick={() => {
                  if (actionType === "DELETE") {
                    handleDelete();
                  } else {
                    handleStatusChange(
                      actionType as "ACTIVE" | "INACTIVE" | "SUSPENDED"
                    );
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer shadow-md ${
                  actionType === "DELETE"
                    ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/20"
                    : actionType === "SUSPEND"
                    ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/20"
                    : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20"
                }`}
              >
                {isProcessingAction ? "Processing..." : "Confirm Action"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
