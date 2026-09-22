"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ArrowLeft,
  Users,
  Building2,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  Key,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  Edit2,
  Trash2,
  Star,
  UserCheck,
  UserX,
  RotateCw,
  X,
  Eye,
  Plus,
} from "lucide-react";

interface ParentProfile {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  relationship: string;
  occupation?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  status: "ACTIVE" | "INACTIVE";
  hasLoginAccount: boolean;
  user?: { _id: string; email: string; isActive: boolean; createdAt: string };
  createdAt: string;
}

interface LinkedChild {
  linkId: string;
  relationship: string;
  isPrimaryGuardian: boolean;
  isEmergencyContact: boolean;
  canPickup: boolean;
  notes?: string;
  student: {
    _id: string;
    admissionNumber: string;
    rollNumber?: string;
    firstName: string;
    lastName: string;
    fullName?: string;
    gender: string;
    status: string;
    classId?: { _id: string; name: string; code?: string };
    sectionId?: { _id: string; name: string };
    academicYearId?: { _id: string; name: string };
  };
}

export default function ParentDetailPage({
  params,
}: {
  params: Promise<{ parentId: string }>;
}) {
  const { parentId } = use(params);
  const router = useRouter();

  const [parent, setParent] = useState<ParentProfile | null>(null);
  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isLinkStudentModalOpen, setIsLinkStudentModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available Students for Linking
  const [availableStudents, setAvailableStudents] = useState<
    { id: string; fullName: string; admissionNumber: string; className?: string }[]
  >([]);
  const [selectedStudentIdToLink, setSelectedStudentIdToLink] = useState("");
  const [linkRelationship, setLinkRelationship] = useState<"FATHER" | "MOTHER" | "GUARDIAN" | "OTHER">("FATHER");
  const [linkIsPrimary, setLinkIsPrimary] = useState(false);

  // Credentials
  const [generatedCreds, setGeneratedCreds] = useState<{
    email: string;
    temporaryPassword: string;
    role: string;
    name: string;
    isReset: boolean;
  } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    relationship: "FATHER" as "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER",
    occupation: "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
  });

  const fetchParentData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/parents/${parentId}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load parent profile");
      }
      setParent(json.data.parent);
      setChildren(json.data.children || []);

      const p = json.data.parent;
      setEditFormData({
        firstName: p.firstName || "",
        lastName: p.lastName || "",
        email: p.email || "",
        phone: p.phone || "",
        relationship: (p.relationship as "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER") || "FATHER",
        occupation: p.occupation || "",
        street: p.address?.street || "",
        city: p.address?.city || "",
        state: p.address?.state || "",
        postalCode: p.address?.postalCode || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading parent");
    } finally {
      setIsLoading(false);
    }
  }, [parentId]);

  useEffect(() => {
    fetchParentData();
  }, [fetchParentData]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/parents/${parentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editFormData.firstName,
          lastName: editFormData.lastName,
          email: editFormData.email.toLowerCase().trim(),
          phone: editFormData.phone.trim(),
          relationship: editFormData.relationship,
          occupation: editFormData.occupation.trim(),
          address: {
            street: editFormData.street,
            city: editFormData.city,
            state: editFormData.state,
            postalCode: editFormData.postalCode,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update parent details");
      }
      setIsEditModalOpen(false);
      fetchParentData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!parent) return;
    const newStatus = parent.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch(`/api/admin/parents/${parentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update parent status");
      }
      fetchParentData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to toggle status");
    }
  };

  const handleAccountProvisionOrReset = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/parents/${parentId}/account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: parent?.email,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to provision/reset parent account");
      }
      setGeneratedCreds(json.data.credentials);
      setIsAccountModalOpen(false);
      fetchParentData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Account operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlinkChild = async (studentId: string) => {
    if (!confirm("Are you sure you want to unlink this student from this parent?")) return;
    try {
      const res = await fetch(`/api/admin/students/${studentId}/parents/${parentId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to unlink child");
      }
      fetchParentData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unlink failed");
    }
  };

  const fetchAvailableStudents = async () => {
    try {
      const res = await fetch("/api/admin/students?limit=100");
      const json = await res.json();
      if (json.success && json.data?.students) {
        const linkedIds = new Set(children.map((c) => c.student?._id));
        const available = json.data.students
          .filter((s: { id: string }) => !linkedIds.has(s.id))
          .map((s: { id: string; fullName: string; admissionNumber: string; class?: { name: string } }) => ({
            id: s.id,
            fullName: s.fullName,
            admissionNumber: s.admissionNumber,
            className: s.class?.name,
          }));
        setAvailableStudents(available);
        if (available.length > 0) {
          setSelectedStudentIdToLink(available[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load students", err);
    }
  };

  const handleLinkStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentIdToLink) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/parents/${parentId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentIdToLink,
          relationship: linkRelationship,
          isPrimaryGuardian: linkIsPrimary,
          isEmergencyContact: true,
          canPickup: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to link student");
      }
      setIsLinkStudentModalOpen(false);
      fetchParentData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to link student");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <RotateCw className="w-8 h-8 animate-spin mb-3 text-indigo-500" />
        <p className="text-sm">Loading parent profile...</p>
      </div>
    );
  }

  if (error || !parent) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-card border border-border rounded-xl text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-foreground">Parent Not Found</h2>
        <p className="text-xs text-muted-foreground">{error || "The requested parent profile could not be located."}</p>
        <Link
          href="/admin/parents"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/parents"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Parents Directory
        </Link>
      </div>

      {/* Header Profile Hero */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 font-bold text-xl flex items-center justify-center shadow-inner flex-shrink-0">
              {parent.firstName[0]}
              {parent.lastName[0]}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">{parent.fullName}</h1>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    parent.status === "ACTIVE"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {parent.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> {parent.email}
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5" /> {parent.phone}
                </span>
                {parent.occupation && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5" /> {parent.occupation}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 text-indigo-500" />
              Edit Profile
            </button>

            <button
              onClick={handleToggleStatus}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              {parent.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </button>

            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Key className="w-3.5 h-3.5" />
              {parent.hasLoginAccount ? "Reset Password" : "Create Portal Account"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Details and Linked Children */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Portal User */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2.5">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              Parent Details
            </h2>

            <div className="text-xs space-y-2.5">
              <div>
                <span className="text-muted-foreground block">Relationship</span>
                <span className="font-semibold text-foreground">{parent.relationship}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Occupation</span>
                <span className="font-semibold text-foreground">{parent.occupation || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Member Since</span>
                <span className="font-semibold text-foreground">
                  {parent.createdAt ? new Date(parent.createdAt).toLocaleDateString() : "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2.5">
              <MapPin className="w-4 h-4 text-indigo-500" />
              Residential Address
            </h2>

            <div className="text-xs text-foreground space-y-1">
              {parent.address?.street ? (
                <>
                  <p>{parent.address.street}</p>
                  <p>
                    {[parent.address.city, parent.address.state, parent.address.postalCode]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  <p>{parent.address.country || "India"}</p>
                </>
              ) : (
                <p className="text-muted-foreground">No address recorded.</p>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2.5">
              <Key className="w-4 h-4 text-indigo-500" />
              Parent Portal Account
            </h2>

            {parent.hasLoginAccount ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <UserCheck className="w-4 h-4" /> Account Active (PARENT Role)
                </div>
                <div className="bg-muted/40 p-3 rounded-lg space-y-1">
                  <div>
                    <span className="text-muted-foreground">Login Email: </span>
                    <span className="font-mono font-medium text-foreground">{parent.user?.email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created: </span>
                    <span>{parent.user?.createdAt ? new Date(parent.user.createdAt).toLocaleDateString() : "—"}</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsAccountModalOpen(true)}
                  className="w-full py-2 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-lg transition-colors"
                >
                  Reset Parent Password
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <UserX className="w-4 h-4" /> No Portal Login Created
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Creating an account allows the parent to log in to view attendance, homework, exams, and pay fees online.
                </p>
                <button
                  onClick={() => setIsAccountModalOpen(true)}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
                >
                  Create Parent Login Account
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Linked Children */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              Linked Children & Students ({children.length})
            </h2>

            <button
              onClick={() => {
                fetchAvailableStudents();
                setIsLinkStudentModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Link Student
            </button>
          </div>

          {children.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground space-y-3 shadow-sm">
              <Users className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <p className="font-semibold text-foreground text-sm">No students currently linked</p>
              <p className="text-xs max-w-sm mx-auto">
                Students can be linked to this parent from any student profile page.
              </p>
              <Link
                href="/admin/students"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow-sm"
              >
                Go to Student Directory →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {children.map((lc) => (
                <div key={lc.linkId} className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/students/${lc.student._id}`}
                          className="font-bold text-foreground hover:text-indigo-600 text-base"
                        >
                          {lc.student.firstName} {lc.student.lastName}
                        </Link>
                        {lc.isPrimaryGuardian && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded text-xs font-bold">
                            <Star className="w-3 h-3 fill-amber-500" /> Primary Guardian
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Adm No: <strong className="font-mono text-foreground">{lc.student.admissionNumber}</strong>
                        {lc.student.rollNumber && ` • Roll: ${lc.student.rollNumber}`}
                      </p>
                    </div>

                    <button
                      onClick={() => handleUnlinkChild(lc.student._id)}
                      className="p-1.5 text-muted-foreground hover:text-rose-600 rounded transition-colors"
                      title="Unlink Student"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="bg-muted/40 p-3 rounded-lg text-xs space-y-1">
                    <div>
                      <span className="text-muted-foreground">Class Placement: </span>
                      <span className="font-semibold text-foreground">
                        {lc.student.classId?.name || "Class"} {lc.student.sectionId ? `- Section ${lc.student.sectionId.name}` : ""}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Academic Year: </span>
                      <span className="text-foreground">{lc.student.academicYearId?.name || "—"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-2 border-t border-border">
                    <Link
                      href={`/admin/students/${lc.student._id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Student Profile
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Link Student */}
      {isLinkStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Link Student to Parent</h3>
              <button
                onClick={() => setIsLinkStudentModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {availableStudents.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground space-y-2">
                <p>No unlinked students available in your school.</p>
                <Link
                  href="/admin/students/create"
                  className="text-indigo-600 dark:text-indigo-400 font-semibold underline"
                >
                  Enroll a new student first →
                </Link>
              </div>
            ) : (
              <form onSubmit={handleLinkStudentSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Select Student</label>
                  <select
                    value={selectedStudentIdToLink}
                    onChange={(e) => setSelectedStudentIdToLink(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                  >
                    {availableStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.admissionNumber}) {s.className ? `- ${s.className}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Relationship to Student</label>
                  <select
                    value={linkRelationship}
                    onChange={(e) =>
                      setLinkRelationship(e.target.value as "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER")
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                  >
                    <option value="FATHER">Father</option>
                    <option value="MOTHER">Mother</option>
                    <option value="GUARDIAN">Legal Guardian</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="linkIsPrimary"
                    checked={linkIsPrimary}
                    onChange={(e) => setLinkIsPrimary(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-border"
                  />
                  <label htmlFor="linkIsPrimary" className="font-medium text-foreground cursor-pointer">
                    Set as Primary Guardian
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsLinkStudentModalOpen(false)}
                    className="px-4 py-2 border border-border rounded-lg font-semibold text-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-sm"
                  >
                    {isSubmitting ? "Linking..." : "Link Student"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Edit Parent Profile */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Edit Parent Profile</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.firstName}
                    onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.lastName}
                    onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Relationship</label>
                  <select
                    value={editFormData.relationship}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        relationship: e.target.value as "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER",
                      })
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                  >
                    <option value="FATHER">Father</option>
                    <option value="MOTHER">Mother</option>
                    <option value="GUARDIAN">Legal Guardian</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Occupation</label>
                  <input
                    type="text"
                    value={editFormData.occupation}
                    onChange={(e) => setEditFormData({ ...editFormData, occupation: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <h4 className="font-bold text-foreground mb-2">Address</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Street"
                      value={editFormData.street}
                      onChange={(e) => setEditFormData({ ...editFormData, street: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="City"
                      value={editFormData.city}
                      onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="State"
                      value={editFormData.state}
                      onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Postal Code"
                      value={editFormData.postalCode}
                      onChange={(e) => setEditFormData({ ...editFormData, postalCode: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg font-semibold text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Account Reset / Create */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">
                {parent.hasLoginAccount ? "Reset Parent Password" : "Create Parent Portal Account"}
              </h3>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-muted-foreground space-y-2">
              <p>Generate a cryptographically secure temporary password for:</p>
              <div className="p-2.5 bg-muted rounded font-semibold text-foreground">
                {parent.fullName} ({parent.email})
              </div>
              <p className="text-amber-600 dark:text-amber-400">
                The parent will be required to change their password on first login.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                className="px-4 py-2 border border-border rounded-lg font-semibold text-xs text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleAccountProvisionOrReset}
                disabled={isSubmitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs shadow-sm"
              >
                {isSubmitting ? "Generating..." : "Generate Temporary Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Display Temporary Credentials */}
      {generatedCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-7 h-7 flex-shrink-0" />
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Credentials Generated Successfully!
                </h3>
                <p className="text-xs text-muted-foreground">
                  Copy and share these login credentials with the parent.
                </p>
              </div>
            </div>

            <div className="bg-muted/40 border border-border rounded-lg p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {generatedCreds.name} ({generatedCreds.role})
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `Email: ${generatedCreds.email}\nPassword: ${generatedCreds.temporaryPassword}`
                    );
                    setCopiedCreds(true);
                    setTimeout(() => setCopiedCreds(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {copiedCreds ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCreds ? "Copied" : "Copy"}
                </button>
              </div>

              <div>
                <span className="text-muted-foreground">Login Email: </span>
                <span className="font-mono font-medium text-foreground">{generatedCreds.email}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Temporary Password: </span>
                <span className="font-mono font-bold text-foreground bg-background px-2 py-0.5 rounded border border-border">
                  {generatedCreds.temporaryPassword}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setGeneratedCreds(null)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
              >
                I have copied these credentials
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
