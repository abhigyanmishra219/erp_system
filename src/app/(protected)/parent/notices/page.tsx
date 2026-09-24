"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParentChild } from "@/context/ParentChildContext";
import ChildSwitcher from "../components/ChildSwitcher";
import {
  Bell,
  Search,
  Calendar,
  Paperclip,
  FileText,
  AlertCircle,
  RefreshCw,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Building,
  Users,
  GraduationCap,
} from "lucide-react";

interface NoticeAttachment {
  name: string;
  url: string;
  mimeType?: string;
  size?: number | null;
  type: "FILE" | "EXTERNAL_LINK";
}

interface NoticeItem {
  _id: string;
  title: string;
  description: string;
  targetType: "SCHOOL" | "TEACHERS" | "STUDENTS" | "PARENTS" | "CLASS" | "SECTION";
  targetRoles: string[];
  attachments: NoticeAttachment[];
  publishedAt: string;
  expiresAt: string | null;
}

export default function ParentNoticesPage() {
  const { children, selectedChild, selectedChildId, isLoading: isChildrenLoading } = useParentChild();

  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchNotices = useCallback(async (studentId: string, search: string = "") => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("studentId", studentId);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/parent/notices?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || json.message || "Failed to load school announcements");
      }

      setNotices(json.data?.notices || []);
      if (json.data?.notices && json.data.notices.length > 0) {
        setExpandedId(json.data.notices[0]._id);
      }
    } catch (err: any) {
      console.error("Error loading parent notices:", err);
      setError(err.message || "Could not load notices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      fetchNotices(selectedChildId, searchQuery);
    }
  }, [selectedChildId, searchQuery, fetchNotices]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getTargetBadge = (targetType: string) => {
    switch (targetType) {
      case "SCHOOL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Building className="w-3 h-3" />
            School-wide
          </span>
        );
      case "PARENTS":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Users className="w-3 h-3" />
            Parent Notice
          </span>
        );
      case "CLASS":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <GraduationCap className="w-3 h-3" />
            Class Notice
          </span>
        );
      case "SECTION":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <GraduationCap className="w-3 h-3" />
            Section Notice
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            Notice
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header with ChildSwitcher */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <Bell className="h-4 w-4" />
            <span>Official Communications</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notices &amp; Announcements</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            School-wide circulars, parent notices, and class-level announcements.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <ChildSwitcher />
          {selectedChildId && (
            <button
              onClick={() => fetchNotices(selectedChildId, searchQuery)}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* No Children Guard */}
      {!isChildrenLoading && (!children || children.length === 0) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No Linked Students Found</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Your parent account is not currently linked to any active student records in the school system.
          </p>
        </div>
      )}

      {/* Search Bar */}
      {selectedChildId && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search circulars, subject, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error Alert */}
      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Notices List */}
      {!loading && !error && selectedChildId && (
        <div className="space-y-4">
          {notices.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 mb-1">No Notices Published</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                There are no active school circulars matching your criteria at this moment.
              </p>
            </div>
          ) : (
            notices.map((n) => {
              const isExpanded = expandedId === n._id;
              return (
                <div
                  key={n._id}
                  className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                    isExpanded
                      ? "border-indigo-500 shadow-md ring-2 ring-indigo-50"
                      : "border-slate-200 hover:border-slate-300 shadow-sm"
                  }`}
                >
                  <div
                    onClick={() => toggleExpand(n._id)}
                    className="p-5 cursor-pointer flex flex-col sm:flex-row sm:items-start justify-between gap-4 select-none hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {getTargetBadge(n.targetType)}
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(n.publishedAt)}
                        </span>
                        {n.expiresAt && (
                          <span className="flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />
                            Valid until {formatDate(n.expiresAt)}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900">{n.title}</h3>
                      {!isExpanded && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {n.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {n.attachments.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-600">
                          <Paperclip className="w-3.5 h-3.5" />
                          {n.attachments.length} {n.attachments.length === 1 ? "File" : "Files"}
                        </span>
                      )}
                      <div className="p-1.5 text-slate-400">
                        <ChevronDown
                          className={`w-5 h-5 transition-transform duration-200 ${
                            isExpanded ? "rotate-180 text-indigo-600" : ""
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 p-5 bg-slate-50/50 space-y-4">
                      <div className="bg-white p-5 rounded-xl border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {n.description}
                      </div>

                      {n.attachments.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Attached Files &amp; Resources
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {n.attachments.map((att, idx) => (
                              <a
                                key={idx}
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-3 bg-white hover:bg-indigo-50/50 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all flex items-center justify-between group"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <span className="text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                                    {att.name}
                                  </span>
                                </div>
                                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0 ml-2" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
