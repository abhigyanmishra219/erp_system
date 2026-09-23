"use client";

import React, { useEffect, useState } from "react";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Heart,
  Shield,
  Key,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  GraduationCap,
  Users,
  Activity,
  Lock,
  Building,
  BadgeCheck,
} from "lucide-react";

interface ProfileData {
  user: {
    _id: string;
    email: string;
    role: string;
    status: string;
  };
  student: {
    _id: string;
    studentId: string;
    admissionNumber: string;
    rollNumber: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    gender: string;
    bloodGroup: string;
    avatarUrl: string;
    admissionDate: string;
    status: string;
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    emergencyContact: {
      name: string;
      relationship: string;
      phone: string;
    };
    medicalInfo: {
      allergies: string[];
      conditions: string[];
      medications: string[];
      notes: string;
    };
  };
  academic: {
    class: {
      _id: string;
      name: string;
      code: string;
      grade: string;
    };
    section: {
      _id: string;
      name: string;
    };
    academicYear: {
      _id: string;
      name: string;
      status: string;
    };
  };
  parents: Array<{
    _id: string;
    relationship: string;
    isPrimaryGuardian: boolean;
    isEmergencyContact: boolean;
    canPickup: boolean;
    notes: string;
    parent: {
      _id: string;
      firstName: string;
      lastName: string;
      fullName: string;
      email: string;
      phone: string;
      occupation: string;
    } | null;
  }>;
  school: {
    _id: string;
    name: string;
    code: string;
    logo: string;
    address: string;
    phone: string;
    email: string;
  };
}

export default function StudentProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    phone: "",
    bloodGroup: "",
    avatarUrl: "",
    dateOfBirth: "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    emergencyName: "",
    emergencyRelationship: "",
    emergencyPhone: "",
    allergies: "",
    conditions: "",
    medications: "",
    medicalNotes: "",
  });

  // Password State
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/student/profile");
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || "Failed to load profile");
      }
      setData(result.data);

      const st = result.data.student;
      setFormData({
        phone: st.phone || "",
        bloodGroup: st.bloodGroup || "",
        avatarUrl: st.avatarUrl || "",
        dateOfBirth: st.dateOfBirth ? new Date(st.dateOfBirth).toISOString().split("T")[0] : "",
        street: st.address?.street || "",
        city: st.address?.city || "",
        state: st.address?.state || "",
        postalCode: st.address?.postalCode || "",
        country: st.address?.country || "",
        emergencyName: st.emergencyContact?.name || "",
        emergencyRelationship: st.emergencyContact?.relationship || "",
        emergencyPhone: st.emergencyContact?.phone || "",
        allergies: (st.medicalInfo?.allergies || []).join(", "),
        conditions: (st.medicalInfo?.conditions || []).join(", "),
        medications: (st.medicalInfo?.medications || []).join(", "),
        medicalNotes: st.medicalInfo?.notes || "",
      });
    } catch (err: any) {
      console.error("Error fetching profile:", err);
      setError(err.message || "Network error loading profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const payload = {
        phone: formData.phone,
        bloodGroup: formData.bloodGroup,
        avatarUrl: formData.avatarUrl,
        dateOfBirth: formData.dateOfBirth || null,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
          country: formData.country,
        },
        emergencyContact: {
          name: formData.emergencyName,
          relationship: formData.emergencyRelationship,
          phone: formData.emergencyPhone,
        },
        medicalInfo: {
          allergies: formData.allergies ? formData.allergies.split(",").map((s) => s.trim()).filter(Boolean) : [],
          conditions: formData.conditions ? formData.conditions.split(",").map((s) => s.trim()).filter(Boolean) : [],
          medications: formData.medications ? formData.medications.split(",").map((s) => s.trim()).filter(Boolean) : [],
          notes: formData.medicalNotes,
        },
      };

      const res = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || "Failed to update profile");
      }

      setSuccessMessage("Profile updated successfully!");
      fetchProfile();
    } catch (err: any) {
      console.error("Profile update failed:", err);
      setError(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setPasswordSaving(true);
      setPasswordError(null);
      setPasswordSuccess(null);

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error("New password and confirm password do not match");
      }

      if (passwordData.newPassword.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }

      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || "Failed to change password");
      }

      setPasswordSuccess("Password changed successfully!");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      console.error("Password change failed:", err);
      setPasswordError(err.message || "Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-sm text-muted-foreground font-medium">Loading profile information...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto bg-card rounded-2xl border border-destructive/30 shadow-lg mt-8">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">Unable to load profile</h2>
        <p className="text-sm text-muted-foreground mb-6">{error}</p>
        <button
          onClick={fetchProfile}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { student, academic, parents, school } = data;

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 p-6 md:p-8 border border-emerald-500/20 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            {student.avatarUrl ? (
              <img
                src={student.avatarUrl}
                alt={student.fullName}
                className="w-20 h-20 rounded-2xl object-cover ring-2 ring-emerald-500/40 shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white text-2xl font-bold ring-2 ring-emerald-500/40 shadow-lg">
                {student.firstName[0]}
                {student.lastName[0]}
              </div>
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{student.fullName}</h1>
                <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {student.status}
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1">
                Class {academic.class.name} - {academic.section.name} • Roll No: {student.rollNumber || "N/A"} • Admission: {student.admissionNumber}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Academic Information (Read-only Admin badges) */}
      <div className="p-6 rounded-3xl bg-card border border-border shadow-xs">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Academic Placement</h2>
            <p className="text-xs text-muted-foreground">Institutional records managed by School Administration</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-background border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Admission Number</span>
            <span className="text-sm font-bold text-foreground">{student.admissionNumber}</span>
          </div>
          <div className="p-4 rounded-2xl bg-background border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Student ID</span>
            <span className="text-sm font-bold text-foreground">{student.studentId || "N/A"}</span>
          </div>
          <div className="p-4 rounded-2xl bg-background border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Class & Section</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              Class {academic.class.name} - {academic.section.name}
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-background border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Roll Number</span>
            <span className="text-sm font-bold text-foreground">{student.rollNumber || "N/A"}</span>
          </div>
          <div className="p-4 rounded-2xl bg-background border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Academic Year</span>
            <span className="text-sm font-bold text-foreground">{academic.academicYear.name}</span>
          </div>
          <div className="p-4 rounded-2xl bg-background border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Gender</span>
            <span className="text-sm font-bold text-foreground">{student.gender}</span>
          </div>
          <div className="p-4 rounded-2xl bg-background border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Admission Date</span>
            <span className="text-sm font-bold text-foreground">
              {new Date(student.admissionDate).toLocaleDateString()}
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-background border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Institution</span>
            <span className="text-sm font-bold text-foreground">{school.name}</span>
          </div>
        </div>
      </div>

      {/* 3. Editable Personal & Contact Information Form */}
      <form onSubmit={handleProfileSubmit} className="space-y-8">
        <div className="p-6 rounded-3xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Personal Information</h2>
                <p className="text-xs text-muted-foreground">Update your allowed personal & contact details</p>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Date of Birth</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Blood Group</label>
              <input
                type="text"
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                placeholder="e.g. O+, A+, B-"
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition placeholder:text-muted-foreground"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-foreground mb-2">Avatar URL</label>
              <input
                type="text"
                value={formData.avatarUrl}
                onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                placeholder="https://example.com/photo.jpg"
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Address */}
          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Residential Address
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Street Address</label>
                <input
                  type="text"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  placeholder="123 Academic Way, Apt 4B"
                  className="w-full px-4 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                  className="w-full px-4 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">State / Province</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="State"
                  className="w-full px-4 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Postal Code</label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="Postal Code"
                  className="w-full px-4 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              Emergency Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Contact Name</label>
                <input
                  type="text"
                  value={formData.emergencyName}
                  onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                  placeholder="Guardian Name"
                  className="w-full px-4 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Relationship</label>
                <input
                  type="text"
                  value={formData.emergencyRelationship}
                  onChange={(e) => setFormData({ ...formData, emergencyRelationship: e.target.value })}
                  placeholder="Mother / Father / Guardian"
                  className="w-full px-4 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Phone Number</label>
                <input
                  type="text"
                  value={formData.emergencyPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-4 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>

          {/* Medical Info */}
          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Medical Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Allergies (comma separated)</label>
                <input
                  type="text"
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  placeholder="Peanuts, Penicillin"
                  className="w-full px-4 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Conditions</label>
                <input
                  type="text"
                  value={formData.conditions}
                  onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
                  placeholder="Asthma"
                  className="w-full px-4 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Medications</label>
                <input
                  type="text"
                  value={formData.medications}
                  onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                  placeholder="Inhaler"
                  className="w-full px-4 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Medical Notes</label>
                <textarea
                  rows={2}
                  value={formData.medicalNotes}
                  onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                  placeholder="Any special medical care or dietary instructions..."
                  className="w-full px-4 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* 4. Linked Parents / Guardians */}
      <div className="p-6 rounded-3xl bg-card border border-border shadow-xs">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Linked Parents & Guardians</h2>
            <p className="text-xs text-muted-foreground">Authorized guardians registered with the school</p>
          </div>
        </div>

        {parents.length === 0 ? (
          <div className="py-8 text-center rounded-2xl bg-muted/30 border border-dashed border-border">
            <Users className="w-6 h-6 text-muted-foreground mx-auto mb-1.5" />
            <p className="text-xs font-medium text-muted-foreground">No parent records linked.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {parents.map((p) => (
              <div
                key={p._id}
                className="p-5 rounded-2xl bg-background border border-border flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-bold text-foreground text-base">
                      {p.parent ? p.parent.fullName : "Guardian"}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      {p.relationship}
                    </span>
                  </div>
                  {p.parent && (
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {p.parent.phone && <p>Phone: {p.parent.phone}</p>}
                      {p.parent.email && <p>Email: {p.parent.email}</p>}
                      {p.parent.occupation && <p>Occupation: {p.parent.occupation}</p>}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border text-[11px]">
                  {p.isPrimaryGuardian && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Primary Guardian
                    </span>
                  )}
                  {p.isEmergencyContact && (
                    <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                      Emergency Contact
                    </span>
                  )}
                  {p.canPickup && (
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      Authorized Pickup
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Account Security / Password Change */}
      <div className="p-6 rounded-3xl bg-card border border-border shadow-xs">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Account Security</h2>
            <p className="text-xs text-muted-foreground">Change your portal password</p>
          </div>
        </div>

        {passwordSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-3 mb-6">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}
        {passwordError && (
          <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-3 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Current Password</label>
            <input
              type="password"
              required
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Confirm New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <button
            type="submit"
            disabled={passwordSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition shadow-xs disabled:opacity-50 mt-2 cursor-pointer"
          >
            {passwordSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
