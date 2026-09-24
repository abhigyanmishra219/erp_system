"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Bell,
  CheckCircle2,
  Trash2,
  CheckCheck,
  AlertCircle,
  RefreshCw,
  Clock,
  BookOpen,
  Calendar,
  CreditCard,
  FileCheck2,
  FileText,
  CalendarCheck,
  Info,
  Sparkles,
} from "lucide-react";

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export default function ParentNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Filters & Pagination
  const [activeTab, setActiveTab] = useState<"ALL" | "UNREAD" | "READ">("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/parent/notifications/unread-count");
      const json = await res.json();
      if (res.ok && json.success) {
        setUnreadCount(json.data?.count || 0);
      }
    } catch (err) {
      console.error("Error loading unread count:", err);
    }
  }, []);

  const fetchNotifications = useCallback(
    async (currentPage: number, tab: "ALL" | "UNREAD" | "READ", typeFilter: string) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("page", currentPage.toString());
        params.set("limit", "15");
        if (tab !== "ALL") params.set("filter", tab);
        if (typeFilter !== "ALL") params.set("type", typeFilter);

        const res = await fetch(`/api/parent/notifications?${params.toString()}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || json.message || "Failed to load notifications");
        }

        setNotifications(json.data?.notifications || []);
        setTotalPages(json.data?.pagination?.totalPages || 1);
        if (json.data?.unreadCount !== undefined) {
          setUnreadCount(json.data.unreadCount);
        }
      } catch (err: any) {
        console.error("Error loading notifications:", err);
        setError(err.message || "Could not fetch notifications");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchNotifications(page, activeTab, selectedType);
    fetchUnreadCount();
  }, [page, activeTab, selectedType, fetchNotifications, fetchUnreadCount]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/parent/notifications/${id}`, {
        method: "PATCH",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch("/api/parent/notifications/read-all", {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      const res = await fetch(`/api/parent/notifications/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setNotifications((prev) => prev.filter((n) => n._id !== id));
        fetchUnreadCount();
      }
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getTypeIcon = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes("FEE")) return <CreditCard className="w-4 h-4 text-emerald-600" />;
    if (t.includes("ATTENDANCE")) return <CalendarCheck className="w-4 h-4 text-blue-600" />;
    if (t.includes("ASSIGNMENT")) return <BookOpen className="w-4 h-4 text-indigo-600" />;
    if (t.includes("RESULT")) return <FileCheck2 className="w-4 h-4 text-purple-600" />;
    if (t.includes("EXAM")) return <Calendar className="w-4 h-4 text-amber-600" />;
    if (t.includes("NOTICE") || t.includes("CIRCULAR")) return <FileText className="w-4 h-4 text-sky-600" />;
    return <Bell className="w-4 h-4 text-slate-600" />;
  };

  const getTypeBadge = (type: string) => {
    const t = type.toUpperCase();
    let bg = "bg-slate-100 text-slate-700";
    if (t.includes("FEE")) bg = "bg-emerald-50 text-emerald-700 border border-emerald-200";
    else if (t.includes("ATTENDANCE")) bg = "bg-blue-50 text-blue-700 border border-blue-200";
    else if (t.includes("ASSIGNMENT")) bg = "bg-indigo-50 text-indigo-700 border border-indigo-200";
    else if (t.includes("RESULT")) bg = "bg-purple-50 text-purple-700 border border-purple-200";
    else if (t.includes("EXAM")) bg = "bg-amber-50 text-amber-700 border border-amber-200";
    else if (t.includes("NOTICE")) bg = "bg-sky-50 text-sky-700 border border-sky-200";

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${bg}`}>
        {type.replace(/_/g, " ")}
      </span>
    );
  };

  const categories = [
    { label: "All Categories", value: "ALL" },
    { label: "Fees", value: "FEE" },
    { label: "Attendance", value: "ATTENDANCE" },
    { label: "Assignments", value: "ASSIGNMENT" },
    { label: "Results", value: "RESULT" },
    { label: "Exams", value: "EXAM" },
    { label: "Notices", value: "NOTICE" },
    { label: "General", value: "GENERAL" },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <Bell className="h-4 w-4" />
            <span>Alerts &amp; Updates</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            Personal updates regarding fees, attendance alerts, exam schedules, and results.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl border border-indigo-200 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark all read</span>
            </button>
          )}

          <button
            onClick={() => {
              fetchNotifications(page, activeTab, selectedType);
              fetchUnreadCount();
            }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Category Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => {
              setActiveTab("ALL");
              setPage(1);
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All
          </button>
          <button
            onClick={() => {
              setActiveTab("UNREAD");
              setPage(1);
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "UNREAD" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab("READ");
              setPage(1);
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "READ" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Read
          </button>
        </div>

        {/* Category Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500 hidden sm:inline">Category:</label>
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-700"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-white rounded-2xl border border-slate-200 animate-pulse" />
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

      {/* Notifications List */}
      {!loading && !error && (
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 mb-1">No Notifications</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {activeTab === "UNREAD"
                  ? "You have read all your notifications."
                  : "There are no notifications matching your selected criteria."}
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n._id}
                className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                  !n.isRead
                    ? "bg-white border-indigo-200 shadow-sm ring-1 ring-indigo-500/10"
                    : "bg-white/80 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                      !n.isRead ? "bg-indigo-50 ring-2 ring-indigo-100" : "bg-slate-100"
                    }`}
                  >
                    {getTypeIcon(n.type)}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {getTypeBadge(n.type)}
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0"></span>
                      )}
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(n.createdAt)}
                      </span>
                    </div>

                    <h3 className={`text-sm font-bold truncate ${!n.isRead ? "text-slate-900" : "text-slate-700"}`}>
                      {n.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed break-words">
                      {n.message}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 self-center sm:self-auto">
                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(n._id)}
                      title="Mark as read"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteNotification(n._id)}
                    title="Delete notification"
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 bg-white p-3 rounded-2xl border border-slate-200">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs text-slate-500 font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
