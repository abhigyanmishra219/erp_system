"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";

interface AcademicYearOpt {
  id: string;
  name: string;
  status: string;
}

interface ClassOpt {
  id: string;
  name: string;
  sections?: { id: string; name: string }[];
}

interface CredentialsInfo {
  email: string;
  temporaryPassword: string;
  role: string;
  name: string;
}

export default function CreateStudentPage() {
  const router = useRouter();

  // Dropdown data
  const [academicYears, setAcademicYears] = useState<AcademicYearOpt[]>([]);
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    // Student Personal
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
    avatarUrl: "",

    // Academic Placement
    academicYearId: "",
    classId: "",
    sectionId: "",
    admissionDate: new Date().toISOString().split("T")[0],

    // Address
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",

    // Emergency Contact
    emergencyName: "",
    emergencyRelation: "",
    emergencyPhone: "",

    // Medical Info
    allergies: "",
    medicalNotes: "",

    // Student Login Account
    createStudentAccount: false,
    studentLoginEmail: "",

    // Optional Parent Inline
    addParent: false,
    parentFirstName: "",
    parentLastName: "",
    parentEmail: "",
    parentPhone: "",
    parentRelationship: "FATHER" as "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER",
    parentOccupation: "",
    parentIsPrimary: true,
    createParentAccount: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
      const res = await fetch(`/api/admin/students/check-email?email=${encodeURIComponent(trimmed)}`);
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

  // Modal for temporary credentials
  const [createdCredentials, setCreatedCredentials] = useState<{
    student: CredentialsInfo | null;
    parent: CredentialsInfo | null;
  } | null>(null);
  const [copiedStudent, setCopiedStudent] = useState(false);
  const [copiedParent, setCopiedParent] = useState(false);

  // Load Academic Years and Classes
  useEffect(() => {
    async function loadMeta() {
      setIsLoadingMeta(true);
      try {
        const [ayRes, clRes] = await Promise.all([
          fetch("/api/admin/academic-years"),
          fetch("/api/admin/classes"),
        ]);
        const ayData = await ayRes.json();
        const clData = await clRes.json();

        if (ayData.success && ayData.data?.academicYears) {
          setAcademicYears(ayData.data.academicYears);
          // Auto-select active academic year
          const activeAy = ayData.data.academicYears.find(
            (ay: AcademicYearOpt) => ay.status === "ACTIVE"
          );
          if (activeAy) {
            setFormData((prev) => ({ ...prev, academicYearId: activeAy.id }));
          }
        }

        if (clData.success && clData.data?.classes) {
          setClasses(clData.data.classes);
        }
      } catch (err) {
        console.error("Failed to load metadata", err);
      } finally {
        setIsLoadingMeta(false);
      }
    }
    loadMeta();
  }, []);

  // Update sections when class selection changes
  const handleClassChange = async (selectedClassId: string) => {
    if (!selectedClassId) {
      setSections([]);
      setFormData((prev) => ({
        ...prev,
        classId: "",
        sectionId: "",
      }));
      return;
    }

    const selectedClass = classes.find((c) => c.id === selectedClassId);
    let classSections = selectedClass?.sections || [];

    if (!classSections || classSections.length === 0) {
      try {
        const res = await fetch(`/api/admin/sections?classId=${selectedClassId}`);
        const json = await res.json();
        if (json.success && json.data?.sections) {
          classSections = json.data.sections;
        }
      } catch (err) {
        console.error("Failed to load sections", err);
      }
    }

    setSections(classSections);
    setFormData((prev) => ({
      ...prev,
      classId: selectedClassId,
      sectionId: classSections.length > 0 ? classSections[0].id : "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setFormError("Student first and last name are required.");
      return;
    }
    if (!formData.admissionNumber.trim()) {
      setFormError("Admission number is required.");
      return;
    }
    if (!formData.dateOfBirth) {
      setFormError("Student date of birth is required.");
      return;
    }
    if (!formData.academicYearId || !formData.classId || !formData.sectionId) {
      setFormError("Please select Academic Year, Class, and Section.");
      return;
    }
    if (formData.createStudentAccount && !formData.studentLoginEmail && !formData.email) {
      setFormError("Student email is required to create a login account.");
      return;
    }
    if (formData.addParent) {
      if (!formData.parentFirstName.trim() || !formData.parentLastName.trim()) {
        setFormError("Parent first and last name are required.");
        return;
      }
      if (!formData.parentEmail.trim() || !formData.parentPhone.trim()) {
        setFormError("Parent email and phone number are required.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        admissionNumber: formData.admissionNumber.trim(),
        studentId: formData.studentId.trim() || undefined,
        rollNumber: formData.rollNumber.trim() || undefined,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup.trim() || undefined,
        avatarUrl: formData.avatarUrl.trim() || undefined,
        academicYearId: formData.academicYearId,
        classId: formData.classId,
        sectionId: formData.sectionId,
        admissionDate: formData.admissionDate,
        status: "ACTIVE",
        address: {
          street: formData.street.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          postalCode: formData.postalCode.trim(),
          country: formData.country.trim(),
        },
        emergencyContact: {
          name: formData.emergencyName.trim(),
          relationship: formData.emergencyRelation.trim(),
          phone: formData.emergencyPhone.trim(),
        },
        medicalInfo: {
          allergies: formData.allergies ? formData.allergies.split(",").map((s) => s.trim()) : [],
          notes: formData.medicalNotes.trim(),
        },
        createLoginAccount: formData.createStudentAccount,
        loginEmail: formData.studentLoginEmail.trim() || formData.email.trim() || undefined,
      };

      if (formData.addParent) {
        payload.parent = {
          firstName: formData.parentFirstName.trim(),
          lastName: formData.parentLastName.trim(),
          email: formData.parentEmail.trim(),
          phone: formData.parentPhone.trim(),
          relationship: formData.parentRelationship,
          occupation: formData.parentOccupation.trim(),
          isPrimaryGuardian: formData.parentIsPrimary,
          isEmergencyContact: true,
          createLoginAccount: formData.createParentAccount,
        };
      }

      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to create student.");
      }

      // Check if credentials were generated
      const creds = json.data?.credentials;
      if (creds && (creds.student || creds.parent)) {
        setCreatedCredentials({
          student: creds.student,
          parent: creds.parent,
        });
      } else {
        // Redirect directly to students directory
        router.push("/admin/students");
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, isParent = false) => {
    navigator.clipboard.writeText(text);
    if (isParent) {
      setCopiedParent(true);
      setTimeout(() => setCopiedParent(false), 2000);
    } else {
      setCopiedStudent(true);
      setTimeout(() => setCopiedStudent(false), 2000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/students"
            className="p-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Enroll New Student</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Register a student profile, assign to class/section, and configure portal accounts.
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

      {/* Main Enrollment Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Basic Student Information */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2 border-b border-border pb-3">
            <Users className="w-4 h-4 text-indigo-500" />
            Basic Personal Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
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
                Admission Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. ADM-2026-001"
                value={formData.admissionNumber}
                onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Date of Birth <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
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
              <label className="block text-xs font-semibold text-foreground mb-1">
                Blood Group
              </label>
              <select
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select blood group (optional)</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Student Email (Optional)
              </label>
              <input
                type="email"
                placeholder="student@school.edu"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (emailValidation.error) setEmailValidation({ checking: false, error: null });
                }}
                onBlur={(e) => checkStudentEmail(e.target.value)}
                className={`w-full px-3 py-2 bg-background border ${
                  emailValidation.error ? "border-rose-500 ring-1 ring-rose-500" : "border-border"
                } rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              />
              {emailValidation.checking && (
                <p className="text-[11px] text-muted-foreground mt-1">Checking email availability...</p>
              )}
              {emailValidation.error && (
                <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {emailValidation.error}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Student Phone (Optional)
              </label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Roll Number (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 101"
                value={formData.rollNumber}
                onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* 2. Academic Placement */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2 border-b border-border pb-3">
            <Building2 className="w-4 h-4 text-indigo-500" />
            Academic Placement
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Academic Year <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.academicYearId}
                onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Academic Year</option>
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.name} {ay.status === "ACTIVE" ? "(Current)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Class <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.classId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Section <span className="text-rose-500">*</span>
              </label>
              <select
                required
                disabled={!formData.classId || sections.length === 0}
                value={formData.sectionId}
                onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <option value="">Select Section</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    Section {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Admission Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.admissionDate}
                onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* 3. Address Details */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2 border-b border-border pb-3">
            <Building2 className="w-4 h-4 text-indigo-500" />
            Address & Residential Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-3">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Street Address
              </label>
              <input
                type="text"
                placeholder="Apartment, Street, House No."
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">City</label>
              <input
                type="text"
                placeholder="e.g. Mumbai"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">State</label>
              <input
                type="text"
                placeholder="e.g. Maharashtra"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Postal Code</label>
              <input
                type="text"
                placeholder="e.g. 400001"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* 4. Student Portal Login Account Option */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="createStudentAccount"
              checked={formData.createStudentAccount}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  createStudentAccount: e.target.checked,
                  studentLoginEmail: e.target.checked && !formData.studentLoginEmail ? formData.email : formData.studentLoginEmail,
                })
              }
              className="mt-1 w-4 h-4 text-indigo-600 rounded border-border focus:ring-indigo-500"
            />
            <div>
              <label htmlFor="createStudentAccount" className="font-semibold text-sm text-foreground cursor-pointer">
                Create Student Portal Login Account (STUDENT Role)
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Generates a secure temporary password and enables student portal access. Credentials will be displayed upon submission.
              </p>
            </div>
          </div>

          {formData.createStudentAccount && (
            <div className="pt-2 pl-7 max-w-md">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Login Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required={formData.createStudentAccount}
                placeholder="student.portal@school.edu"
                value={formData.studentLoginEmail}
                onChange={(e) => setFormData({ ...formData, studentLoginEmail: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>

        {/* 5. Parent / Guardian Section */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-start justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                Parent & Guardian Information
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Link or register a primary guardian now, or add parents later from the student profile.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.addParent}
                onChange={(e) => setFormData({ ...formData, addParent: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              <span className="ml-2 text-xs font-medium text-foreground">
                {formData.addParent ? "Included" : "Skip for now"}
              </span>
            </label>
          </div>

          {formData.addParent && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Parent First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required={formData.addParent}
                  placeholder="e.g. Ramesh"
                  value={formData.parentFirstName}
                  onChange={(e) => setFormData({ ...formData, parentFirstName: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Parent Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required={formData.addParent}
                  placeholder="e.g. Sharma"
                  value={formData.parentLastName}
                  onChange={(e) => setFormData({ ...formData, parentLastName: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Relationship <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.parentRelationship}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      parentRelationship: e.target.value as "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER",
                    })
                  }
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="FATHER">Father</option>
                  <option value="MOTHER">Mother</option>
                  <option value="GUARDIAN">Legal Guardian</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Parent Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required={formData.addParent}
                  placeholder="parent@example.com"
                  value={formData.parentEmail}
                  onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Parent Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required={formData.addParent}
                  placeholder="+91 98765 00000"
                  value={formData.parentPhone}
                  onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Occupation (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Engineer, Business"
                  value={formData.parentOccupation}
                  onChange={(e) => setFormData({ ...formData, parentOccupation: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="createParentAccount"
                    checked={formData.createParentAccount}
                    onChange={(e) => setFormData({ ...formData, createParentAccount: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-border focus:ring-indigo-500"
                  />
                  <label htmlFor="createParentAccount" className="text-xs font-medium text-foreground cursor-pointer">
                    Also create a Parent Portal Login Account (PARENT Role)
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/students"
            className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting || isLoadingMeta}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? "Enrolling Student..." : "Enroll Student"}
          </button>
        </div>
      </form>

      {/* Temporary Credentials Modal */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-7 h-7 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-foreground">Student Successfully Enrolled!</h3>
                <p className="text-xs text-muted-foreground">
                  Login accounts were created. Copy these temporary credentials now.
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 rounded-lg text-xs leading-relaxed">
              <strong>Security Notice:</strong> These temporary passwords are shown only once and cannot be retrieved again. Users will be required to change their password on first login.
            </div>

            {/* Student Creds */}
            {createdCredentials.student && (
              <div className="bg-muted/40 border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    Student Login (STUDENT)
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `Email: ${createdCredentials.student?.email}\nPassword: ${createdCredentials.student?.temporaryPassword}`
                      )
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {copiedStudent ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedStudent ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="text-xs space-y-1">
                  <div>
                    <span className="text-muted-foreground">Email: </span>
                    <span className="font-mono font-medium text-foreground">
                      {createdCredentials.student.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Temporary Password: </span>
                    <span className="font-mono font-bold text-foreground bg-background px-2 py-0.5 rounded border border-border">
                      {createdCredentials.student.temporaryPassword}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Parent Creds */}
            {createdCredentials.parent && (
              <div className="bg-muted/40 border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    Parent Login (PARENT)
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `Email: ${createdCredentials.parent?.email}\nPassword: ${createdCredentials.parent?.temporaryPassword}`,
                        true
                      )
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {copiedParent ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedParent ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="text-xs space-y-1">
                  <div>
                    <span className="text-muted-foreground">Email: </span>
                    <span className="font-mono font-medium text-foreground">
                      {createdCredentials.parent.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Temporary Password: </span>
                    <span className="font-mono font-bold text-foreground bg-background px-2 py-0.5 rounded border border-border">
                      {createdCredentials.parent.temporaryPassword}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => router.push("/admin/students")}
                className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
              >
                I have saved these credentials — Continue to Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
