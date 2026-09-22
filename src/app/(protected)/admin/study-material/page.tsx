"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  FileText,
  FileCode,
  Image as ImageIcon,
  Video,
  Presentation,
  ExternalLink,
  RotateCw,
  X,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit2,
  Building2,
  FolderOpen,
} from "lucide-react";

interface AcademicYearOption {
  id: string;
  _id?: string;
  name: string;
  status: string;
}

interface ClassOption {
  id: string;
  _id?: string;
  name: string;
  code?: string;
}

interface SubjectOption {
  id: string;
  _id?: string;
  name: string;
  code?: string;
}

interface MaterialItem {
  id: string;
  topic: string;
  title: string;
  description: string;
  type: "PDF" | "IMAGE" | "DOCUMENT" | "PRESENTATION" | "VIDEO" | "EXTERNAL_LINK";
  url: string;
  fileName?: string;
  fileSize?: number;
  class?: { id: string; name: string } | null;
  subject?: { id: string; name: string } | null;
  teacher?: { name: string } | null;
  createdAt: string;
}

export default function AdminStudyMaterialPage() {
  // Filter States
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data States
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [hierarchy, setHierarchy] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState({
    academicYearId: "",
    classId: "",
    subjectId: "",
    topic: "",
    title: "",
    description: "",
    type: "PDF" as "PDF" | "IMAGE" | "DOCUMENT" | "PRESENTATION" | "VIDEO" | "EXTERNAL_LINK",
    url: "",
    fileName: "",
  });

  // Edit Modal State
  const [editMaterial, setEditMaterial] = useState<MaterialItem | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // 1. Initial Load Academic Years
  useEffect(() => {
    async function loadYears() {
      try {
        const res = await fetch("/api/admin/academic-years");
        const json = await res.json();
        if (json.success && json.data) {
          const list: AcademicYearOption[] = json.data.academicYears || json.data;
          setAcademicYears(list);
          const active = list.find((y) => y.status === "ACTIVE") || list[0];
          if (active) {
            setSelectedYearId(active.id || active._id || "");
            setCreateForm((prev) => ({ ...prev, academicYearId: active.id || active._id || "" }));
          }
        }
      } catch (err) {
        console.error("Failed to load academic years:", err);
      }
    }
    loadYears();
  }, []);

  // 2. Load Classes when Academic Year changes
  useEffect(() => {
    async function loadClasses() {
      if (!selectedYearId) {
        setClasses([]);
        setSelectedClassId("");
        setSubjects([]);
        setSelectedSubjectId("");
        return;
      }
      try {
        const res = await fetch(`/api/admin/classes?academicYearId=${selectedYearId}`);
        const json = await res.json();
        if (json.success && json.data) {
          const list: ClassOption[] = json.data.classes || json.data;
          setClasses(list);
          if (list.length > 0) {
            setSelectedClassId(list[0].id || list[0]._id || "");
            setCreateForm((prev) => ({ ...prev, classId: list[0].id || list[0]._id || "" }));
          } else {
            setSelectedClassId("");
            setSubjects([]);
            setSelectedSubjectId("");
          }
        }
      } catch (err) {
        console.error("Failed to load classes:", err);
      }
    }
    loadClasses();
  }, [selectedYearId]);

  // 3. Load Subjects when Class changes
  useEffect(() => {
    if (!selectedClassId) {
      setSubjects([]);
      setSelectedSubjectId("");
      return;
    }
    async function loadSubjects() {
      try {
        const res = await fetch(`/api/admin/classes/${selectedClassId}/subjects?academicYearId=${selectedYearId}`);
        const json = await res.json();
        if (json.success && json.data) {
          const list: SubjectOption[] = (json.data.subjects || json.data).map((s: any) => ({
            id: s.subjectId || s.subject?._id || s._id || s.id,
            name: s.name || s.subject?.name || "Unnamed Subject",
            code: s.code || s.subject?.code || "",
          }));
          setSubjects(list);
          if (list.length > 0) {
            setSelectedSubjectId(list[0].id || "");
            setCreateForm((prev) => ({ ...prev, subjectId: list[0].id || "" }));
          } else {
            setSelectedSubjectId("");
            setCreateForm((prev) => ({ ...prev, subjectId: "" }));
          }
        }
      } catch (err) {
        console.error("Failed to load subjects:", err);
      }
    }
    loadSubjects();
  }, [selectedClassId, selectedYearId]);

  // 4. Fetch Study Materials List
  const fetchMaterials = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      if (selectedYearId) params.append("academicYearId", selectedYearId);
      if (selectedClassId) params.append("classId", selectedClassId);
      if (selectedSubjectId) params.append("subjectId", selectedSubjectId);
      if (selectedType !== "ALL") params.append("type", selectedType);
      if (searchQuery) params.append("search", searchQuery);

      const res = await fetch(`/api/admin/study-material?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load study materials");
      }
      setMaterials(json.data.materials || []);
      setHierarchy(json.data.hierarchy || {});
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to fetch study materials");
      setMaterials([]);
      setHierarchy({});
    } finally {
      setIsLoading(false);
    }
  }, [selectedYearId, selectedClassId, selectedSubjectId, selectedType, searchQuery]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  // Handle Create Study Material
  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = {
        academicYearId: createForm.academicYearId || selectedYearId,
        classId: createForm.classId || selectedClassId,
        subjectId: createForm.subjectId || selectedSubjectId,
        topic: createForm.topic.trim(),
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        type: createForm.type,
        url: createForm.url.trim(),
        fileName: createForm.fileName.trim() || createForm.title.trim(),
      };

      const res = await fetch("/api/admin/study-material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to create study material");
      }

      setSuccessMessage("Study material uploaded & categorized successfully!");
      setIsCreateModalOpen(false);
      setCreateForm({
        academicYearId: selectedYearId,
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        topic: "",
        title: "",
        description: "",
        type: "PDF",
        url: "",
        fileName: "",
      });
      fetchMaterials();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save study material");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Material
  const handleUpdateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMaterial) return;
    setIsUpdating(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/admin/study-material/${editMaterial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: editMaterial.topic.trim(),
          title: editMaterial.title.trim(),
          description: editMaterial.description?.trim() || "",
          type: editMaterial.type,
          url: editMaterial.url.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update study material");
      }

      setSuccessMessage("Study material updated successfully!");
      setEditMaterial(null);
      fetchMaterials();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update study material");
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Delete Material
  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm("Are you sure you want to remove this study material?")) return;
    try {
      const res = await fetch(`/api/admin/study-material/${materialId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to remove material");
      }
      setSuccessMessage("Study material removed.");
      fetchMaterials();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete study material");
    }
  };

  // Type Icon helper
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "PDF":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">PDF</span>;
      case "VIDEO":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">Video</span>;
      case "IMAGE":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Image</span>;
      case "PRESENTATION":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">Slides</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary">{type}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-primary" />
            <span>Study Material</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Publish and organize digital syllabus resources, notes, presentations, videos, and reference links by Class, Subject, and Topic.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/25 hover:opacity-90 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Study Material</span>
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-5 rounded-3xl bg-card border border-border shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Academic Session */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Academic Session
            </label>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {academicYears.map((yr) => (
                <option key={yr.id || yr._id} value={yr.id || yr._id}>
                  {yr.name} {yr.status === "ACTIVE" ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Class */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Class
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id || c._id} value={c.id || c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Subjects</option>
              {subjects.map((sub) => (
                <option key={sub.id || sub._id} value={sub.id || sub._id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Material Type */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Resource Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="ALL">All Types</option>
              <option value="PDF">PDF Documents</option>
              <option value="VIDEO">Videos</option>
              <option value="PRESENTATION">Presentations</option>
              <option value="DOCUMENT">Documents / Word</option>
              <option value="IMAGE">Images & Diagrams</option>
              <option value="EXTERNAL_LINK">External Links</option>
            </select>
          </div>

          {/* Search */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Search Material
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topic or title..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Hierarchical Class -> Subject -> Topic -> Material Organization */}
      {isLoading ? (
        <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3">
          <RotateCw className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-xs text-muted-foreground">Loading curriculum materials library...</p>
        </div>
      ) : Object.keys(hierarchy).length === 0 ? (
        <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3">
          <BookOpen className="w-10 h-10 text-muted-foreground/50 mx-auto" />
          <h3 className="text-sm font-bold text-foreground">No study material available</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No study material has been added for the selected filters. Add course materials for topics to provide learning resources to students.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Study Material</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.values(hierarchy).map((classGroup: any) => (
            <div key={classGroup.classId} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <Building2 className="w-4 h-4 text-primary" />
                <h2 className="font-extrabold text-sm text-foreground">{classGroup.className}</h2>
              </div>

              <div className="space-y-4 pl-2 md:pl-4">
                {Object.values(classGroup.subjects).map((subjGroup: any) => (
                  <div key={subjGroup.subjectId} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">
                        {subjGroup.subjectName}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-3">
                      {Object.entries(subjGroup.topics).map(([topicName, items]: [string, any]) => (
                        <div key={topicName} className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-3">
                          <div className="flex items-center justify-between border-b border-border pb-2">
                            <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                              <FolderOpen className="w-3.5 h-3.5 text-primary" />
                              <span className="truncate">{topicName}</span>
                            </span>
                            <span className="text-[10px] text-muted-foreground font-semibold">
                              {items.length} {items.length === 1 ? "item" : "items"}
                            </span>
                          </div>

                          <div className="space-y-2">
                            {items.map((mat: any) => (
                              <div
                                key={mat.id}
                                className="p-2.5 rounded-xl bg-surface-2/60 border border-border flex items-center justify-between gap-2 hover:bg-surface-2 transition-colors"
                              >
                                <div className="space-y-0.5 overflow-hidden">
                                  <div className="flex items-center gap-1.5">
                                    {getTypeBadge(mat.type)}
                                    <span className="font-bold text-xs text-foreground truncate block">
                                      {mat.title}
                                    </span>
                                  </div>
                                  {mat.description && (
                                    <p className="text-[11px] text-muted-foreground truncate">{mat.description}</p>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <a
                                    href={mat.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-lg bg-card hover:bg-surface-3 border border-border text-primary transition-colors"
                                    title="Open resource"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                  <button
                                    onClick={() => handleDeleteMaterial(mat.id)}
                                    className="p-1.5 rounded-lg bg-card hover:bg-rose-500/20 text-rose-500 border border-border transition-colors cursor-pointer"
                                    title="Delete material"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD STUDY MATERIAL MODAL                                                   */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span>Upload Study Material</span>
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMaterial} className="space-y-3.5">
              {/* Class & Subject */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Class *</label>
                  <select
                    required
                    value={createForm.classId || selectedClassId}
                    onChange={(e) => {
                      setCreateForm({ ...createForm, classId: e.target.value });
                      setSelectedClassId(e.target.value);
                    }}
                    className="w-full p-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {classes.map((c) => (
                      <option key={c.id || c._id} value={c.id || c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Subject *</label>
                  <select
                    required
                    value={createForm.subjectId || selectedSubjectId}
                    onChange={(e) => setCreateForm({ ...createForm, subjectId: e.target.value })}
                    className="w-full p-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {subjects.map((s) => (
                      <option key={s.id || s._id} value={s.id || s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Topic & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Topic / Chapter *</label>
                  <input
                    type="text"
                    required
                    value={createForm.topic}
                    onChange={(e) => setCreateForm({ ...createForm, topic: e.target.value })}
                    placeholder="e.g. Algebra, Photosynthesis"
                    className="w-full p-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Material Title *</label>
                  <input
                    type="text"
                    required
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    placeholder="e.g. Chapter Summary Notes"
                    className="w-full p-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Key concepts or reading instructions..."
                  className="w-full p-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Material Type & URL */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Resource Type *</label>
                  <select
                    value={createForm.type}
                    onChange={(e) => setCreateForm({ ...createForm, type: e.target.value as any })}
                    className="w-full p-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="PDF">PDF</option>
                    <option value="VIDEO">Video</option>
                    <option value="PRESENTATION">Presentation</option>
                    <option value="DOCUMENT">Document</option>
                    <option value="IMAGE">Image</option>
                    <option value="EXTERNAL_LINK">External Link</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground">Resource URL / Link *</label>
                  <input
                    type="url"
                    required
                    value={createForm.url}
                    onChange={(e) => setCreateForm({ ...createForm, url: e.target.value })}
                    placeholder="https://drive.google.com/... or https://youtube.com/..."
                    className="w-full p-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-muted-foreground text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:opacity-90 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <RotateCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Save Material</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
