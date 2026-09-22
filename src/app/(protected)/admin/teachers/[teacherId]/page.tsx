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
  Calendar,
  Phone,
  Mail,
  MapPin,
  BookOpen,
  Award,
  RotateCw,
  X,
  Plus,
  Trash2,
  Edit2,
  Star,
  Layers,
  Sparkles,
  School,
  Clock,
  Briefcase,
  User as UserIcon,
  FileText,
  ExternalLink,
} from "lucide-react";

interface TeacherProfile {
  id: string;
  teacherId: string;
  employeeId?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  photo?: string;
  dateOfBirth?: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  phone?: string;
  email?: string;
  alternatePhone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  qualification?: string;
  department?: string;
  designation?: string;
  joiningDate?: string;
  status: "ACTIVE" | "INACTIVE";
  hasLoginAccount: boolean;
  user?: {
    _id: string;
    email: string;
    isActive: boolean;
    mustChangePassword?: boolean;
    createdAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface AcademicAssignment {
  id: string;
  academicYear?: { _id: string; name: string; status: string };
  class?: { _id: string; name: string; code?: string };
  section?: { _id: string; name: string; capacity?: number };
  subject?: { _id: string; name: string; code?: string; subjectType?: string };
  assignmentType?: string;
  isClassTeacher: boolean;
  isActive: boolean;
  createdAt: string;
}

interface AcademicYearOpt {
  id: string;
  name: string;
  status: string;
}

interface ClassOpt {
  id: string;
  name: string;
  code?: string;
}

interface SectionOpt {
  id: string;
  name: string;
}

interface SubjectOpt {
  id: string;
  name: string;
  code?: string;
  subjectType?: string;
}

export default function TeacherDetailPage({
  params,
}: {
  params: Promise<{ teacherId: string }>;
}) {
  const { teacherId } = use(params);
  const router = useRouter();

  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [assignments, setAssignments] = useState<AcademicAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "personal" | "assignments" | "coursework" | "account" | "attendance" | "timetable" | "exams"
  >("overview");

  const [courseworkData, setCourseworkData] = useState<any>(null);
  const [isCourseworkLoading, setIsCourseworkLoading] = useState(false);

  const fetchTeacherCoursework = useCallback(async () => {
    if (!teacherId) return;
    setIsCourseworkLoading(true);
    try {
      const res = await fetch(`/api/admin/teachers/${teacherId}/assignments`);
      const json = await res.json();
      if (json.success) {
        setCourseworkData(json.data);
      }
    } catch (err) {
      console.error("Failed to load teacher coursework:", err);
    } finally {
      setIsCourseworkLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    if (activeTab === "coursework") {
      fetchTeacherCoursework();
    }
  }, [activeTab, fetchTeacherCoursework]);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddAssignmentModalOpen, setIsAddAssignmentModalOpen] = useState(false);
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
  const [copiedPass, setCopiedPass] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedTeacherId, setCopiedTeacherId] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: "",
    alternatePhone: "",
    gender: "MALE" as "MALE" | "FEMALE" | "OTHER",
    dateOfBirth: "",
    qualification: "",
    department: "",
    designation: "",
    joiningDate: "",
    employeeId: "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Assignment Modal State
  const [academicYears, setAcademicYears] = useState<AcademicYearOpt[]>([]);
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [availableSections, setAvailableSections] = useState<SectionOpt[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<SubjectOpt[]>([]);
  const [isLoadingClassDetails, setIsLoadingClassDetails] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    academicYearId: "",
    classId: "",
    sectionId: "",
    subjectId: "",
    isClassTeacher: false,
  });
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  // Status Modal State
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusReason, setStatusReason] = useState("");

  // Account Modal State
  const [isProvisioningAccount, setIsProvisioningAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Exams State
  const [examsData, setExamsData] = useState<any>(null);
  const [isExamsLoading, setIsExamsLoading] = useState(false);

  // Action feedback
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const fetchTeacherExams = useCallback(async () => {
    if (!teacherId) return;
    setIsExamsLoading(true);
    try {
      const res = await fetch(`/api/admin/teachers/${teacherId}/exams`);
      const json = await res.json();
      if (json.success) {
        setExamsData(json.data);
      }
    } catch (err) {
      console.error("Failed to load teacher exams:", err);
    } finally {
      setIsExamsLoading(false);
    }
  }, [teacherId]);

  // Fetch Teacher Data
  const fetchTeacherData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/teachers/${teacherId}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load teacher profile");
      }

      setTeacher(json.data.teacher);
      setAssignments(json.data.assignments || []);

      // Populate Edit Form
      const t = json.data.teacher;
      setEditForm({
        firstName: t.firstName || "",
        middleName: t.middleName || "",
        lastName: t.lastName || "",
        email: t.email || "",
        phone: t.phone || "",
        alternatePhone: t.alternatePhone || "",
        gender: t.gender || "MALE",
        dateOfBirth: t.dateOfBirth ? t.dateOfBirth.split("T")[0] : "",
        qualification: t.qualification || "",
        department: t.department || "",
        designation: t.designation || "",
        joiningDate: t.joiningDate ? t.joiningDate.split("T")[0] : "",
        employeeId: t.employeeId || "",
        street: t.address?.street || "",
        city: t.address?.city || "",
        state: t.address?.state || "",
        postalCode: t.address?.postalCode || "",
        country: t.address?.country || "India",
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    fetchTeacherData();
  }, [fetchTeacherData]);

  useEffect(() => {
    if (activeTab === "exams") {
      fetchTeacherExams();
    }
  }, [activeTab, fetchTeacherExams]);

  // Load metadata for Assignment modal
  const loadAssignmentMeta = async () => {
    try {
      const [ayRes, clRes] = await Promise.all([
        fetch("/api/admin/academic-years"),
        fetch("/api/admin/classes"),
      ]);
      const ayData = await ayRes.json();
      const clData = await clRes.json();

      let activeAyId = "";
      if (ayData.success && ayData.data?.academicYears) {
        setAcademicYears(ayData.data.academicYears);
        const activeAy = ayData.data.academicYears.find(
          (ay: AcademicYearOpt) => ay.status === "ACTIVE"
        );
        if (activeAy) {
          activeAyId = activeAy.id;
        }
      }

      if (clData.success && clData.data?.classes) {
        setClasses(clData.data.classes);
      }

      return activeAyId;
    } catch (err) {
      console.error("Failed to load assignment metadata", err);
      return "";
    }
  };

  const handleOpenAddAssignment = async () => {
    const activeAyId = await loadAssignmentMeta();
    setAssignmentForm({
      academicYearId: activeAyId || academicYears.find((ay) => ay.status === "ACTIVE")?.id || "",
      classId: "",
      sectionId: "",
      subjectId: "",
      isClassTeacher: false,
    });
    setAvailableSections([]);
    setAvailableSubjects([]);
    setAssignmentError(null);
    setIsAddAssignmentModalOpen(true);
  };

  const handleAcademicYearChange = (ayId: string) => {
    setAssignmentForm((prev) => ({
      ...prev,
      academicYearId: ayId,
      classId: "",
      sectionId: "",
      subjectId: "",
    }));
    setAvailableSections([]);
    setAvailableSubjects([]);
  };

  // When class changes in Add Assignment Modal, load sections and subjects
  const handleClassChange = async (selectedClassId: string) => {
    setAssignmentForm((prev) => ({
      ...prev,
      classId: selectedClassId,
      sectionId: "",
      subjectId: "",
    }));
    setAvailableSections([]);
    setAvailableSubjects([]);

    if (!selectedClassId) return;

    try {
      setIsLoadingClassDetails(true);
      const res = await fetch(`/api/admin/classes/${selectedClassId}`);
      const json = await res.json();

      if (json.success && json.data) {
        if (json.data.sections) {
          setAvailableSections(
            json.data.sections.map((s: { id?: string; _id?: string; name: string }) => ({
              id: s.id || s._id || "",
              name: s.name,
            }))
          );
        }
        if (json.data.subjects) {
          setAvailableSubjects(
            json.data.subjects.map((cs: { id?: string; subjectId?: string; _id?: string; name: string; code?: string; subjectType?: string }) => ({
              id: cs.subjectId || cs.id || cs._id || "",
              name: cs.name,
              code: cs.code,
              subjectType: cs.subjectType,
            }))
          );
        }
      }
    } catch (err) {
      console.error("Failed to load class sections/subjects", err);
    } finally {
      setIsLoadingClassDetails(false);
    }
  };

  // Submit Add Assignment
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentForm.academicYearId || !assignmentForm.classId || !assignmentForm.sectionId) {
      setAssignmentError("Academic Year, Class, and Section are required.");
      return;
    }

    if (assignmentForm.isClassTeacher && existingClassTeacherAssignmentInYear) {
      setAssignmentError(
        `${teacher?.fullName || "This teacher"} is already assigned as Class Teacher of ${
          existingClassTeacherAssignmentInYear.class?.name || "another class"
        } - Section ${
          existingClassTeacherAssignmentInYear.section?.name || "A"
        } for academic year ${
          existingClassTeacherAssignmentInYear.academicYear?.name || "the selected year"
        }. A teacher can be Class Teacher for only one section per academic year.`
      );
      return;
    }

    try {
      setIsSavingAssignment(true);
      setAssignmentError(null);

      const isClassTeacher = Boolean(assignmentForm.isClassTeacher);
      const hasSubject = Boolean(assignmentForm.subjectId);
      const assignmentType = isClassTeacher && hasSubject
        ? "BOTH"
        : isClassTeacher
        ? "CLASS_TEACHER"
        : "SUBJECT_TEACHER";

      const payload: Record<string, unknown> = {
        academicYearId: assignmentForm.academicYearId,
        classId: assignmentForm.classId,
        sectionId: assignmentForm.sectionId,
        assignmentType,
        isClassTeacher,
      };

      if (assignmentForm.subjectId) {
        payload.subjectId = assignmentForm.subjectId;
      }

      const res = await fetch(`/api/admin/teachers/${teacherId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        const errorMsg =
          json.error?.message ||
          (json.error?.details && Array.isArray(json.error.details) && json.error.details[0]?.message) ||
          "Failed to create assignment";
        throw new Error(errorMsg);
      }

      setIsAddAssignmentModalOpen(false);
      showToast("Academic assignment added successfully!");
      fetchTeacherData();
    } catch (err: unknown) {
      setAssignmentError(err instanceof Error ? err.message : "Failed to create assignment");
    } finally {
      setIsSavingAssignment(false);
    }
  };

  // Deactivate Assignment
  const handleDeactivateAssignment = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to deactivate this academic assignment?")) return;

    try {
      const res = await fetch(
        `/api/admin/teachers/${teacherId}/assignments/${assignmentId}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to deactivate assignment");
      }
      showToast("Assignment deactivated successfully.");
      fetchTeacherData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error deactivating assignment");
    }
  };

  // Toggle Class Teacher status on an assignment
  const handleToggleClassTeacher = async (assignment: AcademicAssignment) => {
    const nextState = !assignment.isClassTeacher;
    const msg = nextState
      ? "Designate this teacher as the Class Teacher for this section? (Any previous class teacher will be replaced)"
      : "Remove Class Teacher designation for this section?";

    if (!confirm(msg)) return;

    try {
      const res = await fetch(
        `/api/admin/teachers/${teacherId}/assignments/${assignment.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isClassTeacher: nextState }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update Class Teacher status");
      }
      showToast(
        nextState
          ? "Assigned as Class Teacher successfully!"
          : "Class Teacher status removed."
      );
      fetchTeacherData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error updating assignment");
    }
  };

  // Save Edit Teacher Form
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      setEditError("First name and Last name are required.");
      return;
    }

    try {
      setIsSavingEdit(true);
      setEditError(null);

      const payload: Record<string, unknown> = {
        firstName: editForm.firstName.trim(),
        middleName: editForm.middleName.trim() || undefined,
        lastName: editForm.lastName.trim(),
        email: editForm.email.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        alternatePhone: editForm.alternatePhone.trim() || undefined,
        gender: editForm.gender,
        dateOfBirth: editForm.dateOfBirth || undefined,
        qualification: editForm.qualification.trim() || undefined,
        department: editForm.department.trim() || undefined,
        designation: editForm.designation.trim() || undefined,
        joiningDate: editForm.joiningDate || undefined,
        employeeId: editForm.employeeId.trim() || undefined,
        address: {
          street: editForm.street.trim() || undefined,
          city: editForm.city.trim() || undefined,
          state: editForm.state.trim() || undefined,
          postalCode: editForm.postalCode.trim() || undefined,
          country: editForm.country.trim() || undefined,
        },
      };

      const res = await fetch(`/api/admin/teachers/${teacherId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update teacher");
      }

      setIsEditModalOpen(false);
      showToast("Teacher profile updated successfully!");
      fetchTeacherData();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Status Change
  const handleUpdateStatus = async () => {
    if (!teacher) return;
    const nextStatus = teacher.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    try {
      setIsUpdatingStatus(true);
      const res = await fetch(`/api/admin/teachers/${teacherId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          reason: statusReason.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update status");
      }

      setIsStatusModalOpen(false);
      setStatusReason("");
      showToast(`Teacher status changed to ${nextStatus}!`);
      fetchTeacherData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error updating status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Provision / Reset Portal Account
  const handleProvisionAccount = async (isReset = false) => {
    if (!teacher) return;
    try {
      setIsProvisioningAccount(true);
      setAccountError(null);

      const res = await fetch(`/api/admin/teachers/${teacherId}/account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isReset }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to manage portal account");
      }

      setIsAccountModalOpen(false);
      setGeneratedCreds({
        email: json.data.email,
        temporaryPassword: json.data.temporaryPassword,
        role: "TEACHER",
        name: teacher.fullName,
        isReset,
      });

      showToast(
        isReset
          ? "Temporary password generated successfully!"
          : "Teacher portal account provisioned!"
      );
      fetchTeacherData();
    } catch (err: unknown) {
      setAccountError(err instanceof Error ? err.message : "Failed to manage portal account");
    } finally {
      setIsProvisioningAccount(false);
    }
  };

  const copyToClipboard = (text: string, type: "pass" | "all" | "teacherId") => {
    navigator.clipboard.writeText(text);
    if (type === "pass") {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    } else if (type === "all") {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } else if (type === "teacherId") {
      setCopiedTeacherId(true);
      setTimeout(() => setCopiedTeacherId(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RotateCw className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="text-sm font-medium text-slate-500">Loading teacher profile...</p>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-red-800">Unable to Load Teacher Profile</h2>
          <p className="text-sm text-red-600 mt-1 mb-4">{error || "Teacher record not found."}</p>
          <button
            onClick={() => router.push("/admin/teachers")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-xl text-sm shadow hover:bg-red-700 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Teachers Directory
          </button>
        </div>
      </div>
    );
  }

  const activeAssignments = assignments.filter((a) => a.isActive);
  const inactiveAssignments = assignments.filter((a) => !a.isActive);
  const classTeacherAssignments = activeAssignments.filter((a) => a.isClassTeacher);

  const existingClassTeacherAssignmentInYear = activeAssignments.find(
    (a) =>
      a.isClassTeacher &&
      (a.academicYear?._id === assignmentForm.academicYearId ||
        (a.academicYear as any)?.id === assignmentForm.academicYearId)
  );

  const distinctClassesCount = new Set(
    activeAssignments.map((a) => a.class?._id).filter(Boolean)
  ).size;

  const distinctSubjectsCount = new Set(
    activeAssignments.map((a) => a.subject?._id).filter(Boolean)
  ).size;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 right-8 z-50 flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl font-medium text-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-white" />
          {successToast}
        </div>
      )}

      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/teachers"
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-sm transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Teachers Directory</span>
              <span>/</span>
              <span className="text-slate-600 dark:text-slate-300">Profile Details</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {teacher.fullName}
            </h1>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs rounded-xl shadow-sm transition"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-500" />
            Edit Profile
          </button>

          <button
            onClick={() => setIsStatusModalOpen(true)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 font-semibold text-xs rounded-xl shadow-sm border transition ${
              teacher.status === "ACTIVE"
                ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900"
                : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
            }`}
          >
            {teacher.status === "ACTIVE" ? (
              <>
                <UserX className="w-3.5 h-3.5" /> Deactivate
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5" /> Activate
              </>
            )}
          </button>

          {teacher.hasLoginAccount ? (
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900 hover:bg-indigo-100 font-semibold text-xs rounded-xl shadow-sm transition"
            >
              <Key className="w-3.5 h-3.5" /> Reset Password
            </button>
          ) : (
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm shadow-indigo-500/20 transition"
            >
              <Key className="w-3.5 h-3.5" /> Provision Account
            </button>
          )}
        </div>
      </div>

      {/* Teacher Profile Banner Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar with initial fallback */}
          <div className="relative flex-shrink-0">
            {teacher.photo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={teacher.photo}
                alt={teacher.fullName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-indigo-500/20 shadow-md"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-lg ring-4 ring-indigo-500/20">
                {teacher.firstName.charAt(0)}
                {teacher.lastName.charAt(0)}
              </div>
            )}
            <span
              className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 ${
                teacher.status === "ACTIVE" ? "bg-emerald-500" : "bg-rose-500"
              }`}
              title={teacher.status}
            />
          </div>

          {/* Core Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {teacher.fullName}
              </h2>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase ${
                  teacher.status === "ACTIVE"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                }`}
              >
                {teacher.status}
              </span>

              {classTeacherAssignments.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  Class Teacher
                </span>
              )}
            </div>

            <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              {teacher.designation || "Faculty Member"} •{" "}
              <span className="text-slate-500 dark:text-slate-400 font-normal">
                {teacher.department || "General Department"}
              </span>
            </p>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Teacher ID:</span>
                <span className="font-mono">{teacher.teacherId}</span>
                <button
                  onClick={() => copyToClipboard(teacher.teacherId, "teacherId")}
                  className="hover:text-indigo-600 transition"
                  title="Copy Teacher ID"
                >
                  {copiedTeacherId ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>

              {teacher.employeeId && (
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Employee ID:</span>
                  <span className="font-mono">{teacher.employeeId}</span>
                </div>
              )}

              {teacher.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{teacher.email}</span>
                </div>
              )}

              {teacher.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{teacher.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-2 scrollbar-none">
        {[
          { key: "overview", label: "Overview", icon: Layers },
          { key: "personal", label: "Personal Information", icon: UserIcon },
          {
            key: "assignments",
            label: `Class Allocations (${activeAssignments.length})`,
            icon: GraduationCap,
          },
          {
            key: "coursework",
            label: "Coursework & Material",
            icon: FileText,
          },
          { key: "account", label: "Portal Account", icon: ShieldCheck },
          { key: "attendance", label: "Attendance", icon: Clock, badge: "Soon" },
          { key: "timetable", label: "Timetable", icon: Calendar, badge: "Soon" },
          { key: "exams", label: "Exams & Marks", icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
                    isActive
                      ? "bg-indigo-700/80 text-white"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Active Assignments
                </p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {activeAssignments.length}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <BookOpen className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Classes Taught
                </p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {distinctClassesCount}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <School className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Subjects Taught
                </p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {distinctSubjectsCount}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <GraduationCap className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Class Teacher Of
                </p>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1 truncate">
                  {classTeacherAssignments.length > 0
                    ? classTeacherAssignments
                        .map((a) => `${a.class?.name || "Class"} - ${a.section?.name || "Sec"}`)
                        .join(", ")
                    : "None"}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Star className="w-6 h-6 fill-emerald-500 text-emerald-500" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Profile Summary Card */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  Employment & Role Summary
                </h3>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs font-semibold text-slate-400 block">Department</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {teacher.department || "Not Assigned"}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 block">Designation</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {teacher.designation || "Teacher / Faculty"}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 block">Qualification</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {teacher.qualification || "Not Specified"}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 block">Joining Date</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {teacher.joiningDate
                      ? new Date(teacher.joiningDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "Not Specified"}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 block">Gender</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{teacher.gender}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 block">Date of Birth</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {teacher.dateOfBirth
                      ? new Date(teacher.dateOfBirth).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "Not Specified"}
                  </span>
                </div>
              </div>

              {/* Contact Information */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Contact Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div>
                      <span className="text-xs text-slate-400 block">Email Address</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {teacher.email || "No email on record"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div>
                      <span className="text-xs text-slate-400 block">Primary Phone</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {teacher.phone || "No phone on record"}
                      </span>
                    </div>
                  </div>
                  {teacher.address && (
                    <div className="sm:col-span-2 flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs text-slate-400 block">Residential Address</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {[
                            teacher.address.street,
                            teacher.address.city,
                            teacher.address.state,
                            teacher.address.postalCode,
                            teacher.address.country,
                          ]
                            .filter(Boolean)
                            .join(", ") || "No address on record"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Portal Account & Quick Status */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    Portal Account
                  </h3>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      teacher.hasLoginAccount
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                    }`}
                  >
                    {teacher.hasLoginAccount ? "Provisioned" : "Not Provisioned"}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {teacher.hasLoginAccount
                    ? "This teacher has an active login identity for the upcoming Teacher Portal. Temporary passwords can be reset securely."
                    : "No portal account is linked to this teacher yet. Provisioning creates a secure TEACHER role login identity."}
                </p>

                {teacher.user && (
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 space-y-2 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                    <div>
                      <span className="text-slate-400 font-semibold block">Login Username:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                        {teacher.user.email}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">Account Status:</span>
                      <span
                        className={`font-bold ${
                          teacher.user.isActive ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {teacher.user.isActive ? "Active Login" : "Disabled Login"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                {teacher.hasLoginAccount ? (
                  <button
                    onClick={() => setIsAccountModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-bold text-xs border border-indigo-200 dark:border-indigo-900 transition"
                  >
                    <Key className="w-4 h-4" /> Reset Portal Password
                  </button>
                ) : (
                  <button
                    onClick={() => setIsAccountModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition"
                  >
                    <Key className="w-4 h-4" /> Provision Portal Account
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PERSONAL INFORMATION */}
      {activeTab === "personal" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-8">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Detailed Personal & Contact Record
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Official staff demographics, contact coordinates, and residential address.
              </p>
            </div>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit Record
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400">First Name</span>
              <p className="font-bold text-slate-800 dark:text-slate-200">{teacher.firstName}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400">Middle Name</span>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                {teacher.middleName || "—"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400">Last Name</span>
              <p className="font-bold text-slate-800 dark:text-slate-200">{teacher.lastName}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400">Gender</span>
              <p className="font-bold text-slate-800 dark:text-slate-200">{teacher.gender}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400">Date of Birth</span>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                {teacher.dateOfBirth
                  ? new Date(teacher.dateOfBirth).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400">Joining Date</span>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                {teacher.joiningDate
                  ? new Date(teacher.joiningDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400">Department</span>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                {teacher.department || "—"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400">Designation</span>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                {teacher.designation || "—"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400">Qualification</span>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                {teacher.qualification || "—"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400">Primary Email</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                {teacher.email || "—"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400">Primary Phone</span>
              <p className="font-bold text-slate-800 dark:text-slate-200">{teacher.phone || "—"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400">Alternate Phone</span>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                {teacher.alternatePhone || "—"}
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Address & Location Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
              <div className="space-y-1 md:col-span-2">
                <span className="text-xs font-semibold text-slate-400">Street Address</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {teacher.address?.street || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400">City</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {teacher.address?.city || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400">State</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {teacher.address?.state || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400">Postal Code</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {teacher.address?.postalCode || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400">Country</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {teacher.address?.country || "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ACADEMIC ASSIGNMENTS */}
      {activeTab === "assignments" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-600" />
                  Assigned Classes, Sections & Subjects
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Manage academic duties, subject assignments, and Class Teacher responsibilities.
                </p>
              </div>
              <button
                onClick={handleOpenAddAssignment}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition"
              >
                <Plus className="w-4 h-4" /> Add Academic Assignment
              </button>
            </div>

            {/* Active Assignments List / Table */}
            {activeAssignments.length === 0 ? (
              <div className="text-center py-12 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
                <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No Academic Assignments Found
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  This teacher currently does not have any active class, section, or subject assignments.
                </p>
                <button
                  onClick={handleOpenAddAssignment}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl shadow-sm hover:bg-indigo-700 transition mt-2"
                >
                  <Plus className="w-3.5 h-3.5" /> Assign First Subject or Class
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Academic Year</th>
                      <th className="py-3 px-4">Class & Section</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Assignment Role</th>
                      <th className="py-3 px-4">Assigned On</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activeAssignments.map((a) => (
                      <tr
                        key={a.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition group"
                      >
                        <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {a.academicYear?.name || "Academic Year"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {a.class?.name || "Class"}
                          </span>
                          <span className="ml-1.5 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px]">
                            Sec {a.section?.name || "A"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {a.subject ? (
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {a.subject.name}
                              </span>
                              {a.subject.code && (
                                <span className="ml-1.5 text-[10px] text-slate-400 font-mono">
                                  ({a.subject.code})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Class Teacher Only</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {a.isClassTeacher ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              Class Teacher
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-medium">
                              Subject Teacher
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {new Date(a.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleClassTeacher(a)}
                              className={`p-1.5 rounded-lg text-xs font-semibold transition ${
                                a.isClassTeacher
                                  ? "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40"
                                  : "text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                              title={
                                a.isClassTeacher
                                  ? "Remove Class Teacher Status"
                                  : "Promote to Class Teacher"
                              }
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  a.isClassTeacher ? "fill-amber-500 text-amber-500" : ""
                                }`}
                              />
                            </button>
                            <button
                              onClick={() => handleDeactivateAssignment(a.id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title="Deactivate Assignment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Past / Inactive Assignments */}
          {inactiveAssignments.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 opacity-70">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Historical / Deactivated Assignments ({inactiveAssignments.length})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs text-slate-500">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="py-2 px-3">Year</th>
                      <th className="py-2 px-3">Class & Section</th>
                      <th className="py-2 px-3">Subject</th>
                      <th className="py-2 px-3">Class Teacher</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {inactiveAssignments.map((a) => (
                      <tr key={a.id}>
                        <td className="py-2 px-3">{a.academicYear?.name}</td>
                        <td className="py-2 px-3">
                          {a.class?.name} - {a.section?.name}
                        </td>
                        <td className="py-2 px-3">{a.subject?.name || "None"}</td>
                        <td className="py-2 px-3">{a.isClassTeacher ? "Yes" : "No"}</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                            Inactive
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PORTAL ACCOUNT */}
      {activeTab === "account" && (
        <div className="max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Teacher Portal Identity & Credentials
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage authentication status and temporary password generation.
              </p>
            </div>
          </div>

          {teacher.hasLoginAccount ? (
            <div className="space-y-6">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Portal Login Identity Active
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                  This teacher has a provisioned user account. Passwords are encrypted using salted bcrypt hashing and are never stored in plaintext.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-semibold">Username / Email</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {teacher.user?.email || teacher.email}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-semibold">User Role</span>
                  <span className="font-bold text-indigo-600 font-mono">TEACHER</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-semibold">Must Change Password</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {teacher.user?.mustChangePassword ? "Yes (First Login)" : "No"}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => handleProvisionAccount(true)}
                  disabled={isProvisioningAccount}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
                >
                  {isProvisioningAccount ? (
                    <RotateCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4" />
                  )}
                  Generate New Temporary Password
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  No Portal Account Linked
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  To allow this teacher to log into the upcoming Teacher Portal, provision an account. A secure temporary password will be generated for one-time viewing.
                </p>
              </div>

              {!teacher.email ? (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs text-slate-600 dark:text-slate-400">
                  ⚠️ Teacher email is missing. Please edit teacher profile and provide a valid email before provisioning.
                </div>
              ) : (
                <button
                  onClick={() => handleProvisionAccount(false)}
                  disabled={isProvisioningAccount}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
                >
                  {isProvisioningAccount ? (
                    <RotateCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4" />
                  )}
                  Provision Teacher Account Now
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 8: COURSEWORK & STUDY MATERIAL */}
      {activeTab === "coursework" && (
        <div className="space-y-6">
          {isCourseworkLoading ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
              <RotateCw className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading teacher coursework and study materials...</p>
            </div>
          ) : !courseworkData ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500">No coursework data available.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Assignments</span>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {courseworkData.summary.totalAssignmentsCreated}
                  </div>
                </div>
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Submissions</span>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {courseworkData.summary.totalSubmissionsReceived}
                  </div>
                </div>
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Reviewed</span>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {courseworkData.summary.totalReviewedSubmissions}
                  </div>
                </div>
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Review</span>
                  <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                    {courseworkData.summary.pendingReviewCount}
                  </div>
                </div>
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Study Materials</span>
                  <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                    {courseworkData.summary.totalStudyMaterialsCreated}
                  </div>
                </div>
              </div>

              {/* Assignments Created */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Assignments Created</h3>
                    <p className="text-xs text-slate-500">Homework and projects authored by this teacher</p>
                  </div>
                  <Link
                    href="/admin/assignments"
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Assignments Center &rarr;
                  </Link>
                </div>
                {courseworkData.assignments.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No assignments created yet by this teacher.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                          <th className="py-3 px-4">Title</th>
                          <th className="py-3 px-4">Class & Section</th>
                          <th className="py-3 px-4">Subject</th>
                          <th className="py-3 px-4">Due Date</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Submissions</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {courseworkData.assignments.map((asgn: any) => (
                          <tr key={asgn._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                              {asgn.title}
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                              {asgn.classId?.name || "—"} {asgn.sectionId?.name ? `(${asgn.sectionId.name})` : "(All Sections)"}
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                              {asgn.subjectId?.name || "—"}
                            </td>
                            <td className="py-3 px-4 text-slate-500">
                              {new Date(asgn.dueDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                asgn.status === "PUBLISHED"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : asgn.status === "CLOSED"
                                  ? "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              }`}>
                                {asgn.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                              {asgn.submissionCount || 0}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Link
                                href={`/admin/assignments/${asgn._id}`}
                                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                              >
                                View Submissions &rarr;
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Study Materials Uploaded */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Study Materials Published</h3>
                    <p className="text-xs text-slate-500">Notes, references, and lesson resources uploaded by this teacher</p>
                  </div>
                  <Link
                    href="/admin/study-material"
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Study Material Center &rarr;
                  </Link>
                </div>
                {courseworkData.studyMaterials.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No study materials uploaded yet by this teacher.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                          <th className="py-3 px-4">Title</th>
                          <th className="py-3 px-4">Class</th>
                          <th className="py-3 px-4">Subject</th>
                          <th className="py-3 px-4">Topic</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4 text-right">Resource</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {courseworkData.studyMaterials.map((mat: any) => (
                          <tr key={mat._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                              {mat.title}
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                              {mat.classId?.name || "—"}
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                              {mat.subjectId?.name || "—"}
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                              {mat.topic || "General"}
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                {mat.fileType}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <a
                                href={mat.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
                              >
                                View / Download
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: EXAMS & MARKS RESPONSIBILITIES */}
      {activeTab === "exams" && (
        <div className="space-y-6">
          {isExamsLoading ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
              <RotateCw className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading examination responsibilities...</p>
            </div>
          ) : !examsData ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500">No examination data available for this teacher.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Teaching Subject Scope for Evaluation */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-600" />
                    Authorized Evaluation & Marks Entry Scope
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Based on academic allocations, this teacher has authorized grading access for the following class sections and subjects:
                  </p>
                </div>

                {examsData.assignments.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500 text-center">
                    No active subject allocations assigned yet to this teacher.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {examsData.assignments.map((alloc: any) => (
                      <div
                        key={alloc.id}
                        className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs space-y-1.5"
                      >
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          {alloc.class?.name || "All Classes"} {alloc.section ? `- Sec ${alloc.section.name}` : ""}
                        </div>
                        <div className="text-indigo-600 dark:text-indigo-400 font-semibold">
                          {alloc.subject ? `${alloc.subject.name} (${alloc.subject.code || "N/A"})` : "All Subjects (Class Teacher)"}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Year: {alloc.academicYear?.name || "Active Session"} • {alloc.assignmentType}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active School Examinations */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Active Examinations</h3>
                    <p className="text-xs text-slate-500">Exams requiring evaluation and marks submissions</p>
                  </div>
                  <Link
                    href="/admin/exams"
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Exams Center &rarr;
                  </Link>
                </div>

                {examsData.exams.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No active examinations scheduled for this teacher&apos;s academic session.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                          <th className="py-3 px-4">Exam Name</th>
                          <th className="py-3 px-4">Session</th>
                          <th className="py-3 px-4">Schedule Window</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {examsData.exams.map((ex: any) => (
                          <tr key={ex.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                              {ex.name}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                              {ex.academicYear?.name || "Current Year"}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                              {new Date(ex.startDate).toLocaleDateString()} — {new Date(ex.endDate).toLocaleDateString()}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  ex.status === "RESULTS_PUBLISHED"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : ex.status === "IN_PROGRESS" || ex.status === "SCHEDULED"
                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                    : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                }`}
                              >
                                {ex.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <Link
                                href={`/admin/exams/${ex.id}/marks`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
                              >
                                <span>Enter Marks</span>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PLACEHOLDER TABS */}
      {["attendance", "timetable"].includes(activeTab) && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <Sparkles className="w-12 h-12 text-indigo-500 mx-auto" />
          <h3 className="text-lg font-black text-slate-900 dark:text-white capitalize">
            {activeTab} Module
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            This module will integrate with Teacher Management in its dedicated phase. Teacher academic assignments created in Phase A3 serve as the foundation.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT TEACHER PROFILE */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-600" />
                Edit Teacher Profile
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs font-semibold text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-6 text-xs">
              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={editForm.middleName}
                    onChange={(e) => setEditForm({ ...editForm, middleName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Contact & Demographics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Alternate Phone
                  </label>
                  <input
                    type="tel"
                    value={editForm.alternatePhone}
                    onChange={(e) => setEditForm({ ...editForm, alternatePhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={editForm.employeeId}
                    onChange={(e) => setEditForm({ ...editForm, employeeId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium font-mono"
                  />
                </div>
              </div>

              {/* Professional */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    placeholder="e.g. Science"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={editForm.designation}
                    onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                    placeholder="e.g. Senior Teacher"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Qualification
                  </label>
                  <input
                    type="text"
                    value={editForm.qualification}
                    onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })}
                    placeholder="e.g. M.Sc, B.Ed"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Dates & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Gender *
                  </label>
                  <select
                    value={editForm.gender}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        gender: e.target.value as "MALE" | "FEMALE" | "OTHER",
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={editForm.dateOfBirth}
                    onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    value={editForm.joiningDate}
                    onChange={(e) => setEditForm({ ...editForm, joiningDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">
                  Residential Address
                </span>
                <input
                  type="text"
                  placeholder="Street address"
                  value={editForm.street}
                  onChange={(e) => setEditForm({ ...editForm, street: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <input
                    type="text"
                    placeholder="City"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
                  />
                  <input
                    type="text"
                    placeholder="Postal Code"
                    value={editForm.postalCode}
                    onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
                  />
                  <input
                    type="text"
                    placeholder="Country"
                    value={editForm.country}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <RotateCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD ACADEMIC ASSIGNMENT */}
      {/* ========================================================================= */}
      {isAddAssignmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                Add Academic Assignment
              </h3>
              <button
                onClick={() => setIsAddAssignmentModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {assignmentError && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs font-semibold text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {assignmentError}
              </div>
            )}

            <form onSubmit={handleSaveAssignment} className="space-y-4 text-xs">
              {/* Academic Year */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Academic Year *
                </label>
                <select
                  required
                  value={assignmentForm.academicYearId}
                  onChange={(e) => handleAcademicYearChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="">Select Academic Year</option>
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.name} {ay.status === "ACTIVE" ? "(Current)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Class *
                </label>
                <select
                  required
                  value={assignmentForm.classId}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="">Select Class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.code ? `(${c.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Section *
                </label>
                <select
                  required
                  disabled={!assignmentForm.classId || isLoadingClassDetails}
                  value={assignmentForm.sectionId}
                  onChange={(e) =>
                    setAssignmentForm({ ...assignmentForm, sectionId: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium disabled:opacity-50"
                >
                  <option value="">
                    {isLoadingClassDetails
                      ? "Loading sections..."
                      : !assignmentForm.classId
                      ? "Select a class first"
                      : availableSections.length === 0
                      ? "No sections found for class"
                      : "Select Section"}
                  </option>
                  {availableSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      Section {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject (Optional if only assigning class teacher, required for subject teacher) */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subject
                  <span className="font-normal text-slate-400 ml-1">
                    (Leave empty if assigning as Class Teacher without a specific subject)
                  </span>
                </label>
                <select
                  disabled={!assignmentForm.classId || isLoadingClassDetails}
                  value={assignmentForm.subjectId}
                  onChange={(e) =>
                    setAssignmentForm({ ...assignmentForm, subjectId: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium disabled:opacity-50"
                >
                  <option value="">
                    {isLoadingClassDetails
                      ? "Loading subjects..."
                      : !assignmentForm.classId
                      ? "Select a class first"
                      : availableSubjects.length === 0
                      ? "No subjects mapped to this class"
                      : "Select Subject (Optional)"}
                  </option>
                  {availableSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Is Class Teacher Checkbox */}
              <div className="pt-2 space-y-3">
                <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignmentForm.isClassTeacher}
                    onChange={(e) =>
                      setAssignmentForm({ ...assignmentForm, isClassTeacher: e.target.checked })
                    }
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-amber-900 dark:text-amber-300 block">
                      Assign as Class Teacher for this Section
                    </span>
                    <span className="text-[11px] text-amber-700 dark:text-amber-400">
                      A teacher can be Class Teacher of only one section per academic year.
                    </span>
                  </div>
                </label>

                {assignmentForm.isClassTeacher && existingClassTeacherAssignmentInYear && (
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">
                        Teacher Already Assigned as Class Teacher
                      </span>
                      <span className="text-[11px] leading-relaxed">
                        {teacher.fullName} is already the Class Teacher of{" "}
                        <strong>
                          {existingClassTeacherAssignmentInYear.class?.name || "Class"} - Section{" "}
                          {existingClassTeacherAssignmentInYear.section?.name || "A"}
                        </strong>{" "}
                        for academic year{" "}
                        {existingClassTeacherAssignmentInYear.academicYear?.name || "the selected year"}.
                        To reassign, please deactivate or remove the existing Class Teacher status first.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddAssignmentModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSavingAssignment ||
                    Boolean(assignmentForm.isClassTeacher && existingClassTeacherAssignmentInYear)
                  }
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
                >
                  {isSavingAssignment ? (
                    <RotateCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: STATUS CHANGE CONFIRMATION */}
      {/* ========================================================================= */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                  teacher.status === "ACTIVE"
                    ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40"
                    : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"
                }`}
              >
                {teacher.status === "ACTIVE" ? (
                  <UserX className="w-5 h-5" />
                ) : (
                  <UserCheck className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {teacher.status === "ACTIVE" ? "Deactivate Teacher" : "Activate Teacher"}
                </h3>
                <p className="text-xs text-slate-500">Confirm status transition</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {teacher.status === "ACTIVE"
                ? "Deactivating this teacher will suspend portal login access while preserving all historical assignments, records, and class relationships."
                : "Activating this teacher will restore full faculty status and re-enable login access if a portal account exists."}
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Reason / Note (Optional)
              </label>
              <textarea
                rows={2}
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="e.g. On sabbatical leave / Resigned"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={isUpdatingStatus}
                className={`inline-flex items-center gap-2 px-5 py-2.5 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 ${
                  teacher.status === "ACTIVE"
                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                }`}
              >
                {isUpdatingStatus && <RotateCw className="w-4 h-4 animate-spin" />}
                Confirm {teacher.status === "ACTIVE" ? "Deactivation" : "Activation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: PROVISION / RESET PORTAL ACCOUNT */}
      {/* ========================================================================= */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {teacher.hasLoginAccount ? "Reset Portal Password" : "Provision Portal Account"}
                </h3>
                <p className="text-xs text-slate-500 font-medium">Teacher Login Credentials</p>
              </div>
            </div>

            {accountError && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs font-semibold text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {accountError}
              </div>
            )}

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {teacher.hasLoginAccount
                ? "This will generate a new secure temporary password for the teacher. The teacher will be prompted to change their password upon next login."
                : `Provisioning creates a portal login account using email "${teacher.email}". The user will be assigned the role TEACHER.`}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleProvisionAccount(teacher.hasLoginAccount)}
                disabled={isProvisioningAccount}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
              >
                {isProvisioningAccount && <RotateCw className="w-4 h-4 animate-spin" />}
                {teacher.hasLoginAccount ? "Generate New Password" : "Confirm & Provision"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: DISPLAY TEMPORARY CREDENTIALS POPUP */}
      {/* ========================================================================= */}
      {generatedCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
                <Key className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {generatedCreds.isReset ? "Password Reset Successful" : "Teacher Account Created"}
              </h3>
              <p className="text-xs text-slate-500">
                Teacher credentials have been generated securely.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block">Teacher Name:</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {generatedCreds.name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Login Email:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {generatedCreds.email}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Role:</span>
                <span className="font-bold text-indigo-600 font-mono">
                  {generatedCreds.role}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 font-semibold block">Temporary Password:</span>
                  <span className="font-bold text-indigo-600 font-mono text-base tracking-wider">
                    {generatedCreds.temporaryPassword}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(generatedCreds.temporaryPassword, "pass")}
                  className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 font-bold text-xs flex items-center gap-1.5 transition"
                >
                  {copiedPass ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Important:</strong> Save or transmit this temporary password now. For security purposes, passwords are never stored in plaintext and cannot be displayed again.
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `School Portal Login Credentials\nTeacher: ${generatedCreds.name}\nEmail: ${generatedCreds.email}\nTemporary Password: ${generatedCreds.temporaryPassword}`,
                    "all"
                  )
                }
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-center gap-2"
              >
                {copiedAll ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" /> All Details Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copy All Details
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setGeneratedCreds(null)}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
