"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  Layers,
  BookOpen,
  ArrowRight,
  Sparkles,
  Calendar,
} from "lucide-react";

interface AcademicYear {
  id: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
}

interface SchoolClass {
  id: string;
  name: string;
  code: string;
  displayOrder: number;
  academicYearId: string;
  academicYearName: string;
  sectionsCount: number;
  subjectsCount: number;
  isActive: boolean;
}

export default function ClassesPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal: Add/Edit Class
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [classForm, setClassForm] = useState({
    name: "",
    code: "",
    displayOrder: 0,
    academicYearId: "",
  });
  const [isSubmittingClass, setIsSubmittingClass] = useState(false);
  const [classModalError, setClassModalError] = useState<string | null>(null);

  // Modal: Quick Add Section
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [sectionTargetClass, setSectionTargetClass] = useState<SchoolClass | null>(null);
  const [sectionForm, setSectionForm] = useState({
    name: "A",
    code: "",
    capacity: 40,
  });
  const [isSubmittingSection, setIsSubmittingSection] = useState(false);
  const [sectionModalError, setSectionModalError] = useState<string | null>(null);

  // Fetch Academic Years first
  const fetchAcademicYears = async () => {
    try {
      const res = await fetch("/api/admin/academic-years");
      const json = await res.json();
      if (res.ok && json.success) {
        const years: AcademicYear[] = json.data.academicYears || [];
        setAcademicYears(years);
        const active = years.find((y) => y.status === "ACTIVE");
        if (active) {
          setSelectedYearId(active.id);
        } else if (years.length > 0) {
          setSelectedYearId(years[0].id);
        }
      }
    } catch {
      // ignore
    }
  };

  const fetchClasses = async (yearId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const query = yearId ? `?academicYearId=${yearId}` : "";
      const res = await fetch(`/api/admin/classes${query}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to fetch classes");
      }
      setClasses(json.data.classes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading classes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  useEffect(() => {
    if (selectedYearId) {
      fetchClasses(selectedYearId);
    } else {
      fetchClasses();
    }
  }, [selectedYearId]);

  const openAddClassModal = () => {
    setEditingClass(null);
    setClassForm({
      name: "",
      code: "",
      displayOrder: classes.length + 1,
      academicYearId: selectedYearId || (academicYears[0]?.id ?? ""),
    });
    setClassModalError(null);
    setIsClassModalOpen(true);
  };

  const openEditClassModal = (c: SchoolClass) => {
    setEditingClass(c);
    setClassForm({
      name: c.name,
      code: c.code || "",
      displayOrder: c.displayOrder || 0,
      academicYearId: c.academicYearId,
    });
    setClassModalError(null);
    setIsClassModalOpen(true);
  };

  const handleClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClassModalError(null);
    setSuccessMsg(null);

    if (!classForm.academicYearId) {
      setClassModalError("Please select an academic year.");
      return;
    }

    setIsSubmittingClass(true);
    try {
      const url = editingClass ? `/api/admin/classes/${editingClass.id}` : "/api/admin/classes";
      const method = editingClass ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(classForm),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to save class");
      }

      setSuccessMsg(
        editingClass
          ? `Class '${classForm.name}' updated successfully.`
          : `Class '${classForm.name}' created successfully.`
      );
      setIsClassModalOpen(false);
      fetchClasses(selectedYearId);
    } catch (err) {
      setClassModalError(err instanceof Error ? err.message : "Error saving class");
    } finally {
      setIsSubmittingClass(false);
    }
  };

  const openQuickSectionModal = (c: SchoolClass) => {
    setSectionTargetClass(c);
    setSectionForm({
      name: "A",
      code: "",
      capacity: 40,
    });
    setSectionModalError(null);
    setIsSectionModalOpen(true);
  };

  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionTargetClass) return;

    setSectionModalError(null);
    setIsSubmittingSection(true);
    try {
      const res = await fetch("/api/admin/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sectionForm.name,
          code: sectionForm.code,
          capacity: sectionForm.capacity,
          classId: sectionTargetClass.id,
          academicYearId: sectionTargetClass.academicYearId,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to create section");
      }

      setSuccessMsg(`Section '${sectionForm.name}' added to ${sectionTargetClass.name}!`);
      setIsSectionModalOpen(false);
      fetchClasses(selectedYearId);
    } catch (err) {
      setSectionModalError(err instanceof Error ? err.message : "Error creating section");
    } finally {
      setIsSubmittingSection(false);
    }
  };

  const handleDeactivateClass = async (c: SchoolClass) => {
    const confirm = window.confirm(
      `Are you sure you want to deactivate '${c.name}'? Its sections and subject mappings will also be archived.`
    );
    if (!confirm) return;

    setError(null);
    try {
      const res = await fetch(`/api/admin/classes/${c.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to deactivate class");
      }
      setSuccessMsg(`Class '${c.name}' deactivated successfully.`);
      fetchClasses(selectedYearId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deactivating class");
    }
  };

  const totalSections = classes.reduce((sum, c) => sum + c.sectionsCount, 0);

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
            <span className="text-foreground font-semibold">Classes & Sections</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-primary" />
            <span>Classes & Section Structure</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Structure your school&apos;s grades, classrooms, and section capacities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Academic Year Filter Selector */}
          {academicYears.length > 0 && (
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground font-semibold text-xs focus:outline-none focus:border-primary cursor-pointer shadow-xs"
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.status === "ACTIVE" ? "(Active Session)" : ""}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => fetchClasses(selectedYearId)}
            className="p-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-foreground transition-all cursor-pointer shadow-xs"
            title="Refresh"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? "animate-spin text-primary" : ""}`} />
          </button>

          <button
            onClick={openAddClassModal}
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Class</span>
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
            Configured Classes
          </span>
          <span className="text-xl font-extrabold text-foreground block">{classes.length}</span>
          <span className="text-[10px] text-muted-foreground">Classes in selected session</span>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border space-y-1 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Total Active Sections
          </span>
          <span className="text-xl font-extrabold text-foreground block">{totalSections}</span>
          <span className="text-[10px] text-muted-foreground">Classroom divisions</span>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border space-y-1 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Academic Calendar
          </span>
          <Link
            href="/admin/academics/academic-years"
            className="text-sm font-bold text-primary hover:underline flex items-center gap-1.5 pt-1"
          >
            <Calendar className="w-4 h-4" />
            <span>Manage Academic Sessions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <span className="text-[10px] text-muted-foreground">Switch or create academic years</span>
        </div>
      </div>

      {/* Classes Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <span>Classes Directory</span>
          </h2>
          <span className="text-xs text-muted-foreground font-mono">
            {classes.length} {classes.length === 1 ? "Class" : "Classes"}
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground rounded-3xl bg-card border border-border space-y-2">
            <RotateCw className="w-6 h-6 animate-spin text-primary mx-auto" />
            <p className="text-xs">Loading classes for selected session...</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-card border border-border space-y-3">
            <Building2 className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <h3 className="font-bold text-sm text-foreground">No Classes Configured</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Add your school&apos;s grades (e.g. Class 1, Grade 10, Nursery) for this academic year to begin adding sections.
            </p>
            <button
              onClick={openAddClassModal}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Class</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((c) => (
              <div
                key={c.id}
                className="p-5 rounded-3xl bg-card border border-border shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between space-y-4"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
                  <div>
                    <h3 className="font-bold text-base text-foreground">{c.name}</h3>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Order #{c.displayOrder} {c.code ? `• Code: ${c.code}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditClassModal(c)}
                      className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border text-foreground transition-all cursor-pointer"
                      title="Edit Class Name/Order"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-primary" />
                    </button>
                    <button
                      onClick={() => handleDeactivateClass(c)}
                      className="p-1.5 rounded-lg bg-surface-2 hover:bg-destructive/10 border border-border text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                      title="Deactivate Class"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-0.5">
                    <span className="text-muted-foreground text-[10px] block">Sections</span>
                    <span className="font-bold text-foreground text-sm">
                      {c.sectionsCount} {c.sectionsCount === 1 ? "Section" : "Sections"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-0.5">
                    <span className="text-muted-foreground text-[10px] block">Assigned Subjects</span>
                    <span className="font-bold text-foreground text-sm">
                      {c.subjectsCount} {c.subjectsCount === 1 ? "Subject" : "Subjects"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => openQuickSectionModal(c)}
                    className="flex-1 py-2 px-3 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-primary" />
                    <span>+ Section</span>
                  </button>

                  <Link
                    href={`/admin/academics/classes/${c.id}`}
                    className="flex-1 py-2 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  >
                    <span>Manage</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create / Edit Class */}
      {isClassModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-card border border-border shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <span>{editingClass ? "Edit Class" : "Add New Class"}</span>
              </h3>
              <button
                onClick={() => setIsClassModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {classModalError && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{classModalError}</span>
              </div>
            )}

            <form onSubmit={handleClassSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Class / Grade Name</label>
                <input
                  type="text"
                  placeholder="e.g. Class 10, Grade 1, Nursery, UKG"
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Class Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. CLS10"
                    value={classForm.code}
                    onChange={(e) => setClassForm({ ...classForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Display Sequence</label>
                  <input
                    type="number"
                    value={classForm.displayOrder}
                    onChange={(e) =>
                      setClassForm({ ...classForm, displayOrder: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {!editingClass && (
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Academic Year Session</label>
                  <select
                    value={classForm.academicYearId}
                    onChange={(e) => setClassForm({ ...classForm, academicYearId: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                  >
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.name} {ay.status === "ACTIVE" ? "(Active Session)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-foreground font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClass}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingClass && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingClass ? "Save Changes" : "Create Class"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Add Section */}
      {isSectionModalOpen && sectionTargetClass && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-card border border-border shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span>Add Section to {sectionTargetClass.name}</span>
              </h3>
              <button
                onClick={() => setIsSectionModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {sectionModalError && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{sectionModalError}</span>
              </div>
            )}

            <form onSubmit={handleSectionSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Section Identifier / Name</label>
                <input
                  type="text"
                  placeholder="e.g. A, B, Red, Blue"
                  value={sectionForm.name}
                  onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Student Capacity</label>
                  <input
                    type="number"
                    min={1}
                    value={sectionForm.capacity}
                    onChange={(e) =>
                      setSectionForm({ ...sectionForm, capacity: parseInt(e.target.value) || 40 })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Section Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. SEC-A"
                    value={sectionForm.code}
                    onChange={(e) =>
                      setSectionForm({ ...sectionForm, code: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary uppercase"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsSectionModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-foreground font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSection}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingSection && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Add Section</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
