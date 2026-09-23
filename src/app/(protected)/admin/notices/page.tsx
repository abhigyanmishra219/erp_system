"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  Eye,
  Edit,
  Archive,
  Send,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Paperclip,
  CheckCircle2,
  X,
  RefreshCw,
  Building2,
} from "lucide-react";

interface NoticeItem {
  _id: string;
  title: string;
  description: string;
  targetType: "SCHOOL" | "TEACHERS" | "STUDENTS" | "PARENTS" | "CLASS" | "SECTION";
  targetClassId?: { _id: string; name: string; code?: string };
  targetSectionId?: { _id: string; name: string };
  targetRoles: string[];
  attachments: { name: string; url: string; type: "FILE" | "EXTERNAL_LINK"; size?: number }[];
  status: "DRAFT" | "PUBLISHED" | "EXPIRED" | "ARCHIVED";
  publishedAt?: string;
  expiresAt?: string;
  createdBy?: { name: string; email: string };
  createdAt: string;
}

interface NoticeStats {
  total: number;
  published: number;
  draft: number;
  expired: number;
  archived: number;
}

interface ClassOption {
  _id: string;
  name: string;
  code?: string;
}

interface SectionOption {
  _id: string;
  name: string;
}

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [stats, setStats] = useState<NoticeStats>({
    total: 0,
    published: 0,
    draft: 0,
    expired: 0,
    archived: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [targetFilter, setTargetFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    targetType: "SCHOOL" as "SCHOOL" | "TEACHERS" | "STUDENTS" | "PARENTS" | "CLASS" | "SECTION",
    targetClassId: "",
    targetSectionId: "",
    attachmentName: "",
    attachmentUrl: "",
    attachmentType: "FILE" as "FILE" | "EXTERNAL_LINK",
    expiresAt: "",
    publishImmediately: true,
  });

  const fetchNotices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        status: statusFilter,
        targetType: targetFilter,
      });

      if (search.trim()) {
        params.append("search", search.trim());
      }

      const res = await fetch(`/api/admin/notices?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load notices");
      }

      setNotices(json.data.notices);
      setStats(json.data.stats);
      setTotalPages(json.data.totalPages);
      setTotalRecords(json.data.total);
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching notices");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, targetFilter, search]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  // Load classes for targeting
  const loadClasses = async () => {
    try {
      const res = await fetch("/api/admin/classes");
      const json = await res.json();
      if (json.success && json.data?.classes) {
        setClasses(json.data.classes);
      }
    } catch (err) {
      console.error("Failed to load classes", err);
    }
  };

  // Load sections when class is selected
  const loadSections = async (classId: string) => {
    if (!classId) {
      setSections([]);
      return;
    }
    try {
      const res = await fetch(`/api/admin/sections?classId=${classId}`);
      const json = await res.json();
      if (json.success && json.data?.sections) {
        setSections(json.data.sections);
      }
    } catch (err) {
      console.error("Failed to load sections", err);
    }
  };

  const handleOpenCreateModal = () => {
    loadClasses();
    setCreateForm({
      title: "",
      description: "",
      targetType: "SCHOOL",
      targetClassId: "",
      targetSectionId: "",
      attachmentName: "",
      attachmentUrl: "",
      attachmentType: "FILE",
      expiresAt: "",
      publishImmediately: true,
    });
    setIsCreateModalOpen(true);
  };

  const handleTargetTypeChange = (newTarget: typeof createForm.targetType) => {
    setCreateForm((prev) => ({
      ...prev,
      targetType: newTarget,
      targetClassId: "",
      targetSectionId: "",
    }));
    setSections([]);
  };

  const handleClassChange = (classId: string) => {
    setCreateForm((prev) => ({
      ...prev,
      targetClassId: classId,
      targetSectionId: "",
    }));
    loadSections(classId);
  };

  const handleCreateNoticeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const attachments = [];
      if (createForm.attachmentUrl.trim()) {
        attachments.push({
          name: createForm.attachmentName.trim() || "Attachment Document",
          url: createForm.attachmentUrl.trim(),
          type: createForm.attachmentType,
        });
      }

      const payload = {
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        targetType: createForm.targetType,
        targetClassId:
          createForm.targetType === "CLASS" || createForm.targetType === "SECTION"
            ? createForm.targetClassId || undefined
            : undefined,
        targetSectionId:
          createForm.targetType === "SECTION"
            ? createForm.targetSectionId || undefined
            : undefined,
        attachments,
        status: createForm.publishImmediately ? "PUBLISHED" : "DRAFT",
        expiresAt: createForm.expiresAt ? new Date(createForm.expiresAt).toISOString() : undefined,
      };

      const res = await fetch("/api/admin/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to create notice");
      }

      setIsCreateModalOpen(false);
      fetchNotices();
    } catch (err: any) {
      alert(err.message || "Failed to create notice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishNotice = async (noticeId: string) => {
    if (!confirm("Are you sure you want to publish this notice? In-app notifications will be delivered to the target audience.")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/notices/${noticeId}/publish`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to publish notice");
      }
      fetchNotices();
    } catch (err: any) {
      alert(err.message || "Failed to publish notice");
    }
  };

  const handleArchiveNotice = async (noticeId: string) => {
    if (!confirm("Are you sure you want to archive this notice?")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/notices/${noticeId}/archive`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to archive notice");
      }
      fetchNotices();
    } catch (err: any) {
      alert(err.message || "Failed to archive notice");
    }
  };

  const getTargetBadge = (item: NoticeItem) => {
    switch (item.targetType) {
      case "SCHOOL":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            Entire School
          </span>
        );
      case "TEACHERS":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Teachers Only
          </span>
        );
      case "STUDENTS":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            Students Only
          </span>
        );
      case "PARENTS":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            Parents Only
          </span>
        );
      case "CLASS":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Class: {item.targetClassId?.name || "Class"}
          </span>
        );
      case "SECTION":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
            {item.targetClassId?.name} - Sec {item.targetSectionId?.name}
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (item: NoticeItem) => {
    const isExpired = item.expiresAt && new Date(item.expiresAt) < new Date();

    if (item.status === "ARCHIVED") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400">
          ARCHIVED
        </span>
      );
    }

    if (item.status === "DRAFT") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          DRAFT
        </span>
      );
    }

    if (isExpired) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          EXPIRED
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        PUBLISHED
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-primary" />
            <span>Notices & Circulars</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Publish institutional announcements and targeted notices with automated in-app notifications.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Notice</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Total Notices
          </span>
          <span className="text-2xl font-black text-foreground mt-0.5 block">
            {stats.total}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
            Active Published
          </span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            {stats.published}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
            Drafts
          </span>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5 block">
            {stats.draft}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
            Expired
          </span>
          <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5 block">
            {stats.expired}
          </span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-card border border-border p-3.5 rounded-2xl shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search notices by title or keywords..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-2 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs bg-surface-2 border border-border rounded-xl text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">All Status</option>
            <option value="PUBLISHED">Published (Active)</option>
            <option value="DRAFT">Drafts</option>
            <option value="EXPIRED">Expired</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          {/* Target Filter */}
          <select
            value={targetFilter}
            onChange={(e) => {
              setTargetFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs bg-surface-2 border border-border rounded-xl text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">All Audiences</option>
            <option value="SCHOOL">Entire School</option>
            <option value="TEACHERS">Teachers</option>
            <option value="STUDENTS">Students</option>
            <option value="PARENTS">Parents</option>
            <option value="CLASS">Class Specific</option>
            <option value="SECTION">Section Specific</option>
          </select>
        </div>
      </div>

      {/* Notices List Table / Card View */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs font-medium">Loading institutional notices...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-500 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <p className="text-xs font-medium">{error}</p>
          </div>
        ) : notices.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground space-y-3">
            <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">No Notices Found</p>
              <p className="text-xs max-w-sm mx-auto">
                No notices match your selected filter criteria. Create your first notice announcement.
              </p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Create Notice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-2 border-b border-border text-muted-foreground font-bold text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4">Title & Details</th>
                  <th className="py-3 px-4">Audience Target</th>
                  <th className="py-3 px-4">Publish Date</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {notices.map((item) => (
                  <tr key={item._id} className="hover:bg-surface-2/40 transition-colors">
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="flex items-start gap-2">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                          <Bell className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                          <Link
                            href={`/admin/notices/${item._id}`}
                            className="font-bold text-foreground hover:text-primary transition line-clamp-1 text-xs"
                          >
                            {item.title}
                          </Link>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {item.description}
                          </p>
                          {item.attachments && item.attachments.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                              <Paperclip className="w-3 h-3" />
                              {item.attachments.length} attachment(s)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {getTargetBadge(item)}
                    </td>

                    <td className="py-3.5 px-4 text-muted-foreground font-medium">
                      {item.publishedAt
                        ? new Date(item.publishedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Not Published"}
                    </td>

                    <td className="py-3.5 px-4 text-muted-foreground font-medium">
                      {item.expiresAt
                        ? new Date(item.expiresAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "No Expiry"}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(item)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          href={`/admin/notices/${item._id}`}
                          className="p-1.5 rounded-lg border border-border hover:bg-surface-3 text-muted-foreground hover:text-foreground transition"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>

                        {item.status === "DRAFT" && (
                          <button
                            onClick={() => handlePublishNotice(item._id)}
                            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
                            title="Publish Notice"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {item.status !== "ARCHIVED" && (
                          <button
                            onClick={() => handleArchiveNotice(item._id)}
                            className="p-1.5 rounded-lg border border-border hover:bg-surface-3 text-muted-foreground hover:text-rose-500 transition cursor-pointer"
                            title="Archive Notice"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing Page {page} of {totalPages} ({totalRecords} records)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-surface-2 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-surface-2 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Create Notice */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" /> Create New Notice
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNoticeSubmit} className="space-y-4">
              <div>
                <label className="block text-muted-foreground font-semibold mb-1">
                  Notice Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Sports Day Schedule"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-foreground font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-muted-foreground font-semibold mb-1">
                  Notice Description / Message *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide complete notice details and guidelines..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-foreground font-medium text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Audience Targeting Selectors */}
              <div className="p-3.5 rounded-xl bg-surface-2 border border-border space-y-3">
                <label className="block text-foreground font-bold">
                  Audience Targeting *
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "SCHOOL", label: "Entire School" },
                    { id: "TEACHERS", label: "Teachers" },
                    { id: "STUDENTS", label: "Students" },
                    { id: "PARENTS", label: "Parents" },
                    { id: "CLASS", label: "Specific Class" },
                    { id: "SECTION", label: "Specific Section" },
                  ].map((target) => (
                    <button
                      type="button"
                      key={target.id}
                      onClick={() => handleTargetTypeChange(target.id as any)}
                      className={`py-2 px-3 rounded-lg font-semibold text-center border transition-all ${
                        createForm.targetType === target.id
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-card border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {target.label}
                    </button>
                  ))}
                </div>

                {/* Class selector */}
                {(createForm.targetType === "CLASS" || createForm.targetType === "SECTION") && (
                  <div className="pt-2">
                    <label className="block text-muted-foreground font-semibold mb-1">
                      Select Class *
                    </label>
                    <select
                      required
                      value={createForm.targetClassId}
                      onChange={(e) => handleClassChange(e.target.value)}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground font-medium"
                    >
                      <option value="">-- Choose Class --</option>
                      {classes.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name} {c.code ? `(${c.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Section selector */}
                {createForm.targetType === "SECTION" && (
                  <div>
                    <label className="block text-muted-foreground font-semibold mb-1">
                      Select Section *
                    </label>
                    <select
                      required
                      value={createForm.targetSectionId}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, targetSectionId: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground font-medium"
                    >
                      <option value="">-- Choose Section --</option>
                      {sections.map((s) => (
                        <option key={s._id} value={s._id}>
                          Section {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Attachment */}
              <div className="space-y-2">
                <label className="block text-muted-foreground font-semibold">
                  Attachment Link / File URL (Optional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Document title (e.g. Schedule PDF)"
                    value={createForm.attachmentName}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, attachmentName: e.target.value })
                    }
                    className="px-3 py-2 bg-surface-2 border border-border rounded-lg text-foreground"
                  />
                  <input
                    type="url"
                    placeholder="https://..."
                    value={createForm.attachmentUrl}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, attachmentUrl: e.target.value })
                    }
                    className="px-3 py-2 bg-surface-2 border border-border rounded-lg text-foreground"
                  />
                </div>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-muted-foreground font-semibold mb-1">
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={createForm.expiresAt}
                  onChange={(e) => setCreateForm({ ...createForm, expiresAt: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-2 border border-border rounded-lg text-foreground"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Notice will automatically disappear from active audience feeds after this date.
                </p>
              </div>

              {/* Publish Toggle */}
              <div className="p-3 bg-surface-2 rounded-xl border border-border flex items-center justify-between">
                <div>
                  <span className="font-bold text-foreground block">Publish Immediately</span>
                  <span className="text-[10px] text-muted-foreground">
                    Dispatches in-app notifications to all target recipients right now.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={createForm.publishImmediately}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, publishImmediately: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg font-semibold text-foreground hover:bg-surface-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold shadow-xs"
                >
                  {isSubmitting
                    ? "Saving..."
                    : createForm.publishImmediately
                    ? "Publish Notice"
                    : "Save as Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
