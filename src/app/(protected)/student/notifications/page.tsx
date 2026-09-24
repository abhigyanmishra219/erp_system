"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellRing,
  CheckCheck,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  RefreshCw,
  FileText,
  GraduationCap,
  Calendar,
  CreditCard,
  BookOpen,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Inbox,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface NotificationItem {
  _id: string;
  type: "NOTICE" | "ASSIGNMENT" | "ATTENDANCE" | "RESULT" | "FEE" | "EXAM" | "TIMETABLE" | "LEAVE";
  title: string;
  message: string;
  referenceType?: string;
  referenceId?: string | null;
  actionUrl?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export default function StudentNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  // Filters & Pagination
  const [filterStatus, setFilterStatus] = useState<"ALL" | "UNREAD" | "READ">("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      params.set("limit", "15");

      if (filterStatus !== "ALL") {
        params.set("filter", filterStatus);
      }
      if (filterType !== "ALL") {
        params.set("type", filterType);
      }

      const res = await fetch(`/api/student/notifications?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load notifications");

      const json = await res.json();
      if (json.success && json.data) {
        setNotifications(json.data.notifications || []);
        setTotalPages(json.data.totalPages || 1);
        setTotalCount(json.data.total || 0);
        setUnreadCount(json.data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterStatus, filterType]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setMarkingId(id);
      const res = await fetch(`/api/student/notifications/${id}/read`, {
        method: "POST",
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAll(true);
      const res = await fetch("/api/student/notifications/read-all", {
        method: "POST",
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
        );
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    } finally {
      setMarkingAll(false);
    }
  };

  const getActionTarget = (notif: NotificationItem) => {
    if (notif.actionUrl) {
      // If actionUrl starts with /admin, map to /student
      if (notif.actionUrl.startsWith("/admin/notices")) return "/student/notices";
      return notif.actionUrl;
    }
    switch (notif.type) {
      case "RESULT":
        return "/student/report-cards";
      case "ASSIGNMENT":
        return "/student/assignments";
      case "NOTICE":
        return "/student/notices";
      case "EXAM":
        return "/student/exams";
      case "FEE":
        return "/student/fees";
      case "ATTENDANCE":
        return "/student/attendance";
      case "TIMETABLE":
        return "/student/timetable";
      default:
        return null;
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      await handleMarkAsRead(notif._id);
    }
    const target = getActionTarget(notif);
    if (target) {
      router.push(target);
    }
  };

  const getTypeIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "RESULT":
        return <GraduationCap className="w-4 h-4 text-emerald-500" />;
      case "ASSIGNMENT":
        return <FileText className="w-4 h-4 text-blue-500" />;
      case "NOTICE":
        return <Megaphone className="w-4 h-4 text-purple-500" />;
      case "EXAM":
        return <Calendar className="w-4 h-4 text-amber-500" />;
      case "FEE":
        return <CreditCard className="w-4 h-4 text-rose-500" />;
      case "ATTENDANCE":
        return <CheckCircle2 className="w-4 h-4 text-teal-500" />;
      case "TIMETABLE":
        return <BookOpen className="w-4 h-4 text-indigo-500" />;
      default:
        return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  const getTypeBadgeClass = (type: NotificationItem["type"]) => {
    switch (type) {
      case "RESULT":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "ASSIGNMENT":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "NOTICE":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "EXAM":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "FEE":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "ATTENDANCE":
        return "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20";
      case "TIMETABLE":
        return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
      default:
        return "bg-primary/10 text-primary border-primary/20";
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

    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return notif.title.toLowerCase().includes(q) || notif.message.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-card via-card to-primary/5 border border-border p-6 rounded-3xl shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <BellRing className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Notification Center
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Stay informed with real-time academic alerts, exam publications, report cards, and school notices.
          </p>
        </div>

        {/* Unread & Mark All Actions */}
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              disabled={markingAll}
              onClick={handleMarkAllAsRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {markingAll ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCheck className="w-3.5 h-3.5" />
              )}
              <span>Mark all as read</span>
            </button>
          )}

          <button
            type="button"
            onClick={fetchNotifications}
            title="Refresh notifications"
            className="p-2.5 rounded-2xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Stat Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Total Alerts</div>
            <div className="text-lg sm:text-xl font-bold text-foreground">{totalCount}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Unread</div>
            <div className="text-lg sm:text-xl font-bold text-foreground">{unreadCount}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Read Status</div>
            <div className="text-lg sm:text-xl font-bold text-foreground">
              {totalCount > 0 ? `${Math.round(((totalCount - unreadCount) / totalCount) * 100)}%` : "100%"}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="p-4 rounded-3xl bg-card border border-border flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search alerts by title or description..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-2xl bg-background border border-border focus:outline-hidden focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Read / Unread Status Filter */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted border border-border">
          {(["ALL", "UNREAD", "READ"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => {
                setFilterStatus(status);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterStatus === status
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {status === "ALL" ? "All" : status === "UNREAD" ? `Unread (${unreadCount})` : "Read"}
            </button>
          ))}
        </div>

        {/* Category Type Filter */}
        <select
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 text-xs rounded-2xl bg-background border border-border text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 cursor-pointer"
        >
          <option value="ALL">All Categories</option>
          <option value="RESULT">Report Cards & Results</option>
          <option value="NOTICE">School Notices</option>
          <option value="ASSIGNMENT">Assignments</option>
          <option value="EXAM">Exams</option>
          <option value="FEE">Fee Updates</option>
          <option value="ATTENDANCE">Attendance</option>
          <option value="TIMETABLE">Timetable</option>
        </select>
      </div>

      {/* 4. Notification Items List */}
      {loading ? (
        <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground font-medium">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-14 rounded-3xl bg-card border border-border text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Inbox className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-foreground">No notifications</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You're all caught up. New alerts and school updates will appear here.
            </p>
          </div>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="p-10 rounded-3xl bg-card border border-border text-center space-y-2">
          <p className="text-xs text-muted-foreground">No notifications match your current filters.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setFilterStatus("ALL");
              setFilterType("ALL");
            }}
            className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => {
            const actionTarget = getActionTarget(notif);
            const isItemMarking = markingId === notif._id;

            return (
              <div
                key={notif._id}
                onClick={() => handleNotificationClick(notif)}
                className={`group p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-start justify-between gap-4 shadow-2xs ${
                  !notif.isRead
                    ? "bg-card border-primary/40 hover:border-primary/70 shadow-xs ring-1 ring-primary/10"
                    : "bg-card/70 hover:bg-card border-border hover:border-border/80"
                }`}
              >
                {/* Left Side: Category Icon & Content */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  {/* Category Indicator Icon */}
                  <div
                    className={`p-2.5 rounded-2xl shrink-0 border mt-0.5 ${getTypeBadgeClass(
                      notif.type
                    )}`}
                  >
                    {getTypeIcon(notif.type)}
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getTypeBadgeClass(
                          notif.type
                        )}`}
                      >
                        {notif.type}
                      </span>

                      {!notif.isRead && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow-2xs">
                          New
                        </span>
                      )}

                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(notif.createdAt)}</span>
                      </span>
                    </div>

                    <h3
                      className={`text-sm sm:text-base leading-snug group-hover:text-primary transition-colors ${
                        !notif.isRead
                          ? "font-bold text-foreground"
                          : "font-semibold text-foreground/90"
                      }`}
                    >
                      {notif.title}
                    </h3>

                    <p className="text-xs text-muted-foreground leading-relaxed break-words whitespace-pre-line">
                      {notif.message}
                    </p>
                  </div>
                </div>

                {/* Right Side: Actions */}
                <div
                  className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-start gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50"
                  onClick={(e) => e.stopPropagation()}
                >
                  {actionTarget && (
                    <Link
                      href={actionTarget}
                      onClick={async () => {
                        if (!notif.isRead) {
                          await handleMarkAsRead(notif._id);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors shadow-2xs"
                    >
                      <span>
                        {notif.type === "RESULT"
                          ? "View Report Card"
                          : notif.type === "NOTICE"
                          ? "View Notice"
                          : notif.type === "ASSIGNMENT"
                          ? "View Assignment"
                          : notif.type === "EXAM"
                          ? "View Exam"
                          : notif.type === "FEE"
                          ? "View Fees"
                          : "View Details"}
                      </span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}

                  {!notif.isRead && (
                    <button
                      type="button"
                      disabled={isItemMarking}
                      onClick={(e) => handleMarkAsRead(notif._id, e)}
                      title="Mark as read"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      {isItemMarking ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <CheckCheck className="w-3 h-3" />
                      )}
                      <span>Mark read</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 rounded-3xl bg-card border border-border flex items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">
            Showing Page <span className="font-bold text-foreground">{currentPage}</span> of{" "}
            <span className="font-bold text-foreground">{totalPages}</span> ({totalCount} total alerts)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-background border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              disabled={currentPage >= totalPages || loading}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-background border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
