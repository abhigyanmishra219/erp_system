"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  FileText,
  FileImage,
  FileCode,
  Video,
  Globe,
  Download,
  ExternalLink,
  Trash2,
  Edit,
  Folder,
  Layers,
  ChevronRight,
  ChevronDown,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  LayoutGrid,
  ListTree,
  X,
  FileSpreadsheet,
} from "lucide-react";

interface StudyMaterialItem {
  _id: string;
  title: string;
  description: string;
  topic: string;
  type: "PDF" | "IMAGE" | "DOCUMENT" | "PRESENTATION" | "VIDEO" | "EXTERNAL_LINK";
  url: string;
  fileName?: string;
  fileSize?: number | null;
  mimeType?: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  academicYearId: string;
  academicYearName: string;
  teacherId: string;
  teacherName: string;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FilterOptions {
  classes: Array<{ classId: string; className: string }>;
  subjects: Array<{ subjectId: string; subjectName: string; classId?: string }>;
  types: string[];
}

export default function TeacherStudyMaterialPage() {
  const [materials, setMaterials] = useState<StudyMaterialItem[]>([]);
  const [hierarchy, setHierarchy] = useState<Record<string, any>>({});
  const [summary, setSummary] = useState({
    totalCount: 0,
    myUploadsCount: 0,
    topicsCount: 0,
    byType: {} as Record<string, number>,
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    classes: [],
    subjects: [],
    types: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [myUploadsOnly, setMyUploadsOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"hierarchy" | "grid">("hierarchy");

  // Expanded categories in hierarchy view
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<StudyMaterialItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    academicYearId: "",
    classId: "",
    subjectId: "",
    topic: "",
    title: "",
    description: "",
    type: "PDF" as "PDF" | "IMAGE" | "DOCUMENT" | "PRESENTATION" | "VIDEO" | "EXTERNAL_LINK",
    url: "",
    fileName: "",
    fileSizeMb: "",
  });

  const fetchStudyMaterials = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (selectedClassId) params.append("classId", selectedClassId);
      if (selectedSubjectId) params.append("subjectId", selectedSubjectId);
      if (selectedType !== "ALL") params.append("type", selectedType);
      if (myUploadsOnly) params.append("myUploads", "true");

      const res = await fetch(`/api/teacher/study-material?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load study materials");
      }

      setMaterials(data.data.materials || []);
      setHierarchy(data.data.hierarchy || {});
      setSummary(data.data.summary || { totalCount: 0, myUploadsCount: 0, topicsCount: 0, byType: {} });
      setFilterOptions(data.data.filterOptions || { classes: [], subjects: [], types: [] });

      // Auto-expand all classes and subjects initially
      const initialExpClasses: Record<string, boolean> = {};
      const initialExpSubjects: Record<string, boolean> = {};
      if (data.data.hierarchy) {
        Object.keys(data.data.hierarchy).forEach((cKey) => {
          initialExpClasses[cKey] = true;
          const subjects = data.data.hierarchy[cKey].subjects || {};
          Object.keys(subjects).forEach((sKey) => {
            initialExpSubjects[`${cKey}_${sKey}`] = true;
          });
        });
      }
      setExpandedClasses(initialExpClasses);
      setExpandedSubjects(initialExpSubjects);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudyMaterials();
  }, [search, selectedClassId, selectedSubjectId, selectedType, myUploadsOnly]);

  const toggleClassExpand = (classId: string) => {
    setExpandedClasses((prev) => ({ ...prev, [classId]: !prev[classId] }));
  };

  const toggleSubjectExpand = (classId: string, subjectId: string) => {
    const key = `${classId}_${subjectId}`;
    setExpandedSubjects((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleOpenCreateModal = () => {
    setFormData({
      academicYearId: "",
      classId: filterOptions.classes[0]?.classId || "",
      subjectId: filterOptions.subjects[0]?.subjectId || "",
      topic: "",
      title: "",
      description: "",
      type: "PDF",
      url: "",
      fileName: "",
      fileSizeMb: "",
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (item: StudyMaterialItem) => {
    setSelectedMaterial(item);
    setFormData({
      academicYearId: item.academicYearId,
      classId: item.classId,
      subjectId: item.subjectId,
      topic: item.topic,
      title: item.title,
      description: item.description,
      type: item.type,
      url: item.url,
      fileName: item.fileName || "",
      fileSizeMb: item.fileSize ? (item.fileSize / (1024 * 1024)).toFixed(2) : "",
    });
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteModal = (item: StudyMaterialItem) => {
    setSelectedMaterial(item);
    setIsDeleteModalOpen(true);
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.topic || !formData.url || !formData.classId || !formData.subjectId) {
      setError("Please fill out all required fields.");
      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      // Fetch teacher's current academic year if not present
      const payload = {
        academicYearId: formData.academicYearId || undefined,
        classId: formData.classId,
        subjectId: formData.subjectId,
        topic: formData.topic.trim(),
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        url: formData.url.trim(),
        fileName: formData.fileName.trim() || undefined,
        fileSize: formData.fileSizeMb ? Math.round(parseFloat(formData.fileSizeMb) * 1024 * 1024) : undefined,
      };

      // In case academicYearId is not set, we can get it from materials or dashboard
      if (!payload.academicYearId && materials.length > 0) {
        payload.academicYearId = materials[0].academicYearId;
      }

      // If still missing, we fetch it from active academic year or let API provide it
      const res = await fetch("/api/teacher/study-material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to publish study material");
      }

      setSuccessMessage("Study material published successfully!");
      setIsCreateModalOpen(false);
      fetchStudyMaterials();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to publish material");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) return;

    try {
      setActionLoading(true);
      setError(null);

      const payload = {
        topic: formData.topic.trim(),
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        url: formData.url.trim(),
        fileName: formData.fileName.trim() || undefined,
        fileSize: formData.fileSizeMb ? Math.round(parseFloat(formData.fileSizeMb) * 1024 * 1024) : undefined,
      };

      const res = await fetch(`/api/teacher/study-material/${selectedMaterial._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update study material");
      }

      setSuccessMessage("Study material updated successfully!");
      setIsEditModalOpen(false);
      fetchStudyMaterials();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to update material");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteMaterial = async () => {
    if (!selectedMaterial) return;

    try {
      setActionLoading(true);
      setError(null);

      const res = await fetch(`/api/teacher/study-material/${selectedMaterial._id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete study material");
      }

      setSuccessMessage("Study material removed successfully.");
      setIsDeleteModalOpen(false);
      fetchStudyMaterials();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to delete material");
    } finally {
      setActionLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "PDF":
        return <FileText className="w-4 h-4 text-rose-500" />;
      case "IMAGE":
        return <FileImage className="w-4 h-4 text-amber-500" />;
      case "DOCUMENT":
        return <FileSpreadsheet className="w-4 h-4 text-blue-500" />;
      case "PRESENTATION":
        return <Layers className="w-4 h-4 text-orange-500" />;
      case "VIDEO":
        return <Video className="w-4 h-4 text-emerald-500" />;
      case "EXTERNAL_LINK":
        return <Globe className="w-4 h-4 text-indigo-500" />;
      default:
        return <FileCode className="w-4 h-4 text-slate-500" />;
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case "PDF":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "IMAGE":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "DOCUMENT":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "PRESENTATION":
        return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
      case "VIDEO":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "EXTERNAL_LINK":
        return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
      default:
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <span>Study Material & Lesson Resources</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organize and publish syllabus notes, presentations, reference links, and video lectures.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Publish Material</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-medium animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Materials</span>
            <BookOpen className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-foreground">{summary.totalCount}</p>
          <p className="text-[11px] text-muted-foreground">Resources in your assigned classes</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">My Uploads</span>
            <User className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-foreground">{summary.myUploadsCount}</p>
          <p className="text-[11px] text-muted-foreground">Created by your account</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Topics Covered</span>
            <Folder className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-foreground">{summary.topicsCount}</p>
          <p className="text-[11px] text-muted-foreground">Across assigned subjects</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">PDFs & Docs</span>
            <FileText className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-foreground">
            {(summary.byType?.PDF || 0) + (summary.byType?.DOCUMENT || 0)}
          </p>
          <p className="text-[11px] text-muted-foreground">Printable study documents</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by topic, lesson title, or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 text-xs rounded-xl bg-muted/40 border border-border/70 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-foreground transition-all"
            />
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Class filter */}
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              aria-label="Filter by Class"
              className="px-3 py-2 text-xs rounded-xl bg-muted/40 border border-border/70 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
            >
              <option value="">All Classes</option>
              {filterOptions.classes.map((c) => (
                <option key={c.classId} value={c.classId}>
                  {c.className}
                </option>
              ))}
            </select>

            {/* Subject filter */}
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              aria-label="Filter by Subject"
              className="px-3 py-2 text-xs rounded-xl bg-muted/40 border border-border/70 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
            >
              <option value="">All Subjects</option>
              {filterOptions.subjects.map((s) => (
                <option key={s.subjectId} value={s.subjectId}>
                  {s.subjectName}
                </option>
              ))}
            </select>

            {/* My Uploads Toggle */}
            <label className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl bg-muted/30 border border-border/70 cursor-pointer text-foreground select-none">
              <input
                type="checkbox"
                checked={myUploadsOnly}
                onChange={(e) => setMyUploadsOnly(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>My Uploads</span>
            </label>

            {/* View Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-muted/50 border border-border/70">
              <button
                type="button"
                onClick={() => setViewMode("hierarchy")}
                title="Hierarchy View (Class -> Subject -> Topic)"
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "hierarchy"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ListTree className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Grid Cards View"
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "grid"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Format Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
          {["ALL", "PDF", "DOCUMENT", "PRESENTATION", "VIDEO", "IMAGE", "EXTERNAL_LINK"].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap cursor-pointer ${
                selectedType === t
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : "bg-card text-muted-foreground border-border hover:border-border/80 hover:text-foreground"
              }`}
            >
              {t === "ALL" ? "All Formats" : t.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Loading study materials & resources...</p>
        </div>
      ) : materials.length === 0 ? (
        <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">No study materials found</h3>
            <p className="text-xs text-muted-foreground">
              {search || selectedClassId || selectedSubjectId || selectedType !== "ALL"
                ? "Try adjusting your search criteria or filters."
                : "Get started by publishing syllabus notes, worksheets, and lecture resources."}
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Publish First Material</span>
          </button>
        </div>
      ) : viewMode === "hierarchy" ? (
        /* HIERARCHICAL TREE VIEW: Class -> Subject -> Topic -> Material */
        <div className="space-y-4">
          {Object.entries(hierarchy).map(([classId, classGroup]: [string, any]) => {
            const isClassOpen = expandedClasses[classId] ?? true;
            return (
              <div
                key={classId}
                className="rounded-2xl bg-card border border-border/80 shadow-xs overflow-hidden transition-all"
              >
                {/* Class Header */}
                <button
                  type="button"
                  onClick={() => toggleClassExpand(classId)}
                  className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                      {isClassOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-foreground">{classGroup.className}</h2>
                      <p className="text-[11px] text-muted-foreground">
                        {Object.keys(classGroup.subjects || {}).length} Subjects with resources
                      </p>
                    </div>
                  </div>
                </button>

                {/* Subjects Under Class */}
                {isClassOpen && (
                  <div className="p-4 space-y-4 border-t border-border/60">
                    {Object.entries(classGroup.subjects || {}).map(([subjectId, subjectGroup]: [string, any]) => {
                      const subjectKey = `${classId}_${subjectId}`;
                      const isSubjectOpen = expandedSubjects[subjectKey] ?? true;

                      return (
                        <div
                          key={subjectId}
                          className="rounded-xl border border-border/70 bg-background/50 overflow-hidden"
                        >
                          {/* Subject Header */}
                          <button
                            type="button"
                            onClick={() => toggleSubjectExpand(classId, subjectId)}
                            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                                {subjectGroup.subjectName}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-semibold">
                                {Object.keys(subjectGroup.topics || {}).length} Topics
                              </span>
                            </div>
                            {isSubjectOpen ? (
                              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </button>

                          {/* Topics & Materials */}
                          {isSubjectOpen && (
                            <div className="p-3 space-y-4">
                              {Object.entries(subjectGroup.topics || {}).map(([topicName, items]: [string, any]) => (
                                <div key={topicName} className="space-y-2">
                                  {/* Topic Label */}
                                  <div className="flex items-center gap-2 px-1">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                    <h3 className="text-xs font-bold text-foreground tracking-tight">
                                      {topicName}
                                    </h3>
                                    <span className="text-[10px] text-muted-foreground">
                                      ({items.length} file{items.length === 1 ? "" : "s"})
                                    </span>
                                  </div>

                                  {/* Material Items List */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pl-3 border-l-2 border-indigo-500/20">
                                    {items.map((mat: StudyMaterialItem) => (
                                      <div
                                        key={mat._id}
                                        className="p-3 rounded-xl bg-card border border-border/70 hover:border-indigo-500/40 shadow-xs transition-all flex flex-col justify-between gap-2.5"
                                      >
                                        <div className="space-y-1.5">
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span
                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${getTypeBadgeClass(
                                                  mat.type
                                                )}`}
                                              >
                                                {getTypeIcon(mat.type)}
                                                <span>{mat.type.replace("_", " ")}</span>
                                              </span>
                                              {mat.fileSize && (
                                                <span className="text-[10px] text-muted-foreground">
                                                  {(mat.fileSize / (1024 * 1024)).toFixed(1)} MB
                                                </span>
                                              )}
                                            </div>

                                            {mat.isOwner && (
                                              <div className="flex items-center gap-1">
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenEditModal(mat)}
                                                  title="Edit Material"
                                                  className="p-1 rounded-md text-muted-foreground hover:text-indigo-600 hover:bg-muted transition-colors cursor-pointer"
                                                >
                                                  <Edit className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenDeleteModal(mat)}
                                                  title="Delete Material"
                                                  className="p-1 rounded-md text-muted-foreground hover:text-rose-600 hover:bg-muted transition-colors cursor-pointer"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            )}
                                          </div>

                                          <h4 className="text-xs font-bold text-foreground line-clamp-1">
                                            {mat.title}
                                          </h4>
                                          {mat.description && (
                                            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                              {mat.description}
                                            </p>
                                          )}
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
                                          <span className="text-muted-foreground flex items-center gap-1">
                                            <User className="w-3 h-3 text-muted-foreground/80" />
                                            {mat.teacherName}
                                          </span>

                                          <a
                                            href={mat.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                                          >
                                            <span>Open Resource</span>
                                            <ExternalLink className="w-3 h-3" />
                                          </a>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* FLAT GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((mat) => (
            <div
              key={mat._id}
              className="p-4 rounded-2xl bg-card border border-border/70 hover:border-indigo-500/40 shadow-xs flex flex-col justify-between gap-3 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-[11px] font-bold ${getTypeBadgeClass(
                      mat.type
                    )}`}
                  >
                    {getTypeIcon(mat.type)}
                    <span>{mat.type.replace("_", " ")}</span>
                  </span>

                  {mat.isOwner && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(mat)}
                        title="Edit"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-indigo-600 hover:bg-muted transition-colors cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDeleteModal(mat)}
                        title="Delete"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-muted transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-0.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <span>{mat.className}</span>
                    <span>•</span>
                    <span>{mat.subjectName}</span>
                  </div>
                  <h3 className="text-sm font-bold text-foreground line-clamp-1">{mat.title}</h3>
                </div>

                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-foreground text-[10px] font-semibold">
                  <Folder className="w-3 h-3 text-amber-500" />
                  <span>Topic: {mat.topic}</span>
                </div>

                {mat.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {mat.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {mat.teacherName}
                </span>

                <a
                  href={mat.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <span>Open Resource</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / PUBLISH MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-3xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-border/70">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <span>Publish Study Material</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMaterial} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">Class *</label>
                  <select
                    required
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                  >
                    {filterOptions.classes.map((c) => (
                      <option key={c.classId} value={c.classId}>
                        {c.className}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">Subject *</label>
                  <select
                    required
                    value={formData.subjectId}
                    onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                  >
                    {filterOptions.subjects.map((s) => (
                      <option key={s.subjectId} value={s.subjectId}>
                        {s.subjectName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">Topic / Unit / Chapter *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 4: Quadratic Equations"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">Material Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Formula Cheatsheet & Solved Examples"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">Format Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e: any) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                  >
                    <option value="PDF">PDF Document</option>
                    <option value="IMAGE">Image / Diagram</option>
                    <option value="DOCUMENT">Doc / Spreadsheet</option>
                    <option value="PRESENTATION">Presentation Slides</option>
                    <option value="VIDEO">Video Lecture</option>
                    <option value="EXTERNAL_LINK">External Web Link</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">File Size (MB)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Optional (e.g. 2.5)"
                    value={formData.fileSizeMb}
                    onChange={(e) => setFormData({ ...formData, fileSizeMb: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">Resource URL / Cloud Link *</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">Description & Notes</label>
                <textarea
                  rows={2}
                  placeholder="Provide brief guidance or instructions for students..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? "Publishing..." : "Publish Material"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && selectedMaterial && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-3xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-border/70">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Edit className="w-4 h-4 text-indigo-500" />
                <span>Edit Study Material</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditMaterial} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">Topic / Unit / Chapter *</label>
                <input
                  type="text"
                  required
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">Material Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">Format Type</label>
                  <select
                    value={formData.type}
                    onChange={(e: any) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                  >
                    <option value="PDF">PDF Document</option>
                    <option value="IMAGE">Image / Diagram</option>
                    <option value="DOCUMENT">Doc / Spreadsheet</option>
                    <option value="PRESENTATION">Presentation Slides</option>
                    <option value="VIDEO">Video Lecture</option>
                    <option value="EXTERNAL_LINK">External Web Link</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">File Size (MB)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.fileSizeMb}
                    onChange={(e) => setFormData({ ...formData, fileSizeMb: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">Resource URL *</label>
                <input
                  type="url"
                  required
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && selectedMaterial && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl shadow-xl w-full max-w-sm overflow-hidden p-6 space-y-4 text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">Delete Study Material?</h3>
              <p className="text-xs text-muted-foreground">
                Are you sure you want to delete <span className="font-semibold text-foreground">"{selectedMaterial.title}"</span>? Students will no longer have access to this resource.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteMaterial}
                disabled={actionLoading}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? "Deleting..." : "Delete Material"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
