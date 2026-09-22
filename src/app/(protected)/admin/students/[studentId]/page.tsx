"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  ArrowLeft,
  GraduationCap,
  Building2,
  ShieldCheck,
  Key,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  Save,
  UserCheck,
  UserX,
  Clock,
  Calendar,
  Phone,
  Mail,
  MapPin,
  HeartPulse,
  Share2,
  ArrowRightLeft,
  Plus,
  Trash2,
  Edit2,
  Star,
  FileText,
  CreditCard,
  BookOpen,
  Award,
  RotateCw,
  X,
} from "lucide-react";

interface StudentProfile {
  id: string;
  admissionNumber: string;
  studentId?: string;
  rollNumber?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone?: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  bloodGroup?: string;
  avatarUrl?: string;
  academicYear?: { _id: string; name: string; status: string };
  class?: { _id: string; name: string; code?: string };
  section?: { _id: string; name: string; capacity?: number };
  admissionDate: string;
  status: "ACTIVE" | "INACTIVE" | "TRANSFERRED" | "GRADUATED";
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  medicalInfo?: {
    allergies?: string[];
    conditions?: string[];
    medications?: string[];
    notes?: string;
  };
  academicHistory?: {
    academicYearId: string;
    classId: string;
    sectionId: string;
    rollNumber?: string;
    yearName?: string;
    className?: string;
    sectionName?: string;
    status: string;
    startDate?: string;
    endDate?: string;
  }[];
  transferDetails?: {
    reason?: string;
    targetSchool?: string;
    transferCertificateNumber?: string;
    transferDate?: string;
    notes?: string;
  };
  hasLoginAccount: boolean;
  user?: { _id: string; email: string; isActive: boolean; createdAt: string };
  createdAt: string;
  updatedAt: string;
}

interface LinkedParent {
  linkId: string;
  relationship: "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER";
  isPrimaryGuardian: boolean;
  isEmergencyContact: boolean;
  canPickup: boolean;
  notes?: string;
  parent: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    relationship: string;
    occupation?: string;
    status: string;
    user?: { email: string; isActive: boolean };
  };
}

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);
  const router = useRouter();

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [parents, setParents] = useState<LinkedParent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "parents" | "history" | "transfer" | "attendance" | "assignments" | "exams" | "fees"
  >("overview");

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLinkParentModalOpen, setIsLinkParentModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  // Temporary credentials popup
  const [generatedCreds, setGeneratedCreds] = useState<{
    email: string;
    temporaryPassword: string;
    role: string;
    name: string;
    isReset: boolean;
  } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Available Parents for Linking
  const [allParents, setAllParents] = useState<{ id: string; fullName: string; email: string; phone: string }[]>([]);
  const [selectedParentIdToLink, setSelectedParentIdToLink] = useState("");
  const [linkRelationship, setLinkRelationship] = useState<"FATHER" | "MOTHER" | "GUARDIAN" | "OTHER">("GUARDIAN");
  const [linkIsPrimary, setLinkIsPrimary] = useState(false);

  // Edit Form State
  const [editFormData, setEditFormData] = useState({
    firstName: "",
    lastName: "",
    admissionNumber: "",
    studentId: "",
    rollNumber: "",
    dateOfBirth: "",
    gender: "MALE" as "MALE" | "FEMALE" | "OTHER",
    bloodGroup: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
    emergencyName: "",
    emergencyRelation: "",
    emergencyPhone: "",
    medicalNotes: "",
  });

  // Status/Transfer Form State
  const [statusFormData, setStatusFormData] = useState({
    status: "ACTIVE" as "ACTIVE" | "INACTIVE" | "TRANSFERRED" | "GRADUATED",
    reason: "",
    targetSchool: "",
    transferCertificateNumber: "",
    notes: "",
  });

  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  // Email Validation State
  const [emailValidation, setEmailValidation] = useState<{
    checking: boolean;
    error: string | null;
  }>({ checking: false, error: null });

  const checkStudentEmail = async (email: string) => {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailValidation({ checking: false, error: null });
      return;
    }
    setEmailValidation((prev) => ({ ...prev, checking: true }));
    try {
      const res = await fetch(
        `/api/admin/students/check-email?email=${encodeURIComponent(trimmed)}&excludeStudentId=${encodeURIComponent(
          studentId
        )}`
      );
      const json = await res.json();
      if (json.success && !json.available) {
        setEmailValidation({
          checking: false,
          error: json.reason || "Email address is already used by another student in this school.",
        });
      } else {
        setEmailValidation({ checking: false, error: null });
      }
    } catch {
      setEmailValidation({ checking: false, error: null });
    }
  };

  const fetchStudentData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/students/${studentId}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load student profile");
      }
      setStudent(json.data.student);
      setParents(json.data.parents || []);

      // Pre-fill edit forms
      const st = json.data.student;
      setEditFormData({
        firstName: st.firstName || "",
        lastName: st.lastName || "",
        admissionNumber: st.admissionNumber || "",
        studentId: st.studentId || "",
        rollNumber: st.rollNumber || "",
        dateOfBirth: st.dateOfBirth ? new Date(st.dateOfBirth).toISOString().split("T")[0] : "",
        gender: st.gender || "MALE",
        bloodGroup: st.bloodGroup || "",
        email: st.email || "",
        phone: st.phone || "",
        street: st.address?.street || "",
        city: st.address?.city || "",
        state: st.address?.state || "",
        postalCode: st.address?.postalCode || "",
        emergencyName: st.emergencyContact?.name || "",
        emergencyRelation: st.emergencyContact?.relationship || "",
        emergencyPhone: st.emergencyContact?.phone || "",
        medicalNotes: st.medicalInfo?.notes || "",
      });

      setStatusFormData({
        status: st.status || "ACTIVE",
        reason: st.transferDetails?.reason || "",
        targetSchool: st.transferDetails?.targetSchool || "",
        transferCertificateNumber: st.transferDetails?.transferCertificateNumber || "",
        notes: st.transferDetails?.notes || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading student");
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  // Load parents list when link modal opens
  const openLinkParentModal = async () => {
    setIsLinkParentModalOpen(true);
    try {
      const res = await fetch("/api/admin/parents?limit=100");
      const json = await res.json();
      if (json.success && json.data?.parents) {
        // Exclude already linked parents
        const linkedIds = new Set(parents.map((p) => p.parent?._id));
        const available = json.data.parents
          .filter((p: { id: string }) => !linkedIds.has(p.id))
          .map((p: { id: string; fullName: string; email: string; phone: string }) => ({
            id: p.id,
            fullName: p.fullName,
            email: p.email,
            phone: p.phone,
          }));
        setAllParents(available);
        if (available.length > 0) {
          setSelectedParentIdToLink(available[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load parent options", err);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActionSubmitting(true);
    try {
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editFormData.firstName,
          lastName: editFormData.lastName,
          admissionNumber: editFormData.admissionNumber,
          studentId: editFormData.studentId || undefined,
          rollNumber: editFormData.rollNumber || undefined,
          dateOfBirth: editFormData.dateOfBirth,
          gender: editFormData.gender,
          bloodGroup: editFormData.bloodGroup || undefined,
          email: editFormData.email || undefined,
          phone: editFormData.phone || undefined,
          address: {
            street: editFormData.street,
            city: editFormData.city,
            state: editFormData.state,
            postalCode: editFormData.postalCode,
          },
          emergencyContact: {
            name: editFormData.emergencyName,
            relationship: editFormData.emergencyRelation,
            phone: editFormData.emergencyPhone,
          },
          medicalInfo: {
            notes: editFormData.medicalNotes,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update student profile");
      }
      setIsEditModalOpen(false);
      fetchStudentData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActionSubmitting(true);
    try {
      const res = await fetch(`/api/admin/students/${studentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusFormData.status,
          transferDetails:
            statusFormData.status === "TRANSFERRED"
              ? {
                  reason: statusFormData.reason,
                  targetSchool: statusFormData.targetSchool,
                  transferCertificateNumber: statusFormData.transferCertificateNumber,
                  notes: statusFormData.notes,
                }
              : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update status");
      }
      setIsStatusModalOpen(false);
      fetchStudentData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Status change failed");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleLinkParentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParentIdToLink) return;
    setIsActionSubmitting(true);
    try {
      const res = await fetch(`/api/admin/students/${studentId}/parents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId: selectedParentIdToLink,
          relationship: linkRelationship,
          isPrimaryGuardian: linkIsPrimary,
          isEmergencyContact: true,
          canPickup: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to link parent");
      }
      setIsLinkParentModalOpen(false);
      fetchStudentData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to link parent");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleUnlinkParent = async (parentId: string) => {
    if (!confirm("Are you sure you want to unlink this parent from the student?")) return;
    try {
      const res = await fetch(`/api/admin/students/${studentId}/parents/${parentId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to unlink parent");
      }
      fetchStudentData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unlink failed");
    }
  };

  const handleTogglePrimaryGuardian = async (parentId: string, currentPrimary: boolean) => {
    try {
      const res = await fetch(`/api/admin/students/${studentId}/parents/${parentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPrimaryGuardian: !currentPrimary,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update primary guardian");
      }
      fetchStudentData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to set primary guardian");
    }
  };

  const handleAccountProvisionOrReset = async () => {
    setIsActionSubmitting(true);
    try {
      const res = await fetch(`/api/admin/students/${studentId}/account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: student?.email || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to provision/reset account");
      }
      setGeneratedCreds(json.data.credentials);
      setIsAccountModalOpen(false);
      fetchStudentData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Account operation failed");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <RotateCw className="w-8 h-8 animate-spin mb-3 text-indigo-500" />
        <p className="text-sm">Loading student profile...</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-card border border-border rounded-xl text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-foreground">Student Not Found</h2>
        <p className="text-xs text-muted-foreground">{error || "The requested student could not be located."}</p>
        <Link
          href="/admin/students"
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
          href="/admin/students"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Student Directory
        </Link>
      </div>

      {/* Header Profile Hero */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-bold text-xl flex items-center justify-center shadow-inner flex-shrink-0">
              {student.firstName[0]}
              {student.lastName[0]}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">{student.fullName}</h1>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    student.status === "ACTIVE"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : student.status === "INACTIVE"
                      ? "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                      : student.status === "TRANSFERRED"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                  }`}
                >
                  {student.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="font-mono bg-muted px-2 py-0.5 rounded text-foreground font-semibold">
                  Adm: {student.admissionNumber}
                </span>
                {student.rollNumber && (
                  <span>Roll No: <strong className="text-foreground">{student.rollNumber}</strong></span>
                )}
                <span>
                  Class: <strong className="text-foreground">{student.class?.name || "Unassigned"}</strong>
                  {student.section && ` - Sec ${student.section.name}`}
                </span>
                <span>
                  Year: <strong className="text-foreground">{student.academicYear?.name || "N/A"}</strong>
                </span>
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
              onClick={() => setIsStatusModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-500" />
              Status / Transfer
            </button>

            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Key className="w-3.5 h-3.5" />
              {student.hasLoginAccount ? "Reset Password" : "Create Login Account"}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto border-t border-border mt-6 pt-2 text-xs">
          {[
            { id: "overview", label: "Overview", icon: Users },
            { id: "parents", label: `Parents & Guardians (${parents.length})`, icon: ShieldCheck },
            { id: "history", label: "Academic History", icon: Clock },
            { id: "transfer", label: "Transfer Details", icon: ArrowRightLeft },
            { id: "attendance", label: "Attendance", icon: Calendar, tag: "Phase A4" },
            { id: "assignments", label: "Assignments", icon: FileText, tag: "Phase A5" },
            { id: "exams", label: "Exams & Results", icon: Award, tag: "Phase A6" },
            { id: "fees", label: "Fee Records", icon: CreditCard, tag: "Phase A7" },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.tag && (
                  <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded font-normal text-muted-foreground">
                    {tab.tag}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 & 2: Personal & Academic Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2.5">
                <Users className="w-4 h-4 text-indigo-500" />
                Personal Details
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground block">Date of Birth</span>
                  <span className="font-semibold text-foreground">
                    {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Gender</span>
                  <span className="font-semibold text-foreground capitalize">{student.gender.toLowerCase()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Blood Group</span>
                  <span className="font-semibold text-foreground">{student.bloodGroup || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Email</span>
                  <span className="font-semibold text-foreground">{student.email || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Phone</span>
                  <span className="font-semibold text-foreground">{student.phone || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Admission Date</span>
                  <span className="font-semibold text-foreground">
                    {student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : "—"}
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
                {student.address?.street ? (
                  <>
                    <p>{student.address.street}</p>
                    <p>
                      {[student.address.city, student.address.state, student.address.postalCode]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    <p>{student.address.country || "India"}</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">No address recorded.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Emergency Contact */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
                  <Phone className="w-4 h-4 text-rose-500" />
                  Emergency Contact
                </h2>
                <div className="text-xs space-y-1.5">
                  <div>
                    <span className="text-muted-foreground">Name: </span>
                    <span className="font-semibold text-foreground">
                      {student.emergencyContact?.name || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Relationship: </span>
                    <span className="font-semibold text-foreground">
                      {student.emergencyContact?.relationship || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone: </span>
                    <span className="font-semibold text-foreground">
                      {student.emergencyContact?.phone || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
                  <HeartPulse className="w-4 h-4 text-emerald-500" />
                  Medical & Health Info
                </h2>
                <div className="text-xs space-y-1.5">
                  <div>
                    <span className="text-muted-foreground">Allergies: </span>
                    <span className="font-semibold text-foreground">
                      {student.medicalInfo?.allergies && student.medicalInfo.allergies.length > 0
                        ? student.medicalInfo.allergies.join(", ")
                        : "None reported"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Notes: </span>
                    <span className="font-semibold text-foreground">
                      {student.medicalInfo?.notes || "No special medical notes"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Portal User Account & Primary Guardian Card */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2.5">
                <Key className="w-4 h-4 text-indigo-500" />
                Student Portal Account
              </h2>

              {student.hasLoginAccount ? (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <UserCheck className="w-4 h-4" /> Account Active (STUDENT Role)
                  </div>
                  <div className="bg-muted/40 p-3 rounded-lg space-y-1">
                    <div>
                      <span className="text-muted-foreground">Login Email: </span>
                      <span className="font-mono font-medium text-foreground">{student.user?.email}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Created: </span>
                      <span>{student.user?.createdAt ? new Date(student.user.createdAt).toLocaleDateString() : "—"}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAccountModalOpen(true)}
                    className="w-full py-2 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-lg transition-colors"
                  >
                    Reset Student Password
                  </button>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <UserX className="w-4 h-4" /> No Portal Login Created Yet
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Student cannot log in to view assignments, reports, or class notices until an account is created.
                  </p>
                  <button
                    onClick={() => setIsAccountModalOpen(true)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
                  >
                    Generate Student Login Account
                  </button>
                </div>
              )}
            </div>

            {/* Quick Primary Guardian summary */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-500" />
                  Primary Guardian
                </h2>
                <button
                  onClick={openLinkParentModal}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                >
                  + Add Parent
                </button>
              </div>

              {parents.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted-foreground space-y-2">
                  <p>No parents linked yet.</p>
                  <button
                    onClick={openLinkParentModal}
                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Link Parent or Guardian
                  </button>
                </div>
              ) : (
                parents.slice(0, 2).map((lp) => (
                  <div key={lp.linkId} className="p-3 bg-muted/40 border border-border rounded-lg text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/admin/parents/${lp.parent._id}`}
                        className="font-bold text-foreground hover:text-indigo-600"
                      >
                        {lp.parent.firstName} {lp.parent.lastName}
                      </Link>
                      {lp.isPrimaryGuardian && (
                        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded text-[10px] font-bold">
                          PRIMARY
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground">
                      <span>Rel: </span>
                      <strong className="text-foreground">{lp.relationship}</strong>
                    </div>
                    <div className="text-muted-foreground">
                      <span>Phone: </span>
                      <span className="font-mono text-foreground">{lp.parent.phone}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Parents & Guardians */}
      {activeTab === "parents" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Linked Parents & Guardians</h2>
            <button
              onClick={openLinkParentModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Link Parent / Guardian
            </button>
          </div>

          {parents.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground space-y-3">
              <ShieldCheck className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <p className="font-semibold text-foreground text-sm">No parents or guardians linked yet</p>
              <p className="text-xs max-w-sm mx-auto">
                Link existing parent profiles or register a new guardian to enable parent portal communication.
              </p>
              <button
                onClick={openLinkParentModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Link First Parent
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {parents.map((lp) => (
                <div key={lp.linkId} className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/parents/${lp.parent._id}`}
                          className="font-bold text-foreground hover:text-indigo-600 text-base"
                        >
                          {lp.parent.firstName} {lp.parent.lastName}
                        </Link>
                        {lp.isPrimaryGuardian && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded text-xs font-bold">
                            <Star className="w-3 h-3 fill-amber-500" /> Primary Guardian
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Relationship: <strong className="text-foreground">{lp.relationship}</strong>
                        {lp.parent.occupation && ` • ${lp.parent.occupation}`}
                      </p>
                    </div>

                    <button
                      onClick={() => handleUnlinkParent(lp.parent._id)}
                      className="p-1.5 text-muted-foreground hover:text-rose-600 rounded transition-colors"
                      title="Unlink Parent"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="bg-muted/40 p-3 rounded-lg text-xs space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-foreground">{lp.parent.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-mono text-foreground">{lp.parent.phone}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                    <button
                      onClick={() => handleTogglePrimaryGuardian(lp.parent._id, lp.isPrimaryGuardian)}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                    >
                      {lp.isPrimaryGuardian ? "Remove Primary Status" : "Set as Primary Guardian"}
                    </button>

                    <Link
                      href={`/admin/parents/${lp.parent._id}`}
                      className="text-muted-foreground hover:text-foreground font-medium"
                    >
                      View Full Parent Profile →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Academic History */}
      {activeTab === "history" && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            Academic Enrollment & Promotion Timeline
          </h2>

          {(!student.academicHistory || student.academicHistory.length === 0) ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              No previous academic placement history recorded.
            </p>
          ) : (
            <div className="relative pl-6 border-l-2 border-indigo-500/30 space-y-6 my-4">
              {student.academicHistory.map((rec, idx) => (
                <div key={idx} className="relative group">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-indigo-600 border-4 border-card"></div>
                  <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground text-sm">
                        {rec.className || "Class Placement"} {rec.sectionName && `- Section ${rec.sectionName}`}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-muted rounded font-semibold text-foreground">
                        {rec.yearName || "Academic Year"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-4 pt-1">
                      {rec.rollNumber && <span>Roll No: <strong>{rec.rollNumber}</strong></span>}
                      <span>Status: <strong className="text-foreground">{rec.status}</strong></span>
                      {rec.startDate && (
                        <span>
                          Enrolled: {new Date(rec.startDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Transfer Details */}
      {activeTab === "transfer" && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-amber-500" />
              Transfer & Exit Information
            </h2>
            <button
              onClick={() => setIsStatusModalOpen(true)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold"
            >
              Update Transfer Record
            </button>
          </div>

          {student.status === "TRANSFERRED" && student.transferDetails ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-muted/40 p-4 rounded-lg space-y-2">
                <span className="text-muted-foreground block">Target / Destination School</span>
                <span className="font-bold text-foreground text-sm">
                  {student.transferDetails.targetSchool || "Not specified"}
                </span>
              </div>
              <div className="bg-muted/40 p-4 rounded-lg space-y-2">
                <span className="text-muted-foreground block">Transfer Certificate (TC) Number</span>
                <span className="font-mono font-bold text-foreground text-sm">
                  {student.transferDetails.transferCertificateNumber || "—"}
                </span>
              </div>
              <div className="bg-muted/40 p-4 rounded-lg space-y-2 sm:col-span-2">
                <span className="text-muted-foreground block">Reason for Transfer</span>
                <p className="text-foreground font-medium">
                  {student.transferDetails.reason || "No reason recorded"}
                </p>
              </div>
              {student.transferDetails.notes && (
                <div className="bg-muted/40 p-4 rounded-lg space-y-2 sm:col-span-2">
                  <span className="text-muted-foreground block">Administrative Notes</span>
                  <p className="text-foreground">{student.transferDetails.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-xs space-y-2">
              <p>Student is currently in active enrollment.</p>
              <p>If the student is transferring to another school or graduating, use the button above to log transfer details.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Attendance Placeholder (Phase A4) */}
      {activeTab === "attendance" && (
        <div className="bg-card border border-border rounded-xl p-10 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
            <Calendar className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              Coming in Phase A4
            </span>
            <h3 className="text-lg font-bold text-foreground">Attendance & Absence Management</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Daily period-wise and full-day student attendance tracking, leave requests, parent notifications, and biometric integration will be activated in Phase A4.
            </p>
          </div>
        </div>
      )}

      {/* Tab 6: Assignments Placeholder (Phase A5) */}
      {activeTab === "assignments" && (
        <div className="bg-card border border-border rounded-xl p-10 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
            <FileText className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              Coming in Phase A5
            </span>
            <h3 className="text-lg font-bold text-foreground">Assignments & Homework Submissions</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Digital homework assignments, teacher grading, student submissions, and study materials will be available in Phase A5.
            </p>
          </div>
        </div>
      )}

      {/* Tab 7: Exams Placeholder (Phase A6) */}
      {activeTab === "exams" && (
        <div className="bg-card border border-border rounded-xl p-10 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
            <Award className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              Coming in Phase A6
            </span>
            <h3 className="text-lg font-bold text-foreground">Examinations, Marks & Report Cards</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Exam scheduling, grading scales, GPA calculation, report card generation, and student performance analytics will be delivered in Phase A6.
            </p>
          </div>
        </div>
      )}

      {/* Tab 8: Fees Placeholder (Phase A7) */}
      {activeTab === "fees" && (
        <div className="bg-card border border-border rounded-xl p-10 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
            <CreditCard className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              Coming in Phase A7
            </span>
            <h3 className="text-lg font-bold text-foreground">Fee Collection & Financial Records</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Student fee structures, online invoice payments, receipt generation, and fee discount waivers will be activated in Phase A7.
            </p>
          </div>
        </div>
      )}

      {/* Modal: Edit Student Profile */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Edit Student Profile</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <div>
                  <label className="block font-semibold mb-1">Admission Number *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.admissionNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, admissionNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Roll Number</label>
                  <input
                    type="text"
                    value={editFormData.rollNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, rollNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={editFormData.dateOfBirth}
                    onChange={(e) => setEditFormData({ ...editFormData, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Gender *</label>
                  <select
                    value={editFormData.gender}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        gender: e.target.value as "MALE" | "FEMALE" | "OTHER",
                      })
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => {
                      setEditFormData({ ...editFormData, email: e.target.value });
                      if (emailValidation.error) setEmailValidation({ checking: false, error: null });
                    }}
                    onBlur={(e) => checkStudentEmail(e.target.value)}
                    className={`w-full px-3 py-2 bg-background border ${
                      emailValidation.error ? "border-rose-500 ring-1 ring-rose-500" : "border-border"
                    } rounded-lg text-sm text-foreground`}
                  />
                  {emailValidation.checking && (
                    <p className="text-[11px] text-muted-foreground mt-1">Checking email...</p>
                  )}
                  {emailValidation.error && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      {emailValidation.error}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block font-semibold mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <h4 className="font-bold text-foreground mb-2">Residential Address</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      placeholder="Street address"
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
                  className="px-4 py-2 border border-border rounded-lg text-xs font-semibold text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
                >
                  {isActionSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Link Parent */}
      {isLinkParentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Link Existing Parent / Guardian</h3>
              <button
                onClick={() => setIsLinkParentModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {allParents.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground space-y-2">
                <p>No unlinked parents available in your school database.</p>
                <Link
                  href="/admin/parents"
                  className="text-indigo-600 dark:text-indigo-400 font-semibold underline"
                >
                  Go to Parents Directory to create one →
                </Link>
              </div>
            ) : (
              <form onSubmit={handleLinkParentSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Select Parent</label>
                  <select
                    value={selectedParentIdToLink}
                    onChange={(e) => setSelectedParentIdToLink(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                  >
                    {allParents.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.email})
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
                  <label htmlFor="linkIsPrimary" className="font-semibold text-foreground cursor-pointer">
                    Set as Primary Guardian
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsLinkParentModalOpen(false)}
                    className="px-4 py-2 border border-border rounded-lg font-semibold text-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isActionSubmitting}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
                  >
                    {isActionSubmitting ? "Linking..." : "Confirm Link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Status / Transfer */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Change Student Status / Transfer</h3>
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStatusSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Status</label>
                <select
                  value={statusFormData.status}
                  onChange={(e) =>
                    setStatusFormData({
                      ...statusFormData,
                      status: e.target.value as typeof statusFormData.status,
                    })
                  }
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground font-semibold"
                >
                  <option value="ACTIVE">ACTIVE (Regular Enrolled)</option>
                  <option value="INACTIVE">INACTIVE (Temporarily Inactive)</option>
                  <option value="TRANSFERRED">TRANSFERRED (Transferred to Another School)</option>
                  <option value="GRADUATED">GRADUATED (Completed Studies)</option>
                </select>
              </div>

              {statusFormData.status === "TRANSFERRED" && (
                <div className="space-y-3 p-3 bg-muted/40 rounded-lg border border-border">
                  <div>
                    <label className="block font-semibold mb-1">Target School</label>
                    <input
                      type="text"
                      placeholder="e.g. St. Xavier's International School"
                      value={statusFormData.targetSchool}
                      onChange={(e) => setStatusFormData({ ...statusFormData, targetSchool: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">TC Number</label>
                    <input
                      type="text"
                      placeholder="e.g. TC-2026-892"
                      value={statusFormData.transferCertificateNumber}
                      onChange={(e) =>
                        setStatusFormData({ ...statusFormData, transferCertificateNumber: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Reason for Transfer</label>
                    <input
                      type="text"
                      placeholder="e.g. Family relocation"
                      value={statusFormData.reason}
                      onChange={(e) => setStatusFormData({ ...statusFormData, reason: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg font-semibold text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold"
                >
                  {isActionSubmitting ? "Updating..." : "Update Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Student Portal Account Confirmation */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">
                {student.hasLoginAccount ? "Reset Student Password" : "Create Student Portal Account"}
              </h3>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-muted-foreground space-y-2">
              <p>
                This will generate a new cryptographically secure temporary password for student:
              </p>
              <div className="p-2.5 bg-muted rounded font-semibold text-foreground">
                {student.fullName} ({student.email || "No email — will use login creation"})
              </div>
              <p className="text-amber-600 dark:text-amber-400">
                The student will be required to change this temporary password upon first login.
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
                disabled={isActionSubmitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs shadow-sm"
              >
                {isActionSubmitting ? "Generating..." : "Generate Temporary Password"}
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
                  Copy and share these login credentials with the student.
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
                <span className="text-muted-foreground">Email: </span>
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
