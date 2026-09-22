"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  Layers,
  GraduationCap,
  Building2,
} from "lucide-react";

interface SubjectItem {
  id: string;
  name: string;
  code: string;
  description: string;
  subjectType: "CORE" | "ELECTIVE";
  assignedClassesCount: number;
  isActive: boolean;
  createdAt: string;
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal: Add / Edit Subject
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    subjectType: "CORE" as "CORE" | "ELECTIVE",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchSubjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/subjects");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to fetch subjects");
      }
      setSubjects(json.data.subjects || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading subjects catalog");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const openAddModal = () => {
    setEditingSubject(null);
    setFormData({
      name: "",
      code: "",
      description: "",
      subjectType: "CORE",
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (s: SubjectItem) => {
    setEditingSubject(s);
    setFormData({
      name: s.name,
      code: s.code,
      description: s.description || "",
      subjectType: s.subjectType,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);

    try {
      const url = editingSubject ? `/api/admin/subjects/${editingSubject.id}` : "/api/admin/subjects";
      const method = editingSubject ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to save subject");
      }

      setSuccessMsg(
        editingSubject
          ? `Subject '${formData.name}' updated successfully.`
          : `Subject '${formData.name}' added to catalog successfully.`
      );
      setIsModalOpen(false);
      fetchSubjects();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Error saving subject");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (s: SubjectItem) => {
    const confirm = window.confirm(
      `Are you sure you want to deactivate subject '${s.name}' (${s.code})? It will be unlinked from active classes.`
    );
    if (!confirm) return;

    try {
      const res = await fetch(`/api/admin/subjects/${s.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to deactivate subject");
      }
      setSuccessMsg(`Subject '${s.name}' deactivated successfully.`);
      fetchSubjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deactivating subject");
    }
  };

  const coreCount = subjects.filter((s) => s.subjectType === "CORE").length;
  const electiveCount = subjects.filter((s) => s.subjectType === "ELECTIVE").length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/admin" className="hover:text-foreground transition-colors">
              School Dashboard
            </Link>
            <span>/</span>
            <span>Academics</span>
            <span>/</span>
            <span className="text-foreground font-semibold">Subjects & Curriculum</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-primary" />
            <span>Subject Catalog & Curriculum</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your school&apos;s master catalog of core and elective subjects.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchSubjects()}
            className="p-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-foreground transition-all cursor-pointer shadow-xs"
            title="Refresh"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? "animate-spin text-primary" : ""}`} />
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subject</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-muted-foreground hover:text-foreground text-xs font-bold">
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
          <button onClick={() => setError(null)} className="text-muted-foreground hover:text-foreground text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border space-y-1 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Total Subjects in Catalog
          </span>
          <span className="text-xl font-extrabold text-foreground block">{subjects.length}</span>
          <span className="text-[10px] text-muted-foreground">Master curriculum offerings</span>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border space-y-1 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Core Subjects
          </span>
          <span className="text-xl font-extrabold text-foreground block">{coreCount}</span>
          <span className="text-[10px] text-muted-foreground">Mandatory syllabus courses</span>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border space-y-1 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Elective Offerings
          </span>
          <span className="text-xl font-extrabold text-foreground block">{electiveCount}</span>
          <span className="text-[10px] text-muted-foreground">Optional student subjects</span>
        </div>
      </div>

      {/* Subjects Directory Table */}
      <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span>Catalog Directory ({subjects.length})</span>
          </h2>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <RotateCw className="w-6 h-6 animate-spin text-primary mx-auto" />
            <p className="text-xs">Loading subjects catalog...</p>
          </div>
        ) : subjects.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <h3 className="font-bold text-sm text-foreground">No Subjects Configured</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Add curriculum subjects (e.g. Mathematics, English, Physics) to enable grade-level assignments.
            </p>
            <button
              onClick={openAddModal}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Subject</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
                  <th className="py-3 px-4">Subject Name</th>
                  <th className="py-3 px-4">Subject Code</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Assigned Classes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {subjects.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-2 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-foreground text-sm">
                      {s.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-2 border border-border text-foreground font-bold">
                        {s.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                          s.subjectType === "CORE"
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                        }`}
                      >
                        {s.subjectType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground text-[11px] max-w-xs truncate">
                      {s.description || "—"}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-primary" />
                        <span>{s.assignedClassesCount} {s.assignedClassesCount === 1 ? "Class" : "Classes"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(s)}
                          className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border text-foreground transition-all cursor-pointer"
                          title="Edit Subject"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-primary" />
                        </button>
                        <button
                          onClick={() => handleDeactivate(s)}
                          className="p-1.5 rounded-lg bg-surface-2 hover:bg-destructive/10 border border-border text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                          title="Deactivate Subject"
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

      {/* Modal: Add / Edit Subject */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-card border border-border shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span>{editingSubject ? "Edit Subject" : "Add New Subject"}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Subject Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics, Science, English Literature"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Subject Code</label>
                  <input
                    type="text"
                    placeholder="e.g. MATH, SCI, ENG"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    required
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Subject Type</label>
                  <select
                    value={formData.subjectType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        subjectType: e.target.value as "CORE" | "ELECTIVE",
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary font-medium"
                  >
                    <option value="CORE">CORE (Mandatory)</option>
                    <option value="ELECTIVE">ELECTIVE (Optional)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Description (Optional)</label>
                <textarea
                  placeholder="Brief overview of curriculum or syllabus scope..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-xl bg-input border border-input-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
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
                  <span>{editingSubject ? "Save Changes" : "Create Subject"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
