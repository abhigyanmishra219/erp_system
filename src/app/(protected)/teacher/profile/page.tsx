"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  User,
  Mail,
  Phone,
  Building2,
  GraduationCap,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Award,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Check,
  Save,
  MapPin,
  Edit3,
  KeyRound,
  Sparkles,
} from "lucide-react";
import { useUser } from "@/context/UserContext";

export default function TeacherProfilePage() {
  const { user } = useUser();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "edit" | "security">("overview");

  // Edit form state
  const [formData, setFormData] = useState({
    phone: "",
    alternatePhone: "",
    qualification: "",
    gender: "MALE",
    dateOfBirth: "",
    photo: "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passSuccessMessage, setPassSuccessMessage] = useState<string | null>(null);
  const [passErrorMessage, setPassErrorMessage] = useState<string | null>(null);

  async function loadProfile() {
    try {
      const res = await fetch("/api/teacher/profile");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        const t = json.data.teacher;
        setFormData({
          phone: t.phone || "",
          alternatePhone: t.alternatePhone || "",
          qualification: t.qualification || "",
          gender: t.gender || "MALE",
          dateOfBirth: t.dateOfBirth ? new Date(t.dateOfBirth).toISOString().split("T")[0] : "",
          photo: t.photo || "",
          street: t.address?.street || "",
          city: t.address?.city || "",
          state: t.address?.state || "",
          postalCode: t.address?.postalCode || "",
          country: t.address?.country || "India",
        });
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  const teacher = data?.teacher;
  const assignments = data?.scope?.assignedClasses || [];

  // Password validation
  const passwordCriteria = useMemo(() => {
    return {
      hasMinLength: newPassword.length >= 8,
      hasUpper: /[A-Z]/.test(newPassword),
      hasLower: /[a-z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      hasSpecial: /[^A-Za-z0-9]/.test(newPassword),
    };
  }, [newPassword]);

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isPassFormValid =
    currentPassword.trim().length > 0 &&
    passwordCriteria.hasMinLength &&
    passwordsMatch &&
    currentPassword !== newPassword;

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveErrorMessage(null);
    setSaveSuccessMessage(null);
    setIsSaving(true);

    try {
      const res = await fetch("/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formData.phone,
          alternatePhone: formData.alternatePhone,
          qualification: formData.qualification,
          gender: formData.gender,
          dateOfBirth: formData.dateOfBirth || null,
          photo: formData.photo,
          address: {
            street: formData.street,
            city: formData.city,
            state: formData.state,
            postalCode: formData.postalCode,
            country: formData.country,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update profile.");
      }

      setSaveSuccessMessage("Your profile information has been updated successfully.");
      await loadProfile();
    } catch (err: any) {
      setSaveErrorMessage(err.message || "Failed to save profile changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassErrorMessage(null);
    setPassSuccessMessage(null);

    if (!isPassFormValid) {
      if (currentPassword === newPassword) {
        setPassErrorMessage("New password must be different from current password.");
      }
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to change password.");
      }

      setPassSuccessMessage("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPassErrorMessage(err.message || "Failed to update password.");
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
          My Faculty Profile
        </h1>
        <p className="text-xs text-muted-foreground">
          Personal credentials, teaching responsibilities, profile editing, and security
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 rounded-3xl bg-card border border-border text-center text-xs text-muted-foreground">
          Loading faculty profile...
        </div>
      ) : !teacher ? (
        <div className="p-8 rounded-3xl bg-card border border-destructive/20 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-sm font-bold text-foreground">Teacher Profile Not Found</p>
          <p className="text-xs text-muted-foreground">
            No matching teacher record linked to your user account.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Identity Header Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-2xl shrink-0 shadow-sm overflow-hidden">
                {teacher.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={teacher.photo}
                    alt={teacher.firstName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  `${teacher.firstName?.[0] || "T"}${teacher.lastName?.[0] || ""}`
                )}
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    {teacher.firstName} {teacher.middleName ? `${teacher.middleName} ` : ""}{teacher.lastName}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                    {teacher.designation || "Teacher"}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Active Faculty</span>
                  </span>
                </div>

                <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                  <span>Teacher ID: <strong className="font-mono text-foreground">{teacher.teacherId}</strong></span>
                  {teacher.employeeId && (
                    <>
                      <span className="text-border">•</span>
                      <span>Employee ID: <strong className="font-mono text-foreground">{teacher.employeeId}</strong></span>
                    </>
                  )}
                  {teacher.department && (
                    <>
                      <span className="text-border">•</span>
                      <span>Department: <strong className="text-foreground">{teacher.department}</strong></span>
                    </>
                  )}
                </p>

                <div className="pt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {teacher.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-primary" />
                      <span>{teacher.email}</span>
                    </div>
                  )}
                  {teacher.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-primary" />
                      <span>{teacher.phone}</span>
                    </div>
                  )}
                  {teacher.qualification && (
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-primary" />
                      <span>{teacher.qualification}</span>
                    </div>
                  )}
                  {teacher.joiningDate && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span>Joined: {new Date(teacher.joiningDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-border gap-2">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "overview"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Teaching Allocations & Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("edit")}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "edit"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Contact & Details</span>
            </button>

            <button
              onClick={() => setActiveTab("security")}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "security"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Security & Password</span>
            </button>
          </div>

          {/* TAB 1: Overview & Allocations */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Personal Credentials Summary */}
              <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
                <h3 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-500" />
                  <span>Personal & Institutional Information</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 rounded-2xl bg-surface-2 border border-border space-y-1">
                    <span className="text-[11px] text-muted-foreground">Full Legal Name</span>
                    <p className="font-bold text-foreground">
                      {teacher.firstName} {teacher.middleName ? `${teacher.middleName} ` : ""}{teacher.lastName}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-surface-2 border border-border space-y-1">
                    <span className="text-[11px] text-muted-foreground">Teacher ID</span>
                    <p className="font-mono font-bold text-foreground">{teacher.teacherId}</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-surface-2 border border-border space-y-1">
                    <span className="text-[11px] text-muted-foreground">Employee ID</span>
                    <p className="font-mono font-bold text-foreground">{teacher.employeeId || "—"}</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-surface-2 border border-border space-y-1">
                    <span className="text-[11px] text-muted-foreground">Department</span>
                    <p className="font-bold text-foreground">{teacher.department || "General Academic"}</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-surface-2 border border-border space-y-1">
                    <span className="text-[11px] text-muted-foreground">Designation</span>
                    <p className="font-bold text-foreground">{teacher.designation || "Teacher"}</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-surface-2 border border-border space-y-1">
                    <span className="text-[11px] text-muted-foreground">Joining Date</span>
                    <p className="font-bold text-foreground">
                      {teacher.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString() : "—"}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-surface-2 border border-border space-y-1">
                    <span className="text-[11px] text-muted-foreground">Gender</span>
                    <p className="font-bold text-foreground capitalize">{teacher.gender?.toLowerCase() || "—"}</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-surface-2 border border-border space-y-1">
                    <span className="text-[11px] text-muted-foreground">Date of Birth</span>
                    <p className="font-bold text-foreground">
                      {teacher.dateOfBirth ? new Date(teacher.dateOfBirth).toLocaleDateString() : "—"}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-surface-2 border border-border space-y-1">
                    <span className="text-[11px] text-muted-foreground">Qualification</span>
                    <p className="font-bold text-foreground">{teacher.qualification || "—"}</p>
                  </div>
                </div>

                {/* Residential Address */}
                {teacher.address && (teacher.address.street || teacher.address.city) && (
                  <div className="p-3.5 rounded-2xl bg-surface-2 border border-border text-xs space-y-1">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-primary" />
                      <span>Residential Address</span>
                    </span>
                    <p className="font-medium text-foreground">
                      {[
                        teacher.address.street,
                        teacher.address.city,
                        teacher.address.state,
                        teacher.address.postalCode,
                        teacher.address.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                )}
              </div>

              {/* Academic Allocations Table */}
              <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-500" />
                      <span>Assigned Classes & Subjects</span>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Official teaching allocations managed by school administration
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-surface-2 border border-border text-foreground">
                    {assignments.length} {assignments.length === 1 ? "Allocation" : "Allocations"}
                  </span>
                </div>

                {assignments.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                    No active class allocations currently found for your account.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-border">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-surface-2/60 border-b border-border text-muted-foreground font-semibold">
                          <th className="p-3 pl-4">Class & Section</th>
                          <th className="p-3">Assigned Subject</th>
                          <th className="p-3">Assignment Role</th>
                          <th className="p-3">Class Teacher</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border font-medium">
                        {assignments.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-surface-2/40 transition">
                            <td className="p-3 pl-4 font-bold text-foreground">
                              {item.className} - {item.sectionName}
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {item.subjectName ? (
                                <span className="inline-flex items-center gap-1.5 text-foreground font-semibold">
                                  <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                                  <span>{item.subjectName}</span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground italic">All Subjects / General</span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-2 border border-border capitalize">
                                {item.assignmentType?.replace("_", " ").toLowerCase()}
                              </span>
                            </td>
                            <td className="p-3">
                              {item.isClassTeacher ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                  Yes (Class Teacher)
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-[11px]">—</span>
                              )}
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

          {/* TAB 2: Edit Contact & Profile */}
          {activeTab === "edit" && (
            <form onSubmit={handleProfileSave} className="space-y-6">
              <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs space-y-6">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-primary" />
                    <span>Edit Profile & Contact Details</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Update your editable contact details, address, and qualification credentials
                  </p>
                </div>

                {saveSuccessMessage && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{saveSuccessMessage}</span>
                  </div>
                )}

                {saveErrorMessage && (
                  <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{saveErrorMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-foreground">
                      Primary Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. +91 9876543210"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Alternate Phone */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-foreground">
                      Alternate Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.alternatePhone}
                      onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                      placeholder="Optional alternate phone"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Qualification */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-foreground">
                      Highest Qualification
                    </label>
                    <input
                      type="text"
                      value={formData.qualification}
                      onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                      placeholder="e.g. M.Sc. Mathematics, B.Ed."
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-foreground">
                      Gender
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-foreground">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Photo URL */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-foreground">
                      Avatar / Photo URL
                    </label>
                    <input
                      type="url"
                      value={formData.photo}
                      onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                      placeholder="https://example.com/avatar.jpg"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Residential Address Fields */}
                <div className="pt-4 border-t border-border space-y-4">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">
                    Residential Address
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="block text-xs text-muted-foreground">Street Address</label>
                      <input
                        type="text"
                        value={formData.street}
                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                        placeholder="House no., street name"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs text-muted-foreground">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="City"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs text-muted-foreground">State</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="State"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs text-muted-foreground">Postal Code / PIN</label>
                      <input
                        type="text"
                        value={formData.postalCode}
                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                        placeholder="Postal Code"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs text-muted-foreground">Country</label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        placeholder="Country"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold shadow-md flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? "Saving Changes..." : "Save Profile"}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 3: Security & Password */}
          {activeTab === "security" && (
            <form onSubmit={handlePasswordChange} className="space-y-6 max-w-xl">
              <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs space-y-5">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-primary" />
                    <span>Change Account Password</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Update your account password with a strong, secure passphrase
                  </p>
                </div>

                {passSuccessMessage && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{passSuccessMessage}</span>
                  </div>
                )}

                {passErrorMessage && (
                  <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{passErrorMessage}</span>
                  </div>
                )}

                {/* Current Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-foreground">
                    Current Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showCurrentPass ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      required
                      className="w-full pl-10 pr-11 py-2.5 text-xs rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-foreground">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showNewPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      required
                      className="w-full pl-10 pr-11 py-2.5 text-xs rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Checklist */}
                  {newPassword.length > 0 && (
                    <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground pt-1">
                      <span className={passwordCriteria.hasMinLength ? "text-emerald-500 font-bold" : ""}>
                        • 8+ characters
                      </span>
                      <span className={passwordCriteria.hasNumber ? "text-emerald-500 font-bold" : ""}>
                        • Includes number
                      </span>
                      <span className={passwordCriteria.hasUpper && passwordCriteria.hasLower ? "text-emerald-500 font-bold" : ""}>
                        • Upper & lower case
                      </span>
                      <span className={passwordCriteria.hasSpecial ? "text-emerald-500 font-bold" : ""}>
                        • Special symbol
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-foreground">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPass ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      required
                      className="w-full pl-10 pr-11 py-2.5 text-xs rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={!isPassFormValid || isChangingPass}
                    className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                  >
                    {isChangingPass ? "Updating Password..." : "Update Password"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
