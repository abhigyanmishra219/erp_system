"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  ArrowLeft,
  Key,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  Briefcase,
  Mail,
  Phone,
  Building2,
  Calendar,
  Save,
} from "lucide-react";

interface CredentialsInfo {
  email: string;
  temporaryPassword: string;
  role: string;
  name: string;
}

export default function CreateTeacherPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    teacherId: "",
    employeeId: "",
    gender: "MALE" as "MALE" | "FEMALE" | "OTHER",
    dateOfBirth: "",
    photo: "",
    department: "",
    designation: "Teacher",
    qualification: "",
    joiningDate: new Date().toISOString().split("T")[0],
    email: "",
    phone: "",
    alternatePhone: "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",

    // Portal login option
    createAccount: false,
    loginEmail: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Validation States
  const [emailValidation, setEmailValidation] = useState<{ checking: boolean; error: string | null }>({
    checking: false,
    error: null,
  });
  const [teacherIdValidation, setTeacherIdValidation] = useState<{ checking: boolean; error: string | null }>({
    checking: false,
    error: null,
  });
  const [employeeIdValidation, setEmployeeIdValidation] = useState<{ checking: boolean; error: string | null }>({
    checking: false,
    error: null,
  });

  // Credentials Modal
  const [createdCredentials, setCreatedCredentials] = useState<CredentialsInfo | null>(null);
  const [copied, setCopied] = useState(false);

  // Real-time checks
  const checkEmail = async (email: string) => {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailValidation({ checking: false, error: null });
      return;
    }
    setEmailValidation({ checking: true, error: null });
    try {
      const res = await fetch(`/api/admin/teachers/check-email?email=${encodeURIComponent(trimmed)}`);
      const json = await res.json();
      if (json.success && !json.available) {
        setEmailValidation({
          checking: false,
          error: json.reason || "Email address is already used by another teacher in this school.",
        });
      } else {
        setEmailValidation({ checking: false, error: null });
      }
    } catch {
      setEmailValidation({ checking: false, error: null });
    }
  };

  const checkTeacherId = async (idVal: string) => {
    const trimmed = idVal.trim();
    if (!trimmed) {
      setTeacherIdValidation({ checking: false, error: null });
      return;
    }
    setTeacherIdValidation({ checking: true, error: null });
    try {
      const res = await fetch(`/api/admin/teachers/check-ids?teacherId=${encodeURIComponent(trimmed)}`);
      const json = await res.json();
      if (json.success && json.data?.teacherIdAvailable === false) {
        setTeacherIdValidation({
          checking: false,
          error: json.data.teacherIdReason || "Teacher ID is already in use.",
        });
      } else {
        setTeacherIdValidation({ checking: false, error: null });
      }
    } catch {
      setTeacherIdValidation({ checking: false, error: null });
    }
  };

  const checkEmployeeId = async (idVal: string) => {
    const trimmed = idVal.trim();
    if (!trimmed) {
      setEmployeeIdValidation({ checking: false, error: null });
      return;
    }
    setEmployeeIdValidation({ checking: true, error: null });
    try {
      const res = await fetch(`/api/admin/teachers/check-ids?employeeId=${encodeURIComponent(trimmed)}`);
      const json = await res.json();
      if (json.success && json.data?.employeeIdAvailable === false) {
        setEmployeeIdValidation({
          checking: false,
          error: json.data.employeeIdReason || "Employee ID is already in use.",
        });
      } else {
        setEmployeeIdValidation({ checking: false, error: null });
      }
    } catch {
      setEmployeeIdValidation({ checking: false, error: null });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim() || undefined,
        lastName: formData.lastName.trim(),
        teacherId: formData.teacherId.trim(),
        employeeId: formData.employeeId.trim() || undefined,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth || undefined,
        photo: formData.photo.trim() || undefined,
        department: formData.department.trim() || undefined,
        designation: formData.designation.trim() || undefined,
        qualification: formData.qualification.trim() || undefined,
        joiningDate: formData.joiningDate || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        alternatePhone: formData.alternatePhone.trim() || undefined,
        address: {
          street: formData.street.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          postalCode: formData.postalCode.trim(),
          country: formData.country.trim() || "India",
        },
        createLoginAccount: formData.createAccount,
        loginEmail: formData.loginEmail.trim() || formData.email.trim() || undefined,
      };

      const res = await fetch("/api/admin/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to create teacher.");
      }

      const creds = json.data?.credentials;
      if (creds) {
        setCreatedCredentials(creds);
      } else {
        router.push("/admin/teachers");
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/teachers"
            className="p-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Add New Teacher</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Register a teacher profile, qualifications, department, and portal credentials.
            </p>
          </div>
        </div>
      </div>

      {formError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Basic Demographics */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2 border-b border-border pb-3">
            <GraduationCap className="w-4 h-4 text-indigo-500" />
            Basic Personal Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Middle Name</label>
              <input
                type="text"
                placeholder="Optional"
                value={formData.middleName}
                onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sharma"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Teacher ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. TCH-001"
                value={formData.teacherId}
                onChange={(e) => {
                  setFormData({ ...formData, teacherId: e.target.value });
                  if (teacherIdValidation.error) setTeacherIdValidation({ checking: false, error: null });
                }}
                onBlur={(e) => checkTeacherId(e.target.value)}
                className={`w-full px-3 py-2 bg-background border ${
                  teacherIdValidation.error ? "border-rose-500 ring-1 ring-rose-500" : "border-border"
                } rounded-lg text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              />
              {teacherIdValidation.error && (
                <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {teacherIdValidation.error}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Employee ID (Optional)</label>
              <input
                type="text"
                placeholder="e.g. EMP-2026-10"
                value={formData.employeeId}
                onChange={(e) => {
                  setFormData({ ...formData, employeeId: e.target.value });
                  if (employeeIdValidation.error) setEmployeeIdValidation({ checking: false, error: null });
                }}
                onBlur={(e) => checkEmployeeId(e.target.value)}
                className={`w-full px-3 py-2 bg-background border ${
                  employeeIdValidation.error ? "border-rose-500 ring-1 ring-rose-500" : "border-border"
                } rounded-lg text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              />
              {employeeIdValidation.error && (
                <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {employeeIdValidation.error}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Gender <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.gender}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    gender: e.target.value as "MALE" | "FEMALE" | "OTHER",
                  })
                }
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Date of Birth</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* 2. Professional Details */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2 border-b border-border pb-3">
            <Briefcase className="w-4 h-4 text-indigo-500" />
            Professional Background & Role
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Department</label>
              <input
                type="text"
                placeholder="e.g. Science, Mathematics, Languages"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Designation</label>
              <input
                type="text"
                placeholder="e.g. Senior Teacher, Head of Department"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Educational Qualification</label>
              <input
                type="text"
                placeholder="e.g. B.Ed, M.Sc in Physics"
                value={formData.qualification}
                onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Joining Date</label>
              <input
                type="date"
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* 3. Contact & Address */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2 border-b border-border pb-3">
            <Mail className="w-4 h-4 text-indigo-500" />
            Contact & Residential Address
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="teacher@school.edu"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (emailValidation.error) setEmailValidation({ checking: false, error: null });
                }}
                onBlur={(e) => checkEmail(e.target.value)}
                className={`w-full px-3 py-2 bg-background border ${
                  emailValidation.error ? "border-rose-500 ring-1 ring-rose-500" : "border-border"
                } rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500`}
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
              <label className="block text-xs font-semibold text-foreground mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">Street Address</label>
              <input
                type="text"
                placeholder="Apartment, Street address"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">City</label>
              <input
                type="text"
                placeholder="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">State</label>
              <input
                type="text"
                placeholder="State"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* 4. Teacher Portal Login Account Option */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="createAccount"
              checked={formData.createAccount}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  createAccount: e.target.checked,
                  loginEmail: e.target.checked && !formData.loginEmail ? formData.email : formData.loginEmail,
                })
              }
              className="mt-1 w-4 h-4 text-indigo-600 rounded border-border focus:ring-indigo-500"
            />
            <div>
              <label htmlFor="createAccount" className="font-semibold text-sm text-foreground cursor-pointer">
                Create Teacher Portal Login Account (TEACHER Role)
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enables teacher portal authentication. Generates a secure temporary password that will be displayed upon submission.
              </p>
            </div>
          </div>

          {formData.createAccount && (
            <div className="pt-2 pl-7 max-w-md">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Portal Login Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required={formData.createAccount}
                placeholder="teacher.portal@school.edu"
                value={formData.loginEmail}
                onChange={(e) => setFormData({ ...formData, loginEmail: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Link
            href="/admin/teachers"
            className="px-5 py-2.5 rounded-lg border border-border text-foreground hover:bg-muted text-xs font-semibold transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? "Enrolling Teacher..." : "Save Teacher Profile"}
          </button>
        </div>
      </form>

      {/* Modal: Credentials Generated */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-8 h-8 flex-shrink-0" />
              <div>
                <h3 className="text-base font-bold text-foreground">Teacher Account Provisioned!</h3>
                <p className="text-xs text-muted-foreground">
                  The portal login credentials have been generated.
                </p>
              </div>
            </div>

            <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-2 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Teacher Name</span>
                <span className="font-bold text-foreground">{createdCredentials.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Role</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {createdCredentials.role}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Login Email</span>
                <span className="font-mono font-bold text-foreground">{createdCredentials.email}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Temporary Password</span>
                <span className="font-mono font-bold text-foreground bg-background px-2 py-1 rounded border border-border block text-sm select-all mt-0.5">
                  {createdCredentials.temporaryPassword}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed">
              Important: Copy these credentials now. The temporary password will not be shown again.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Email: ${createdCredentials.email}\nTemporary Password: ${createdCredentials.temporaryPassword}`
                  );
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex-1 py-2 px-3 border border-border rounded-lg text-xs font-semibold text-foreground hover:bg-muted flex items-center justify-center gap-1.5"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied to Clipboard" : "Copy Credentials"}
              </button>
              <button
                onClick={() => router.push("/admin/teachers")}
                className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
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
