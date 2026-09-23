"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ArrowLeft,
  Calendar,
  Clock,
  Paperclip,
  Users,
  Send,
  Archive,
  Edit2,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  User,
  ShieldCheck,
  FileText,
} from "lucide-react";

interface NoticeDetail {
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
  updatedBy?: { name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export default function AdminNoticeDetailPage({
  params,
}: {
  params: Promise<{ noticeId: string }>;
}) {
  const { noticeId } = use(params);
  const router = useRouter();

  const [notice, setNotice] = useState<NoticeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function fetchNoticeDetail() {
      if (!noticeId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/admin/notices/${noticeId}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Failed to load notice details");
        }
        setNotice(json.data.notice);
      } catch (err: any) {
        setError(err.message || "Failed to fetch notice");
      } finally {
        setLoading(false);
      }
    }

    fetchNoticeDetail();
  }, [noticeId]);

  const handlePublish = async () => {
    if (!confirm("Are you sure you want to publish this notice? In-app notifications will be delivered to the target audience.")) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/notices/${noticeId}/publish`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to publish notice");
      }
      setNotice(json.data.notice);
      alert(json.message || "Notice published successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to publish notice");
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm("Are you sure you want to archive this notice?")) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/notices/${noticeId}/archive`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to archive notice");
      }
      setNotice(json.data.notice);
    } catch (err: any) {
      alert(err.message || "Failed to archive notice");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading notice details...</p>
      </div>
    );
  }

  if (error || !notice) {
    return (
      <div className="py-24 text-center text-muted-foreground flex flex-col items-center justify-center gap-4">
        <AlertCircle className="h-10 w-10 text-rose-500" />
        <h2 className="text-xl font-bold text-foreground">Notice Not Found</h2>
        <p className="text-sm max-w-md">{error || "Could not retrieve the specified notice."}</p>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" /> Go Back
        </button>
      </div>
    );
  }

  const isExpired = notice.expiresAt && new Date(notice.expiresAt) < new Date();

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <Link
          href="/admin/notices"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-surface-2 text-foreground transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Notices
        </Link>

        <div className="flex items-center gap-2">
          {notice.status === "DRAFT" && (
            <button
              onClick={handlePublish}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publish Notice</span>
            </button>
          )}

          {notice.status !== "ARCHIVED" && (
            <button
              onClick={handleArchive}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-surface-2 text-rose-600 dark:text-rose-400 transition cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archive</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Notice Paper View */}
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-10 shadow-sm space-y-6">
        {/* Header Badges & Title */}
        <div className="space-y-3 border-b border-border pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                notice.status === "PUBLISHED" && !isExpired
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : notice.status === "DRAFT"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  : isExpired
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                  : "bg-slate-500/10 text-slate-600 dark:text-slate-400"
              }`}
            >
              {isExpired ? "EXPIRED" : notice.status}
            </span>

            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              Audience: {notice.targetType}
              {notice.targetClassId && ` (${notice.targetClassId.name})`}
              {notice.targetSectionId && ` - Sec ${notice.targetSectionId.name}`}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            {notice.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>
                Published:{" "}
                <strong className="text-foreground">
                  {notice.publishedAt
                    ? new Date(notice.publishedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "Draft"}
                </strong>
              </span>
            </div>

            {notice.expiresAt && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  Expires:{" "}
                  <strong className="text-foreground">
                    {new Date(notice.expiresAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Notice Body Content */}
        <div className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap py-2 font-normal">
          {notice.description}
        </div>

        {/* Attachments Section */}
        {notice.attachments && notice.attachments.length > 0 && (
          <div className="p-4 rounded-2xl bg-surface-2 border border-border space-y-3">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
              <Paperclip className="w-3.5 h-3.5 text-primary" />
              <span>Official Attachments ({notice.attachments.length})</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {notice.attachments.map((att, idx) => (
                <a
                  key={idx}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-card border border-border hover:border-primary/40 flex items-center justify-between gap-3 text-xs transition group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-semibold text-foreground truncate">{att.name}</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Audit / Author Metadata Footer */}
        <div className="pt-6 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5" />
            <span>Author: <strong>{notice.createdBy?.name || "School Administration"}</strong></span>
          </div>

          <div>
            <span>Created on: {new Date(notice.createdAt).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
