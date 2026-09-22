"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Building2,
  Layers,
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  Award,
  Users,
  Calendar,
} from "lucide-react";

interface SectionItem {
  id: string;
  name: string;
  code: string;
  capacity: number;
  isActive: boolean;
}

interface AssignedSubjectItem {
  id: string;
  subjectId: string;
  name: string;
  code: string;
  subjectType: string;
  maximumMarks: number;
  passingMarks: number;
  isActive: boolean;
}

interface ClassDetails {
  id: string;
  name: string;
  code: string;
  displayOrder: number;
  academicYear: {
    _id: string;
    name: string;
    status: string;
  };
  isActive: boolean;
}

interface CatalogSubject {
  id: string;
  name: string;
  code: string;
  subjectType: string;
}

export default function ClassDetailsPage() {
  const params = useParams();
  const classId = params?.classId as string;

  const [classData, setClassData] = useState<ClassDetails | null>(null);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<AssignedSubjectItem[]>([]);
  const [catalogSubjects, setCatalogSubjects] = useState<CatalogSubject[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Section Modal state
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionItem | null>(null);
  const [sectionForm, setSectionForm] = useState({ name: "", code: "", capacity: 40 });
  const [isSubmittingSection, setIsSubmittingSection] = useState(false);
  const [sectionError, setSectionError] = useState<string | null>(null);

  // Assign Subject Modal state
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingAssignedSubject, setEditingAssignedSubject] = useState<AssignedSubjectItem | null>(null);
  const [subjectForm, setSubjectForm] = useState({
    subjectId: "",
    maximumMarks: 100,
    passingMarks: 33,
  });
  const [isSubmittingSubject, setIsSubmittingSubject] = useState(false);
  const [subjectError, setSubjectError] = useState<string | null>(null);

  const fetchClassDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/classes/${classId}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to fetch class details");
      }
      setClassData(json.data.class);
      setSections(json.data.sections || []);
      setAssignedSubjects(json.data.subjects || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading class details");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCatalogSubjects = async () => {
    try {
      const res = await fetch("/api/admin/subjects");
      const json = await res.json();
      if (res.ok && json.success) {
        setCatalogSubjects(json.data.subjects || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (classId) {
      fetchClassDetails();
      fetchCatalogSubjects();
    }
  }, [classId]);

  // Section handlers
  const openAddSectionModal = () => {
    setEditingSection(null);
    setSectionForm({ name: "", code: "", capacity: 40 });
    setSectionError(null);
    setIsSectionModalOpen(true);
  };

  const openEditSectionModal = (sec: SectionItem) => {
    setEditingSection(sec);
    setSectionForm({ name: sec.name, code: sec.code || "", capacity: sec.capacity });
    setSectionError(null);
    setIsSectionModalOpen(true);
  };

  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classData) return;
    setSectionError(null);
    setIsSubmittingSection(true);

    try {
      const url = editingSection
        ? `/api/admin/sections/${editingSection.id}`
        : "/api/admin/sections";
      const method = editingSection ? "PATCH" : "POST";
      const bodyPayload = editingSection
        ? sectionForm
        : {
            ...sectionForm,
            classId: classData.id,
            academicYearId: classData.academicYear._id,
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to save section");
      }

      setSuccessMsg(
        editingSection
          ? `Section '${sectionForm.name}' updated successfully.`
          : `Section '${sectionForm.name}' added successfully.`
      );
      setIsSectionModalOpen(false);
      fetchClassDetails();
    } catch (err) {
      setSectionError(err instanceof Error ? err.message : "Error saving section");
    } finally {
      setIsSubmittingSection(false);
    }
  };

  const handleDeactivateSection = async (sec: SectionItem) => {
    const confirm = window.confirm(`Are you sure you want to deactivate section '${sec.name}'?`);
    if (!confirm) return;

    try {
      const res = await fetch(`/api/admin/sections/${sec.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to deactivate section");
      }
      setSuccessMsg(`Section '${sec.name}' deactivated successfully.`);
      fetchClassDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deactivating section");
    }
  };

  // Subject handlers
  const openAssignSubjectModal = () => {
    setEditingAssignedSubject(null);
    const unassigned = catalogSubjects.find(
      (cat) => !assignedSubjects.some((as) => as.subjectId === cat.id)
    );
    setSubjectForm({
      subjectId: unassigned ? unassigned.id : catalogSubjects[0]?.id || "",
      maximumMarks: 100,
      passingMarks: 33,
    });
    setSubjectError(null);
    setIsSubjectModalOpen(true);
  };

  const openEditSubjectModal = (subj: AssignedSubjectItem) => {
    setEditingAssignedSubject(subj);
    setSubjectForm({
      subjectId: subj.subjectId,
      maximumMarks: subj.maximumMarks,
      passingMarks: subj.passingMarks,
    });
    setSubjectError(null);
    setIsSubjectModalOpen(true);
  };

  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classData) return;
    setSubjectError(null);

    if (subjectForm.passingMarks > subjectForm.maximumMarks) {
      setSubjectError("Passing marks cannot exceed maximum marks.");
      return;
    }

    setIsSubmittingSubject(true);
    try {
      if (editingAssignedSubject) {
        const res = await fetch(
          `/api/admin/classes/${classId}/subjects/${editingAssignedSubject.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              maximumMarks: subjectForm.maximumMarks,
              passingMarks: subjectForm.passingMarks,
            }),
          }
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Failed to update subject configuration");
        }
        setSuccessMsg(`Subject evaluation marks updated.`);
      } else {
        const res = await fetch(`/api/admin/classes/${classId}/subjects`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subjectId: subjectForm.subjectId,
            academicYearId: classData.academicYear._id,
            maximumMarks: subjectForm.maximumMarks,
            passingMarks: subjectForm.passingMarks,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Failed to assign subject");
        }
        setSuccessMsg(`Subject successfully assigned to ${classData.name}.`);
      }

      setIsSubjectModalOpen(false);
      fetchClassDetails();
    } catch (err) {
      setSubjectError(err instanceof Error ? err.message : "Error saving subject assignment");
    } finally {
      setIsSubmittingSubject(false);
    }
  };

  const handleUnassignSubject = async (subj: AssignedSubjectItem) => {
    const confirm = window.confirm(
      `Are you sure you want to remove '${subj.name}' from ${classData?.name}?`
    );
    if (!confirm) return;

    try {
      const res = await fetch(`/api/admin/classes/${classId}/subjects/${subj.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to remove subject");
      }
      setSuccessMsg(`Subject '${subj.name}' removed from class.`);
      fetchClassDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error removing subject");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-16 text-center text-muted-foreground space-y-3">
        <RotateCw className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-xs">Loading class workspace...</p>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
        <h2 className="text-base font-bold text-foreground">Class Not Found</h2>
        <p className="text-xs text-muted-foreground">The requested class could not be found.</p>
        <Link
          href="/admin/academics/classes"
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold inline-block"
        >
          Back to Classes
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb & Header */}
      <div className="space-y-3">
        <Link
          href="/admin/academics/classes"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Classes Directory</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider mb-1">
              <Calendar className="w-3 h-3" />
              <span>Session: {classData.academicYear?.name || "Active Session"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
              <Building2 className="w-7 h-7 text-primary" />
              <span>{classData.name}</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure sections and assigned subjects for this academic grade.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchClassDetails()}
              className="p-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-foreground transition-all cursor-pointer shadow-xs"
              title="Refresh"
            >
              <RotateCw className="w-4 h-4 text-primary" />
            </button>
          </div>
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

      {/* 2-Column Grid: Sections & Subjects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Sections Workspace */}
        <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <span>Class Sections ({sections.length})</span>
            </h2>
            <button
              onClick={openAddSectionModal}
              className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Section</span>
            </button>
          </div>

          {sections.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Layers className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="font-bold text-xs text-foreground">No Sections Added Yet</p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                Add division sections (e.g. A, B, Red) with capacity limits.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sections.map((sec) => (
                <div
                  key={sec.id}
                  className="p-4 rounded-2xl bg-surface-2 border border-border flex items-center justify-between gap-3 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-extrabold text-sm">
                      {sec.name}
                    </div>
                    <div>
                      <span className="font-bold text-xs text-foreground block">Section {sec.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        Capacity: {sec.capacity} students {sec.code ? `• Code: ${sec.code}` : ""}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditSectionModal(sec)}
                      className="p-1.5 rounded-lg bg-card hover:bg-surface-3 border border-border text-foreground transition-all cursor-pointer"
                      title="Edit Section"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-primary" />
                    </button>
                    <button
                      onClick={() => handleDeactivateSection(sec)}
                      className="p-1.5 rounded-lg bg-card hover:bg-destructive/10 border border-border text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                      title="Deactivate Section"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Assigned Subjects */}
        <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span>Assigned Subjects ({assignedSubjects.length})</span>
            </h2>
            <button
              onClick={openAssignSubjectModal}
              disabled={catalogSubjects.length === 0}
              className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Assign Subject</span>
            </button>
          </div>

          {catalogSubjects.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="font-bold text-xs text-foreground">No Subjects in Catalog</p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                Create subjects in your School Catalog first to assign them here.
              </p>
              <Link
                href="/admin/academics/subjects"
                className="text-xs text-primary font-bold hover:underline inline-block mt-1"
              >
                Go to Subjects Catalog →
              </Link>
            </div>
          ) : assignedSubjects.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Award className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="font-bold text-xs text-foreground">No Subjects Assigned</p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                Assign curriculum subjects to this class and set maximum and passing marks.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {assignedSubjects.map((subj) => (
                <div
                  key={subj.id}
                  className="p-4 rounded-2xl bg-surface-2 border border-border flex items-center justify-between gap-3 hover:border-primary/30 transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground">{subj.name}</span>
                      <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-background border border-border text-muted-foreground uppercase font-bold">
                        {subj.code}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-bold uppercase font-mono">
                        {subj.subjectType}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block mt-0.5 font-mono">
                      Max: <strong className="text-foreground">{subj.maximumMarks}</strong> | Pass: <strong className="text-foreground">{subj.passingMarks}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditSubjectModal(subj)}
                      className="p-1.5 rounded-lg bg-card hover:bg-surface-3 border border-border text-foreground transition-all cursor-pointer"
                      title="Edit Marks Configuration"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-primary" />
                    </button>
                    <button
                      onClick={() => handleUnassignSubject(subj)}
                      className="p-1.5 rounded-lg bg-card hover:bg-destructive/10 border border-border text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                      title="Unassign Subject"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Section Add / Edit */}
      {isSectionModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-card border border-border shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span>{editingSection ? "Edit Section" : "Add Section"}</span>
              </h3>
              <button
                onClick={() => setIsSectionModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {sectionError && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{sectionError}</span>
              </div>
            )}

            <form onSubmit={handleSectionSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Section Identifier</label>
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
                  <label className="font-medium text-foreground">Capacity</label>
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
                  <span>{editingSection ? "Save Changes" : "Create Section"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign / Edit Subject */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-card border border-border shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span>{editingAssignedSubject ? "Edit Subject Marks" : "Assign Subject to Class"}</span>
              </h3>
              <button
                onClick={() => setIsSubjectModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {subjectError && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{subjectError}</span>
              </div>
            )}

            <form onSubmit={handleSubjectSubmit} className="space-y-4 text-xs">
              {!editingAssignedSubject ? (
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Select Subject from Catalog</label>
                  <select
                    value={subjectForm.subjectId}
                    onChange={(e) => setSubjectForm({ ...subjectForm, subjectId: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                  >
                    {catalogSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code}) — {s.subjectType}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-surface-2 border border-border">
                  <span className="font-semibold text-foreground text-xs block">
                    {editingAssignedSubject.name} ({editingAssignedSubject.code})
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase font-mono">
                    {editingAssignedSubject.subjectType}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Maximum Marks</label>
                  <input
                    type="number"
                    min={1}
                    value={subjectForm.maximumMarks}
                    onChange={(e) =>
                      setSubjectForm({
                        ...subjectForm,
                        maximumMarks: parseInt(e.target.value) || 100,
                      })
                    }
                    required
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Passing Marks</label>
                  <input
                    type="number"
                    min={0}
                    value={subjectForm.passingMarks}
                    onChange={(e) =>
                      setSubjectForm({
                        ...subjectForm,
                        passingMarks: parseInt(e.target.value) || 33,
                      })
                    }
                    required
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-foreground font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSubject}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingSubject && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingAssignedSubject ? "Save Marks" : "Assign Subject"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
