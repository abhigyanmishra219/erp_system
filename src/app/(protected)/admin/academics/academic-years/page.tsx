"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Plus,
  Edit2,
  CheckCircle2,
  RotateCw,
  AlertCircle,
  Clock,
  ArrowLeft,
  CalendarCheck,
  Building2,
  BookOpen,
} from "lucide-react";

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
}

export default function AcademicYearsPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    status: "INACTIVE" as "ACTIVE" | "INACTIVE",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchAcademicYears = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/academic-years");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to fetch academic years");
      }
      setAcademicYears(json.data.academicYears || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading academic years");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const openCreateModal = () => {
    setEditingYear(null);
    setFormData({
      name: "",
      startDate: "",
      endDate: "",
      status: "INACTIVE",
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (year: AcademicYear) => {
    setEditingYear(year);
    setFormData({
      name: year.name,
      startDate: year.startDate ? new Date(year.startDate).toISOString().split("T")[0] : "",
      endDate: year.endDate ? new Date(year.endDate).toISOString().split("T")[0] : "",
      status: year.status,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setFormError("Start date must be earlier than end date.");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingYear
        ? `/api/admin/academic-years/${editingYear.id}`
        : "/api/admin/academic-years";
      const method = editingYear ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to save academic year");
      }

      setSuccessMsg(
        editingYear
          ? `Academic year '${formData.name}' updated successfully.`
          : `Academic year '${formData.name}' created successfully.`
      );
      setIsModalOpen(false);
      fetchAcademicYears();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async (year: AcademicYear) => {
    if (year.status === "ACTIVE") return;
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/admin/academic-years/${year.id}/activate`, {
        method: "PATCH",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to activate academic year");
      }

      setSuccessMsg(`Academic year '${year.name}' is now ACTIVE.`);
      fetchAcademicYears();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error activating academic year");
    }
  };

  const activeYear = academicYears.find((ay) => ay.status === "ACTIVE");

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/admin" className="hover:text-foreground transition-colors">
              School Dashboard
            </Link>
            <span>/</span>
            <span>Academics</span>
            <span>/</span>
            <span className="text-foreground font-semibold">Academic Years</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-primary" />
            <span>Academic Year Management</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define your institution&apos;s academic calendar periods and designate the active session.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAcademicYears()}
            className="p-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-foreground transition-all cursor-pointer shadow-xs"
            title="Refresh"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? "animate-spin text-primary" : ""}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Academic Year</span>
          </button>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-muted-foreground hover:text-foreground text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-muted-foreground hover:text-foreground text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border space-y-1 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Current Active Session
          </span>
          <span className="text-xl font-extrabold text-foreground block">
            {activeYear ? activeYear.name : "Not Configured"}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {activeYear
              ? `${new Date(activeYear.startDate).toLocaleDateString()} — ${new Date(
                  activeYear.endDate
                ).toLocaleDateString()}`
              : "Set an academic year as active"}
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border space-y-1 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Total Academic Sessions
          </span>
          <span className="text-xl font-extrabold text-foreground block">
            {academicYears.length}
          </span>
          <span className="text-[10px] text-muted-foreground">Archived & active calendars</span>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border space-y-1 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Quick Navigation
          </span>
          <div className="flex items-center gap-2 pt-1">
            <Link
              href="/admin/academics/classes"
              className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Classes</span>
            </Link>
            <span className="text-muted-foreground text-xs">•</span>
            <Link
              href="/admin/academics/subjects"
              className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Subjects</span>
            </Link>
          </div>
          <span className="text-[10px] text-muted-foreground">Manage classes & curriculum</span>
        </div>
      </div>

      {/* Academic Years List */}
      <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-primary" />
            <span>Configured Academic Sessions ({academicYears.length})</span>
          </h2>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <RotateCw className="w-6 h-6 animate-spin text-primary mx-auto" />
            <p className="text-xs">Loading academic years...</p>
          </div>
        ) : academicYears.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <Calendar className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <h3 className="font-bold text-sm text-foreground">No Academic Years Defined</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Create your first academic year (e.g. 2026–27) to begin setting up classes, sections, and subjects.
            </p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Academic Year</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
                  <th className="py-3 px-4">Academic Year</th>
                  <th className="py-3 px-4">Start Date</th>
                  <th className="py-3 px-4">End Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {academicYears.map((ay) => (
                  <tr key={ay.id} className="hover:bg-surface-2 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm">{ay.name}</span>
                        {ay.status === "ACTIVE" && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                            Active Session
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-foreground">
                      {new Date(ay.startDate).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-foreground">
                      {new Date(ay.endDate).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          ay.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-surface-3 text-muted-foreground border border-border"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            ay.status === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
                          }`}
                        />
                        <span>{ay.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {ay.status !== "ACTIVE" && (
                          <button
                            onClick={() => handleActivate(ay)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold text-[11px] transition-all cursor-pointer"
                          >
                            Set Active
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(ay)}
                          className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border text-foreground transition-all cursor-pointer"
                          title="Edit Dates & Name"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-primary" />
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

      {/* Modal: Create / Edit Academic Year */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-card border border-border shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>{editingYear ? "Edit Academic Year" : "Create Academic Year"}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Academic Year Name</label>
                <input
                  type="text"
                  placeholder="e.g. 2026-27 or 2026-2027"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-2 border border-border flex items-center justify-between">
                <div>
                  <span className="font-semibold text-foreground block">Active Status</span>
                  <span className="text-[10px] text-muted-foreground">
                    Designate this session as the current operational academic year.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.status === "ACTIVE"}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.checked ? "ACTIVE" : "INACTIVE" })
                  }
                  className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-foreground font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingYear ? "Save Changes" : "Create Session"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
