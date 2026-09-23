"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Bell,
  Calendar,
  Clock,
  FileText,
  Paperclip,
  ExternalLink,
  Search,
  Filter,
  Users,
  Building2,
  GraduationCap,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Lock,
  ChevronRight,
  Eye,
  X,
  Layers,
  Inbox,
  CheckCheck,
} from "lucide-react";

interface NoticeAttachment {
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
  type?: string;
}

interface NoticeItem {
  _id: string;
  title: string;
  description: string;
  targetType: "SCHOOL" | "TEACHERS" | "STUDENTS" | "PARENTS" | "CLASS" | "SECTION";
  targetClass?: { _id: string; name: string } | null;
  targetSection?: { _id: string; name: string } | null;
  targetRoles: string[];
  attachments: NoticeAttachment[];
  publishedAt: string;
  expiresAt?: string | null;
  publisher?: { name: string; role: string } | null;
}

interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function TeacherNoticesPage() {
  const [mainTab, setMainTab] = useState<"notices" | "notifications">("notices");

  // Notices state
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [summary, setSummary] = useState({
    totalNotices: 0,
    schoolNoticesCount: 0,
    teacherNoticesCount: 0,
    classNoticesCount: 0,
  });
  const [loadingNotices, setLoadingNotices] = useState(true);
  const [noticeError, setNoticeError] = useState<string | null>(null);
  const [noticeFilter, setNoticeFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [notifFilter, setNotifFilter] = useState<"ALL" | "UNREAD">("ALL");

  const fetchNotices = async () => {
    try {
      setLoadingNotices(true);
      setNoticeError(null);
      const res = await fetch("/api/teacher/notices");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load notices");
      }
      setNotices(json.data.notices || []);
      setSummary(json.data.summary);
    } catch (err: any) {
      setNoticeError(err.message || "An error occurred");
    } finally {
      setLoadingNotices(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoadingNotifs(true);
      const res = await fetch(`/api/teacher/notifications?filter=${notifFilter}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setNotifications(json.data.notifications || []);
        setUnreadCount(json.data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchNotices();
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (mainTab === "notifications") {
      fetchNotifications();
    }
  }, [mainTab, notifFilter]);

  const handleMarkAsRead = async (notifId: string) => {
    try {
      const res = await fetch(`/api/teacher/notifications/${notifId}/read`, {
        method: "POST",
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === notifId ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch("/api/teacher/notifications/read-all", {
        method: "POST",
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const filteredNotices = useMemo(() => {
    return notices.filter((n) => {
      if (noticeFilter === "SCHOOL" && n.targetType !== "SCHOOL") return false;
      if (
        noticeFilter === "TEACHERS" &&
        n.targetType !== "TEACHERS" &&
        !n.targetRoles.includes("TEACHER")
      ) {
        return false;
      }
      if (
        noticeFilter === "CLASS" &&
        n.targetType !== "CLASS" &&
        n.targetType !== "SECTION"
      ) {
        return false;
      }

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = n.title.toLowerCase().includes(query);
        const matchesDesc = n.description.toLowerCase().includes(query);
        return matchesTitle || matchesDesc;
      }

      return true;
    });
  }, [notices, noticeFilter, searchTerm]);

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
              School Communications
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-md border border-border">
              <Lock className="w-3 h-3 text-muted-foreground/70" />
              Read-Only
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Notices & Notifications
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Official circulars, staff announcements, and personal alert stream.
          </p>
        </div>

        {/* View Switcher */}
        <div className="inline-flex items-center p-1 rounded-2xl bg-muted/70 border border-border shadow-xs">
          <button
            onClick={() => setMainTab("notices")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              mainTab === "notices"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-cyan-500" />
            <span>Circulars & Notices</span>
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-[10px] font-black">
              {summary.totalNotices}
            </span>
          </button>
          <button
            onClick={() => setMainTab("notifications")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              mainTab === "notifications"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-amber-500" />
            <span>In-App Alerts</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: NOTICES & CIRCULARS */}
      {mainTab === "notices" && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-black text-foreground tracking-tight">
                  {summary.totalNotices}
                </div>
                <div className="text-[11px] font-medium text-muted-foreground">
                  Active Circulars
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-black text-foreground tracking-tight">
                  {summary.schoolNoticesCount}
                </div>
                <div className="text-[11px] font-medium text-muted-foreground">
                  School-wide
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-black text-foreground tracking-tight">
                  {summary.teacherNoticesCount}
                </div>
                <div className="text-[11px] font-medium text-muted-foreground">
                  Faculty Only
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-black text-foreground tracking-tight">
                  {summary.classNoticesCount}
                </div>
                <div className="text-[11px] font-medium text-muted-foreground">
                  Class Assigned
                </div>
              </div>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-2 rounded-2xl border border-border">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
              {[
                { key: "ALL", label: "All Notices", count: summary.totalNotices },
                { key: "SCHOOL", label: "Entire School", count: summary.schoolNoticesCount },
                { key: "TEACHERS", label: "Faculty Only", count: summary.teacherNoticesCount },
                { key: "CLASS", label: "Class / Section", count: summary.classNoticesCount },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setNoticeFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    noticeFilter === tab.key
                      ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="px-1.5 py-0.2 rounded-md bg-muted text-[10px]">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search circulars..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-muted/60 border border-border focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 text-foreground"
              />
            </div>
          </div>

          {/* Notice Cards List */}
          {loadingNotices ? (
            <div className="p-16 rounded-3xl bg-card border border-border text-center space-y-3">
              <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-muted-foreground">Loading notices...</p>
            </div>
          ) : noticeError ? (
            <div className="p-8 rounded-3xl bg-destructive/10 border border-destructive/20 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
              <div className="text-sm font-bold text-destructive">{noticeError}</div>
              <button
                onClick={fetchNotices}
                className="px-4 py-1.5 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold hover:opacity-90"
              >
                Retry
              </button>
            </div>
          ) : filteredNotices.length === 0 ? (
            <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3">
              <Inbox className="w-10 h-10 text-muted-foreground mx-auto" />
              <h3 className="text-sm font-bold text-foreground">No Circulars Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No active announcements match the selected audience filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredNotices.map((notice) => {
                const isSchool = notice.targetType === "SCHOOL";
                const isTeachers =
                  notice.targetType === "TEACHERS" ||
                  notice.targetRoles.includes("TEACHER");
                const isClass =
                  notice.targetType === "CLASS" || notice.targetType === "SECTION";

                return (
                  <div
                    key={notice._id}
                    className="p-5 rounded-3xl bg-card border border-border hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-4 shadow-xs"
                  >
                    <div className="space-y-3">
                      {/* Audience Badge & Date */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider border ${
                            isSchool
                              ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                              : isTeachers
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {isSchool
                            ? "Entire School"
                            : isTeachers
                            ? "Faculty & Staff"
                            : notice.targetClass
                            ? `Class: ${notice.targetClass.name}`
                            : "Class Specific"}
                        </span>

                        <span className="text-[11px] text-muted-foreground font-medium inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-cyan-500" />
                          {new Date(notice.publishedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      {/* Notice Title */}
                      <h3 className="text-base font-black text-foreground tracking-tight">
                        {notice.title}
                      </h3>

                      {/* Description Snippet */}
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {notice.description}
                      </p>
                    </div>

                    {/* Footer Info & Actions */}
                    <div className="pt-3 border-t border-border flex items-center justify-between gap-2 text-xs">
                      {notice.attachments && notice.attachments.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
                          <Paperclip className="w-3 h-3" />
                          {notice.attachments.length}{" "}
                          {notice.attachments.length === 1 ? "File" : "Files"}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">No attachments</span>
                      )}

                      <button
                        onClick={() => setSelectedNotice(notice)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold transition-all"
                      >
                        <Eye className="w-3.5 h-3.5 text-cyan-500" />
                        <span>Read Notice</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: IN-APP ALERTS & NOTIFICATIONS */}
      {mainTab === "notifications" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setNotifFilter("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  notifFilter === "ALL"
                    ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Alerts
              </button>
              <button
                onClick={() => setNotifFilter("UNREAD")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  notifFilter === "UNREAD"
                    ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Unread Only ({unreadCount})
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-secondary-foreground text-xs font-bold hover:bg-secondary/80 transition-all self-start sm:self-auto"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark All as Read</span>
              </button>
            )}
          </div>

          {loadingNotifs ? (
            <div className="p-16 rounded-3xl bg-card border border-border text-center space-y-3">
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-muted-foreground">Loading alerts stream...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-foreground">You're all caught up!</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No alerts or unread notifications at this time.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n._id}
                  className={`p-4 rounded-2xl bg-card border transition-all flex items-start justify-between gap-4 ${
                    !n.isRead
                      ? "border-amber-500/40 bg-amber-500/5 shadow-xs"
                      : "border-border opacity-85"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        !n.isRead
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Bell className="w-4 h-4" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-foreground">{n.title}</span>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {n.message}
                      </p>
                      <div className="text-[10px] text-muted-foreground/80 pt-0.5">
                        {new Date(n.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>

                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(n._id)}
                      className="px-2.5 py-1 rounded-lg bg-muted text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/80 shrink-0"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* NOTICE DETAIL MODAL */}
      {selectedNotice && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-card border border-border shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-foreground">Official Circular</h2>
                  <p className="text-xs text-muted-foreground">
                    Published by {selectedNotice.publisher?.name || "School Administration"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedNotice(null)}
                className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase">
                    {selectedNotice.targetType}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(selectedNotice.publishedAt).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <h3 className="text-lg font-black text-foreground tracking-tight">
                  {selectedNotice.title}
                </h3>
              </div>

              {/* Description Body */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                {selectedNotice.description}
              </div>

              {/* Attachments */}
              {selectedNotice.attachments && selectedNotice.attachments.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <span className="text-xs font-bold text-foreground">
                    Attached Documents & Media:
                  </span>
                  <div className="space-y-2">
                    {selectedNotice.attachments.map((att, idx) => (
                      <a
                        key={idx}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3 rounded-2xl bg-card border border-border hover:border-cyan-500/40 text-xs font-bold text-foreground hover:text-cyan-600 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <Paperclip className="w-4 h-4 text-cyan-500 shrink-0" />
                          <span className="truncate">{att.name}</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex justify-end">
              <button
                onClick={() => setSelectedNotice(null)}
                className="px-5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-xs font-bold text-foreground"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
