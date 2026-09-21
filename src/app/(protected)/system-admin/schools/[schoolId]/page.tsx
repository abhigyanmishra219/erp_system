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
  GraduationCap,
  Clock,
  X,
  Save,
  CheckSquare,
  Square,
} from "lucide-react";
import {
  SCHOOL_PLANS,
  SUBSCRIPTION_STATUSES,
  SCHOOL_MODULES,
  SchoolPlan,
  SubscriptionStatus,
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

  // Subscription Edit Modal State
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subFormData, setSubFormData] = useState({
    plan: "BASIC" as SchoolPlan,
    studentLimit: 200,
    subscriptionStartDate: "",
    subscriptionExpiryDate: "",
    subscriptionStatus: "TRIAL" as SubscriptionStatus,
    enabledModules: [] as SchoolModule[],
  });
  const [isSubmittingSub, setIsSubmittingSub] = useState(false);

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
      if (json.data) {
        setSubFormData({
          plan: json.data.plan || "BASIC",
          studentLimit: json.data.studentLimit || 200,
          subscriptionStartDate: json.data.subscriptionStartDate
            ? new Date(json.data.subscriptionStartDate).toISOString().split("T")[0]
            : "",
          subscriptionExpiryDate: json.data.subscriptionExpiryDate
            ? new Date(json.data.subscriptionExpiryDate).toISOString().split("T")[0]
            : "",
          subscriptionStatus: json.data.subscriptionStatus || "TRIAL",
          enabledModules: json.data.enabledModules || [],
        });
      }
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

  const handleSubscriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingSub(true);
    try {
      const res = await fetch(`/api/system-admin/schools/${schoolId}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subFormData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update subscription");
      }

      setFeedbackMessage("Subscription and license updated successfully!");
      setIsSubModalOpen(false);
      fetchSchoolDetails();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error updating subscription"
      );
    } finally {
      setIsSubmittingSub(false);
    }
  };

  const handleSubModuleToggle = (mod: SchoolModule) => {
    setSubFormData((prev) => {
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
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "INACTIVE":
        return "bg-surface-3 text-muted-foreground border-border";
      case "SUSPENDED":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default:
        return "bg-surface-3 text-muted-foreground border-border";
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-3">
        <SchoolIcon className="w-8 h-8 text-primary animate-bounce mx-auto" />
        <p className="text-xs text-muted-foreground">Loading school profile from MongoDB...</p>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="py-24 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
        <h2 className="text-lg font-bold text-foreground">School Not Found</h2>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          The requested school does not exist or has been archived.
        </p>
        <Link
          href="/system-admin/schools"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-xs font-medium text-foreground border border-border"
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
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Schools List</span>
        </Link>

        {/* Feedback Toast */}
        {feedbackMessage && (
          <div className="p-3.5 rounded-xl bg-success/10 border border-success/20 text-success text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{feedbackMessage}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-success hover:opacity-80 font-bold cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
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

        <div className="p-6 rounded-2xl bg-card border border-border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-extrabold text-xl shrink-0 shadow-sm">
              {school.name[0]?.toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                  {school.name}
                </h1>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-surface-2 text-primary border border-border font-semibold">
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
              <p className="text-xs text-muted-foreground">
                Tenant Database Instance • Plan:{" "}
                <span className="text-primary font-semibold">
                  {school.plan}
                </span>{" "}
                • Max Students:{" "}
                <span className="text-foreground font-medium">
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
              className="px-3.5 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-xs font-medium text-foreground transition-all flex items-center gap-1.5 border border-border cursor-pointer shadow-sm"
            >
              <Edit className="w-3.5 h-3.5 text-primary" />
              <span>Edit Details</span>
            </button>

            {school.status !== "ACTIVE" && (
              <button
                onClick={() => setActionType("ACTIVATE")}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Activate</span>
              </button>
            )}

            {school.status === "ACTIVE" && (
              <button
                onClick={() => setActionType("DEACTIVATE")}
                className="px-3.5 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-muted-foreground hover:text-foreground text-xs font-medium transition-all flex items-center gap-1.5 border border-border cursor-pointer shadow-sm"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Deactivate</span>
              </button>
            )}

            {school.status !== "SUSPENDED" && (
              <button
                onClick={() => setActionType("SUSPEND")}
                className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Suspend</span>
              </button>
            )}

            <button
              onClick={() => setActionType("DELETE")}
              className="px-3.5 py-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
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
          <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>Subscription & Billing Status</span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase">
                  {school.subscriptionStatus}
                </span>
                <button
                  onClick={() => setIsSubModalOpen(true)}
                  className="px-3 py-1 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border text-foreground text-xs font-medium transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Edit className="w-3 h-3 text-primary" />
                  <span>Manage License</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-surface-2 border border-border space-y-1">
                <span className="text-muted-foreground block">Plan Tier:</span>
                <span className="text-sm font-bold text-foreground">{school.plan}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-2 border border-border space-y-1">
                <span className="text-muted-foreground block">Start Date:</span>
                <span className="text-foreground font-medium">
                  {new Date(school.subscriptionStartDate).toLocaleDateString()}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-2 border border-border space-y-1">
                <span className="text-muted-foreground block">Expiry Date:</span>
                <span className="text-destructive font-medium">
                  {new Date(school.subscriptionExpiryDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Enabled Modules Grid */}
          <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-500" />
                <span>Enabled Platform Modules</span>
              </h3>
              <span className="text-xs text-muted-foreground">
                {school.enabledModules.length} Modules Active
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {school.enabledModules.map((mod) => (
                <div
                  key={mod}
                  className="p-3 rounded-xl bg-surface-2 border border-border flex items-center gap-2 text-xs font-medium text-foreground"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">{mod}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Usage Telemetry (Live / 0 for unbuilt models) */}
          <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
              <GraduationCap className="w-4 h-4 text-emerald-500" />
              <span>Multi-Tenant Telemetry</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-center">
              <div className="p-3.5 rounded-xl bg-surface-2 border border-border space-y-1">
                <span className="text-2xl font-bold text-foreground">
                  {school.usage?.totalStudents ?? 0}
                </span>
                <span className="text-[11px] text-muted-foreground block">Enrolled Students</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Limit: {school.studentLimit}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-2 border border-border space-y-1">
                <span className="text-2xl font-bold text-foreground">
                  {school.usage?.totalTeachers ?? 0}
                </span>
                <span className="text-[11px] text-muted-foreground block">Faculty Teachers</span>
                <span className="text-[10px] text-muted-foreground font-mono">Module Soon</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-2 border border-border space-y-1">
                <span className="text-2xl font-bold text-foreground">
                  {school.usage?.totalParents ?? 0}
                </span>
                <span className="text-[11px] text-muted-foreground block">Parent Accounts</span>
                <span className="text-[10px] text-muted-foreground font-mono">Module Soon</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-2 border border-border space-y-1">
                <span className="text-2xl font-bold text-foreground">
                  {school.usage?.storageUsedFormatted ?? "0 MB"}
                </span>
                <span className="text-[11px] text-muted-foreground block">Cloud Storage</span>
                <span className="text-[10px] text-muted-foreground font-mono">Phase 1 Default</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Location & Metadata Info */}
        <div className="space-y-6">
          {/* Contact Card */}
          <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
              <MapPin className="w-4 h-4 text-primary" />
              <span>Contact & Location</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <span className="text-muted-foreground block">Address:</span>
                  <span className="text-foreground">
                    {school.address || "No street address provided"}
                  </span>
                  <span className="text-muted-foreground block text-[11px] mt-0.5">
                    {school.city ? `${school.city}, ` : ""}
                    {school.state ? `${school.state}, ` : ""}
                    {school.country || "India"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2 border-t border-border">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <span className="text-muted-foreground block">Email:</span>
                  <span className="text-foreground font-mono">
                    {school.email || "N/A"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2 border-t border-border">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <span className="text-muted-foreground block">Phone:</span>
                  <span className="text-foreground">
                    {school.phone || "N/A"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2 border-t border-border">
                <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <span className="text-muted-foreground block">Website:</span>
                  {school.website ? (
                    <a
                      href={school.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline break-all"
                    >
                      {school.website}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Metadata Card */}
          <div className="p-6 rounded-2xl bg-card border border-border space-y-3 text-xs text-muted-foreground shadow-sm">
            <h4 className="font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>Record Timestamps</span>
            </h4>
            <div className="flex justify-between py-1">
              <span>Database ID:</span>
              <span className="font-mono text-muted-foreground text-[11px]">{school.id}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Created At:</span>
              <span className="text-foreground">{new Date(school.createdAt).toLocaleString()}</span>
            </div>
            {school.createdBy && (
              <div className="flex justify-between py-1">
                <span>Created By:</span>
                <span className="text-foreground font-medium">
                  {school.createdBy.name || school.createdBy.email || "System Admin"}
                </span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span>Last Modified:</span>
              <span className="text-foreground">{new Date(school.updatedAt).toLocaleString()}</span>
            </div>
            {school.updatedBy && (
              <div className="flex justify-between py-1">
                <span>Updated By:</span>
                <span className="text-foreground font-medium">
                  {school.updatedBy.name || school.updatedBy.email || "System Admin"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit School Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-popover border border-border rounded-2xl p-6 max-w-2xl w-full my-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Edit className="w-4 h-4 text-primary" />
                <span>Edit School Information: {school.name}</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg hover:bg-surface-2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">School Name</label>
                  <input
                    type="text"
                    value={editFormData.name || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Plan Tier</label>
                  <select
                    value={editFormData.plan || "BASIC"}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        plan: e.target.value as (typeof SCHOOL_PLANS)[number],
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                  >
                    {SCHOOL_PLANS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Max Student Limit</label>
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
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Subscription Status</label>
                  <select
                    value={editFormData.subscriptionStatus || "TRIAL"}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        subscriptionStatus: e.target.value as (typeof SUBSCRIPTION_STATUSES)[number],
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                  >
                    {SUBSCRIPTION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Expiry Date</label>
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
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Email</label>
                  <input
                    type="email"
                    value={editFormData.email || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Phone</label>
                  <input
                    type="tel"
                    value={editFormData.phone || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">City</label>
                  <input
                    type="text"
                    value={editFormData.city || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, city: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Modules selector */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <label className="font-medium text-foreground block">
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
                            ? "bg-primary/15 border-primary/40 text-primary font-medium shadow-inner"
                            : "bg-surface-2 border-border text-muted-foreground"
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-muted-foreground/60" />
                        )}
                        <span className="truncate text-[11px]">{m}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-foreground border border-border cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-lg shadow-primary/20"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSubmittingEdit ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subscription / License Modal */}
      {isSubModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-popover border border-border rounded-2xl p-6 max-w-xl w-full my-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>Manage Subscription: {school.name}</span>
              </h3>
              <button
                onClick={() => setIsSubModalOpen(false)}
                className="p-1 rounded-lg hover:bg-surface-2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubscriptionSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Plan Tier</label>
                  <select
                    value={subFormData.plan}
                    onChange={(e) =>
                      setSubFormData({
                        ...subFormData,
                        plan: e.target.value as SchoolPlan,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                  >
                    {SCHOOL_PLANS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Subscription Status</label>
                  <select
                    value={subFormData.subscriptionStatus}
                    onChange={(e) =>
                      setSubFormData({
                        ...subFormData,
                        subscriptionStatus: e.target.value as SubscriptionStatus,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                  >
                    {SUBSCRIPTION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Start Date</label>
                  <input
                    type="date"
                    value={subFormData.subscriptionStartDate}
                    onChange={(e) =>
                      setSubFormData({
                        ...subFormData,
                        subscriptionStartDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                  >
                  </input>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Expiry Date</label>
                  <input
                    type="date"
                    value={subFormData.subscriptionExpiryDate}
                    onChange={(e) =>
                      setSubFormData({
                        ...subFormData,
                        subscriptionExpiryDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                  >
                  </input>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="font-medium text-foreground">Student Capacity Limit</label>
                  <input
                    type="number"
                    min={1}
                    value={subFormData.studentLimit}
                    onChange={(e) =>
                      setSubFormData({
                        ...subFormData,
                        studentLimit: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Modules selector */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <label className="font-medium text-foreground block">
                  Enabled Feature Modules ({subFormData.enabledModules.length})
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SCHOOL_MODULES.map((m) => {
                    const isChecked = subFormData.enabledModules?.includes(m);
                    return (
                      <button
                        type="button"
                        key={m}
                        onClick={() => handleSubModuleToggle(m)}
                        className={`p-2 rounded-lg border text-left flex items-center gap-2 cursor-pointer ${
                          isChecked
                            ? "bg-primary/15 border-primary/40 text-primary font-medium shadow-inner"
                            : "bg-surface-2 border-border text-muted-foreground"
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-muted-foreground/60" />
                        )}
                        <span className="truncate text-[11px]">{m}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsSubModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-foreground border border-border cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSub}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-lg shadow-primary/20"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSubmittingSub ? "Updating..." : "Update Subscription"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action Confirmation Modal */}
      {actionType && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-popover border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              {actionType === "DELETE" ? (
                <Trash2 className="w-5 h-5 text-destructive" />
              ) : actionType === "SUSPEND" ? (
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              ) : (
                <CheckCircle className="w-5 h-5 text-primary" />
              )}
              <span>
                {actionType === "DELETE"
                  ? "Archive & Soft Delete School"
                  : actionType === "ACTIVATE"
                  ? "Activate School"
                  : actionType === "DEACTIVATE"
                  ? "Deactivate School"
                  : "Suspend School Access"}
              </span>
            </h3>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {actionType === "DELETE"
                ? `Are you sure you want to archive '${school.name}' (${school.code})? The school will be deactivated and hidden from standard tenant queries, preserving database integrity.`
                : `Are you sure you want to change status of '${school.name}' (${school.code}) to ${actionType}?`}
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={() => setActionType(null)}
                className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-xs font-medium text-foreground transition-all cursor-pointer border border-border"
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
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-md cursor-pointer ${
                  actionType === "DELETE"
                    ? "bg-destructive hover:opacity-90 shadow-destructive/20"
                    : actionType === "SUSPEND"
                    ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/20"
                    : "bg-primary hover:bg-primary-hover shadow-primary/20"
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
