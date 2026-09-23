"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle,
  CheckCheck,
  Clock,
  ExternalLink,
  Filter,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FileText,
  CreditCard,
  Award,
  CalendarCheck,
} from "lucide-react";

interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  referenceType: string;
  referenceId?: string;
  actionUrl?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export default function AdminNotificationCenterPage() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        filter,
        page: page.toString(),
        limit: "20",
      });

      const res = await fetch(`/api/admin/notifications?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load notifications");
      }

      setNotifications(json.data.notifications);
      setUnreadCount(json.data.unreadCount);
      setTotalRecords(json.data.total);
      setTotalPages(json.data.totalPages);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notificationId: string, actionUrl?: string) => {
    try {
      await fetch(`/api/admin/notifications/${notificationId}/read`, {
        method: "PATCH",
      });

      // Update state locally for immediate UI response
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      if (actionUrl) {
        router.push(actionUrl);
      }
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/admin/notifications/read-all", {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
        );
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Failed to mark all as read", err);
    } finally {
      setActionLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "NOTICE":
        return <Bell className="w-4 h-4 text-indigo-500" />;
      case "ASSIGNMENT":
        return <FileText className="w-4 h-4 text-amber-500" />;
      case "FEE":
        return <CreditCard className="w-4 h-4 text-emerald-500" />;
      case "RESULT":
      case "EXAM":
        return <Award className="w-4 h-4 text-purple-500" />;
      case "ATTENDANCE":
        return <CalendarCheck className="w-4 h-4 text-teal-500" />;
      default:
        return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-primary" />
            <span>Notification Center</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            In-app announcements, urgent circulars, and institutional activity alerts.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={actionLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-foreground transition cursor-pointer"
          >
            <CheckCheck className="w-4 h-4 text-emerald-500" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setFilter("ALL");
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              filter === "ALL"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
            }`}
          >
            All Alerts ({totalRecords})
          </button>

          <button
            onClick={() => {
              setFilter("UNREAD");
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              filter === "UNREAD"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  filter === "UNREAD"
                    ? "bg-white text-primary"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <span className="text-[11px] text-muted-foreground hidden sm:block">
          Showing real-time system alerts
        </span>
      </div>

      {/* Notifications List Container */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs font-medium">Loading notification stream...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-500 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <p className="text-xs font-medium">{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-2 flex items-center justify-center mx-auto text-muted-foreground">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">You're all caught up!</p>
              <p className="text-xs max-w-sm mx-auto text-muted-foreground">
                {filter === "UNREAD"
                  ? "No unread alerts pending in your inbox."
                  : "No notifications have been received yet."}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((item) => (
              <div
                key={item._id}
                onClick={() => handleMarkAsRead(item._id, item.actionUrl)}
                className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition cursor-pointer ${
                  !item.isRead
                    ? "bg-primary/5 hover:bg-primary/10"
                    : "hover:bg-surface-2/60"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                      !item.isRead
                        ? "bg-primary/15 text-primary"
                        : "bg-surface-2 text-muted-foreground"
                    }`}
                  >
                    {getNotificationIcon(item.type)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-xs font-bold leading-tight ${
                          !item.isRead ? "text-foreground" : "text-foreground/80"
                        }`}
                      >
                        {item.title}
                      </h3>
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.message}
                    </p>

                    <div className="flex items-center gap-3 pt-1 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" />
                        {new Date(item.createdAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {item.actionUrl && (
                        <span className="text-primary font-semibold hover:underline flex items-center gap-0.5">
                          View details <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!item.isRead && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(item._id);
                    }}
                    className="text-[10px] font-semibold text-muted-foreground hover:text-primary shrink-0 px-2 py-1 rounded-lg border border-border bg-card hover:bg-surface-2 transition"
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Page {page} of {totalPages} ({totalRecords} items)
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
    </div>
  );
}
