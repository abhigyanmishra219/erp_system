"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  FileText,
  Video,
  Link as LinkIcon,
  Presentation,
  Image as ImageIcon,
  File,
  Download,
  ExternalLink,
  Search,
  Filter,
  Layers,
  LayoutGrid,
  FolderTree,
  ChevronDown,
  ChevronRight,
  User,
  Calendar,
  HardDrive,
  Info,
  Sparkles,
  RefreshCw,
  X,
  FileCode,
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
  class: {
    _id: string;
    name: string;
    code?: string;
  };
  subject: {
    _id: string;
    name: string;
    code?: string;
    type?: string;
  };
  teacher?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  academicYear?: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface SummaryData {
  totalCount: number;
  filteredCount: number;
  topicsCount: number;
  subjectsCount: number;
  byType: Record<string, number>;
}

interface FilterOptions {
  subjects: Array<{ _id: string; name: string; code?: string }>;
  topics: string[];
  types: string[];
}

export default function StudentStudyMaterialPage() {
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<StudyMaterialItem[]>([]);
  const [hierarchy, setHierarchy] = useState<Record<string, any>>({});
  const [summary, setSummary] = useState<SummaryData>({
    totalCount: 0,
    filteredCount: 0,
    topicsCount: 0,
    subjectsCount: 0,
    byType: {},
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    subjects: [],
    topics: [],
    types: [],
  });

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"hierarchy" | "grid">("hierarchy");
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [selectedMaterial, setSelectedMaterial] = useState<StudyMaterialItem | null>(null);

  const fetchStudyMaterials = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedSubjectId !== "ALL") params.append("subjectId", selectedSubjectId);
      if (selectedType !== "ALL") params.append("type", selectedType);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/student/study-material?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch study materials");

      const json = await res.json();
      if (json.success && json.data) {
        setMaterials(json.data.materials || []);
        setHierarchy(json.data.hierarchy || {});
        setSummary(json.data.summary || {});
        setFilterOptions(json.data.filterOptions || { subjects: [], topics: [], types: [] });

        // Auto expand all subjects by default for quick browsing
        if (json.data.hierarchy) {
          const autoExpandedSub: Record<string, boolean> = {};
          const autoExpandedTop: Record<string, boolean> = {};
          Object.values(json.data.hierarchy).forEach((classObj: any) => {
            if (classObj.subjects) {
              Object.keys(classObj.subjects).forEach((subKey) => {
                autoExpandedSub[subKey] = true;
                if (classObj.subjects[subKey]?.topics) {
                  Object.keys(classObj.subjects[subKey].topics).forEach((topKey) => {
                    autoExpandedTop[`${subKey}_${topKey}`] = true;
                  });
                }
              });
            }
          });
          setExpandedSubjects((prev) => ({ ...autoExpandedSub, ...prev }));
          setExpandedTopics((prev) => ({ ...autoExpandedTop, ...prev }));
        }
      }
    } catch (err) {
      console.error("Error fetching study materials:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudyMaterials();
  }, [selectedSubjectId, selectedType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudyMaterials();
  };

  const toggleSubject = (subId: string) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [subId]: !prev[subId],
    }));
  };

  const toggleTopic = (topicKey: string) => {
    setExpandedTopics((prev) => ({
      ...prev,
      [topicKey]: !prev[topicKey],
    }));
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes || bytes <= 0) return null;
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "PDF":
        return {
          icon: <FileText className="w-4 h-4 text-rose-500" />,
          label: "PDF Document",
          bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
        };
      case "IMAGE":
        return {
          icon: <ImageIcon className="w-4 h-4 text-emerald-500" />,
          label: "Image",
          bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        };
      case "DOCUMENT":
        return {
          icon: <FileText className="w-4 h-4 text-blue-500" />,
          label: "Word / Document",
          bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        };
      case "PRESENTATION":
        return {
          icon: <Presentation className="w-4 h-4 text-amber-500" />,
          label: "Presentation Slides",
          bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        };
      case "VIDEO":
        return {
          icon: <Video className="w-4 h-4 text-purple-500" />,
          label: "Video Lecture",
          bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
        };
      case "EXTERNAL_LINK":
        return {
          icon: <LinkIcon className="w-4 h-4 text-cyan-500" />,
          label: "Web Resource",
          bg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
        };
      default:
        return {
          icon: <File className="w-4 h-4 text-muted-foreground" />,
          label: "Resource",
          bg: "bg-muted text-muted-foreground border-border",
        };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-card via-card to-primary/5 border border-border p-6 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <BookOpen className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Study Material & Notes
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Access chapter notes, presentations, lecture references, and worksheets published for your class.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 bg-background border border-border p-1 rounded-2xl self-start md:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("hierarchy")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              viewMode === "hierarchy"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            Hierarchy View
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              viewMode === "grid"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Cards Grid
          </button>
        </div>
      </div>

      {/* 2. Overview Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Total Materials</div>
            <div className="text-lg sm:text-xl font-bold text-foreground">{summary.totalCount || 0}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Subjects</div>
            <div className="text-lg sm:text-xl font-bold text-foreground">{summary.subjectsCount || 0}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Topics Covered</div>
            <div className="text-lg sm:text-xl font-bold text-foreground">{summary.topicsCount || 0}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">PDFs & Docs</div>
            <div className="text-lg sm:text-xl font-bold text-foreground">
              {(summary.byType?.PDF || 0) + (summary.byType?.DOCUMENT || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Controls */}
      <div className="p-4 rounded-3xl bg-card border border-border space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, topic, keyword or file name..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-2xl bg-background border border-border focus:outline-hidden focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="submit"
              className="flex-1 sm:flex-none px-4 py-2 rounded-2xl bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:bg-primary/90 transition-colors shadow-xs"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedSubjectId("ALL");
                setSelectedType("ALL");
                fetchStudyMaterials();
              }}
              title="Reset Filters"
              className="p-2 rounded-2xl bg-background border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          {/* Subject Filter Pill */}
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="text-xs font-medium px-3 py-1.5 rounded-xl bg-background border border-border text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Subjects</option>
            {filterOptions.subjects.map((sub) => (
              <option key={sub._id} value={sub._id}>
                {sub.name} {sub.code ? `(${sub.code})` : ""}
              </option>
            ))}
          </select>

          {/* Type Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1">
            {[
              { key: "ALL", label: "All Types" },
              { key: "PDF", label: "PDFs" },
              { key: "DOCUMENT", label: "Docs" },
              { key: "PRESENTATION", label: "Slides" },
              { key: "VIDEO", label: "Videos" },
              { key: "IMAGE", label: "Images" },
              { key: "EXTERNAL_LINK", label: "Links" },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setSelectedType(t.key)}
                className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
                  selectedType === t.key
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "bg-background border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Content Area */}
      {loading ? (
        <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground font-medium">Loading study materials...</p>
        </div>
      ) : materials.length === 0 ? (
        <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-foreground">No Study Materials Found</h3>
            <p className="text-xs text-muted-foreground">
              {searchQuery || selectedSubjectId !== "ALL" || selectedType !== "ALL"
                ? "No learning resources match your current filter criteria. Try clearing filters or searching for different keywords."
                : "No study materials have been published for your class yet. Check back soon!"}
            </p>
          </div>
          {(searchQuery || selectedSubjectId !== "ALL" || selectedType !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedSubjectId("ALL");
                setSelectedType("ALL");
              }}
              className="px-4 py-2 rounded-2xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : viewMode === "hierarchy" ? (
        /* ================= HIERARCHY VIEW: Class -> Subject -> Topic -> Material ================= */
        <div className="space-y-6">
          {Object.values(hierarchy).map((classItem: any) => (
            <div key={classItem.classId} className="space-y-4">
              {/* Class Header Banner */}
              <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-muted/50 border border-border">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wider">
                    {classItem.className} • Curriculum Library
                  </span>
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {Object.keys(classItem.subjects || {}).length} Subjects Available
                </span>
              </div>

              {/* Subjects Under Class */}
              <div className="space-y-4">
                {Object.values(classItem.subjects || {}).map((subjectItem: any) => {
                  const isSubExpanded = expandedSubjects[subjectItem.subjectId] !== false;
                  const topicsList = Object.entries(subjectItem.topics || {});
                  const totalMatCount = topicsList.reduce(
                    (acc, [_, items]) => acc + (items as any[]).length,
                    0
                  );

                  return (
                    <div
                      key={subjectItem.subjectId}
                      className="rounded-3xl bg-card border border-border overflow-hidden transition-all shadow-xs"
                    >
                      {/* Subject Collapsible Header */}
                      <button
                        type="button"
                        onClick={() => toggleSubject(subjectItem.subjectId)}
                        className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-muted/40 text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm sm:text-base font-bold text-foreground">
                                {subjectItem.subjectName}
                              </h3>
                              {subjectItem.subjectCode && (
                                <span className="px-2 py-0.5 rounded-lg bg-muted text-[10px] font-semibold text-muted-foreground border border-border">
                                  {subjectItem.subjectCode}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {topicsList.length} {topicsList.length === 1 ? "topic" : "topics"} •{" "}
                              {totalMatCount} {totalMatCount === 1 ? "resource" : "resources"}
                            </div>
                          </div>
                        </div>

                        <div className="p-1.5 rounded-xl bg-muted/60 text-muted-foreground">
                          {isSubExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                      </button>

                      {/* Topics inside Subject */}
                      {isSubExpanded && (
                        <div className="p-4 sm:p-5 pt-0 border-t border-border/60 space-y-4 bg-muted/10">
                          {topicsList.map(([topicName, topicMaterials]: [string, any]) => {
                            const topicKey = `${subjectItem.subjectId}_${topicName}`;
                            const isTopicExpanded = expandedTopics[topicKey] !== false;

                            return (
                              <div
                                key={topicKey}
                                className="rounded-2xl bg-background border border-border overflow-hidden"
                              >
                                {/* Topic Header */}
                                <button
                                  type="button"
                                  onClick={() => toggleTopic(topicKey)}
                                  className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left cursor-pointer"
                                >
                                  <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                    <span className="text-xs sm:text-sm font-bold text-foreground">
                                      Topic: {topicName}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                                      {(topicMaterials as any[]).length}
                                    </span>
                                  </div>

                                  <div className="text-muted-foreground">
                                    {isTopicExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    )}
                                  </div>
                                </button>

                                {/* Materials inside Topic */}
                                {isTopicExpanded && (
                                  <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {(topicMaterials as StudyMaterialItem[]).map((mat) => {
                                      const badge = getTypeBadge(mat.type);
                                      const sizeStr = formatFileSize(mat.fileSize);

                                      return (
                                        <div
                                          key={mat._id}
                                          className="p-4 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all flex flex-col justify-between gap-3 shadow-2xs hover:shadow-xs group"
                                        >
                                          <div className="space-y-2">
                                            {/* Type and Date Row */}
                                            <div className="flex items-center justify-between gap-2">
                                              <span
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${badge.bg}`}
                                              >
                                                {badge.icon}
                                                <span>{badge.label}</span>
                                              </span>

                                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(mat.createdAt).toLocaleDateString(undefined, {
                                                  month: "short",
                                                  day: "numeric",
                                                })}
                                              </span>
                                            </div>

                                            {/* Title & Description */}
                                            <div>
                                              <h4 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                                {mat.title}
                                              </h4>
                                              {mat.description && (
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                  {mat.description}
                                                </p>
                                              )}
                                            </div>
                                          </div>

                                          {/* Footer info & action buttons */}
                                          <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                                            <div className="text-[11px] text-muted-foreground truncate">
                                              {mat.teacher?.name ? (
                                                <span className="flex items-center gap-1">
                                                  <User className="w-3 h-3 text-muted-foreground" />
                                                  <span className="truncate">{mat.teacher.name}</span>
                                                </span>
                                              ) : sizeStr ? (
                                                <span className="flex items-center gap-1">
                                                  <HardDrive className="w-3 h-3" />
                                                  {sizeStr}
                                                </span>
                                              ) : (
                                                <span>{mat.subject?.name}</span>
                                              )}
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <button
                                                type="button"
                                                onClick={() => setSelectedMaterial(mat)}
                                                className="p-1.5 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                                                title="View Details"
                                              >
                                                <Info className="w-3.5 h-3.5" />
                                              </button>

                                              <a
                                                href={mat.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                download={mat.type !== "EXTERNAL_LINK"}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs"
                                              >
                                                {mat.type === "EXTERNAL_LINK" ? (
                                                  <>
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                    <span>Open Link</span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <Download className="w-3.5 h-3.5" />
                                                    <span>Download</span>
                                                  </>
                                                )}
                                              </a>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
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
            </div>
          ))}
        </div>
      ) : (
        /* ================= CARDS GRID VIEW ================= */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((mat) => {
            const badge = getTypeBadge(mat.type);
            const sizeStr = formatFileSize(mat.fileSize);

            return (
              <div
                key={mat._id}
                className="p-5 rounded-3xl bg-card border border-border hover:border-primary/40 transition-all flex flex-col justify-between gap-4 shadow-xs group"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${badge.bg}`}
                    >
                      {badge.icon}
                      <span>{badge.label}</span>
                    </span>

                    <span className="px-2 py-0.5 rounded-lg bg-muted text-[10px] font-bold text-muted-foreground">
                      {mat.subject?.name}
                    </span>
                  </div>

                  {/* Title & Topic */}
                  <div>
                    <div className="text-[11px] font-semibold text-primary mb-0.5">
                      Topic: {mat.topic}
                    </div>
                    <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {mat.title}
                    </h3>
                    {mat.description && (
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                        {mat.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Metadata & CTA */}
                <div className="pt-3 border-t border-border/60 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 truncate">
                      <User className="w-3 h-3 shrink-0" />
                      <span className="truncate">{mat.teacher?.name || "Teacher"}</span>
                    </span>

                    {sizeStr && (
                      <span className="flex items-center gap-1 shrink-0">
                        <HardDrive className="w-3 h-3" />
                        {sizeStr}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMaterial(mat)}
                      className="flex-1 py-2 px-3 rounded-2xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition-colors text-center"
                    >
                      Details
                    </button>

                    <a
                      href={mat.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={mat.type !== "EXTERNAL_LINK"}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-2xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors text-center shadow-xs"
                    >
                      {mat.type === "EXTERNAL_LINK" ? (
                        <>
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </>
                      )}
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Resource Preview / Details Modal */}
      {selectedMaterial && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                  {getTypeBadge(selectedMaterial.type).icon}
                </div>
                <div>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold border mb-1 ${
                      getTypeBadge(selectedMaterial.type).bg
                    }`}
                  >
                    {getTypeBadge(selectedMaterial.type).label}
                  </span>
                  <h3 className="text-base font-bold text-foreground">{selectedMaterial.title}</h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMaterial(null)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-3.5 text-xs">
              {selectedMaterial.description && (
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border text-muted-foreground">
                  {selectedMaterial.description}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-background border border-border">
                  <div className="text-muted-foreground text-[10px]">Subject</div>
                  <div className="font-bold text-foreground mt-0.5">
                    {selectedMaterial.subject?.name}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-background border border-border">
                  <div className="text-muted-foreground text-[10px]">Topic / Chapter</div>
                  <div className="font-bold text-foreground mt-0.5">{selectedMaterial.topic}</div>
                </div>

                <div className="p-3 rounded-2xl bg-background border border-border">
                  <div className="text-muted-foreground text-[10px]">Author / Teacher</div>
                  <div className="font-bold text-foreground mt-0.5">
                    {selectedMaterial.teacher?.name || "School Faculty"}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-background border border-border">
                  <div className="text-muted-foreground text-[10px]">File Size</div>
                  <div className="font-bold text-foreground mt-0.5">
                    {formatFileSize(selectedMaterial.fileSize) || "External Resource"}
                  </div>
                </div>
              </div>

              {selectedMaterial.fileName && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-background border border-border">
                  <FileCode className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-foreground truncate">
                    {selectedMaterial.fileName}
                  </span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedMaterial(null)}
                className="flex-1 py-2.5 rounded-2xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition-colors"
              >
                Close
              </button>

              <a
                href={selectedMaterial.url}
                target="_blank"
                rel="noopener noreferrer"
                download={selectedMaterial.type !== "EXTERNAL_LINK"}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs"
              >
                {selectedMaterial.type === "EXTERNAL_LINK" ? (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    <span>Open Link</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download File</span>
                  </>
                )}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
