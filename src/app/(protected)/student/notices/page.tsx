"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Megaphone,
  Calendar,
  Paperclip,
  FileText,
  ExternalLink,
  Download,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";

interface NoticeAttachment {
  name: string;
  url: string;
  mimeType: string;
  size: number | null;
  type: string;
}

interface NoticeItem {
  _id: string;
  title: string;
  description: string;
  targetType: string;
  attachments: NoticeAttachment[];
  publishedAt: string;
}

export default function StudentNoticesPage() {
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(null);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/student/notices");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load circulars");
      }
      setNotices(json.data.notices || []);
    } catch (err: any) {
      console.error("Error fetching notices:", err);
      setError(err.message || "Network error loading notices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const filteredNotices = notices.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Loading school notices & circulars...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            School Notices & Circulars
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Important announcements, holiday circulars, and notifications from school administration.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search circulars..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-border text-xs focus:outline-hidden focus:ring-2 focus:ring-primary text-foreground"
          />
        </div>
      </div>

      {/* Notices List */}
      {filteredNotices.length === 0 ? (
        <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-surface-2 text-muted-foreground flex items-center justify-center mx-auto">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground">No Notices Found</h3>
          <p className="text-xs text-muted-foreground">
            {searchQuery
              ? "No circulars matched your search query."
              : "There are currently no published circulars for your student profile."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotices.map((notice) => (
            <div
              key={notice._id}
              className="p-5 sm:p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all flex flex-col justify-between space-y-4 shadow-xs"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                    {notice.targetType}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(notice.publishedAt)}</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-foreground line-clamp-2">{notice.title}</h3>
                <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-3">
                  {notice.description}
                </p>
              </div>

              {/* Attachments / Footer */}
              <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {notice.attachments && notice.attachments.length > 0 ? (
                    <span className="inline-flex items-center gap-1 font-medium text-foreground">
                      <Paperclip className="w-3.5 h-3.5 text-primary" />
                      <span>{notice.attachments.length} attachment{notice.attachments.length === 1 ? "" : "s"}</span>
                    </span>
                  ) : (
                    <span className="text-[11px]">No attachments</span>
                  )}
                </div>

                <button
                  onClick={() => setSelectedNotice(notice)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-xs font-semibold text-foreground transition-colors cursor-pointer"
                >
                  <span>Read Full</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notice Detail Modal */}
      {selectedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-card border border-border rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                  {selectedNotice.targetType} Notice
                </span>
                <h2 className="text-lg font-bold text-foreground mt-2">{selectedNotice.title}</h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Published on {formatDate(selectedNotice.publishedAt)}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedNotice(null)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs sm:text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {selectedNotice.description}
            </div>

            {/* Attachments */}
            {selectedNotice.attachments && selectedNotice.attachments.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Attachments</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedNotice.attachments.map((att, idx) => (
                    <a
                      key={idx}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-xl bg-surface-1 hover:bg-surface-2 border border-border transition-colors text-xs text-foreground font-medium"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate">{att.name}</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-2" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
