"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Bell,
  Building2,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import ThemeToggle from "@/components/ThemeToggle";

interface AdminHeaderProps {
  schoolName?: string;
  onMenuClick: () => void;
}

export default function AdminHeader({
  schoolName = "Institution",
  onMenuClick,
}: AdminHeaderProps) {
  const pathname = usePathname();
  const { user, logout } = useUser();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [isNotifLoading, setIsNotifLoading] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/admin/notifications/unread-count");
      const json = await res.json();
      if (json.success && typeof json.data?.unreadCount === "number") {
        setUnreadCount(json.data.unreadCount);
      }
    } catch {
      // Ignore background fetch error
    }
  };

  const fetchRecentNotifications = async () => {
    try {
      setIsNotifLoading(true);
      const res = await fetch("/api/admin/notifications?limit=5");
      const json = await res.json();
      if (json.success && json.data?.notifications) {
        setRecentNotifications(json.data.notifications);
        setUnreadCount(json.data.unreadCount ?? 0);
      }
    } catch {
      // Ignore error
    } finally {
      setIsNotifLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // 30s background poll
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleNotifications = () => {
    const nextState = !isNotificationsOpen;
    setIsNotificationsOpen(nextState);
    if (nextState) {
      fetchRecentNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/admin/notifications/read-all", { method: "POST" });
      setUnreadCount(0);
      setRecentNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // Ignore error
    }
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.isRead) {
      try {
        await fetch(`/api/admin/notifications/${notif._id}/read`, { method: "PATCH" });
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setRecentNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
      } catch {
        // Ignore error
      }
    }
    setIsNotificationsOpen(false);
  };

  const getPageTitle = () => {
    if (pathname === "/admin" || pathname === "/admin/dashboard") return "School Dashboard";
    if (pathname === "/admin/profile") return "My Profile & Account";
    if (pathname === "/admin/settings") return "School Settings";
    if (pathname.startsWith("/admin/academics")) return "Academics";
    if (pathname.startsWith("/admin/students")) return "Student Directory";
    if (pathname.startsWith("/admin/teachers")) return "Teachers & Staff";
    if (pathname.startsWith("/admin/notices")) return "Notices & Circulars";
    if (pathname.startsWith("/admin/notifications")) return "Notification Center";
    return "School ERP Workspace";
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-header backdrop-blur-md border-b border-border px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left side: Hamburger + Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-muted-foreground hover:text-foreground border border-border cursor-pointer transition-all"
          aria-label="Open mobile menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-sm sm:text-base text-foreground leading-tight">
              {getPageTitle()}
            </h1>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
              Tenant Isolated
            </span>
          </div>
          <span className="hidden sm:block text-[10px] text-muted-foreground">
            School Operations Center
          </span>
        </div>
      </div>

      {/* Right side: School Context Pill + Notifications + Theme + Profile Menu */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* School Context Pill */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-2 border border-border text-xs">
          <Building2 className="w-3.5 h-3.5 text-primary" />
          <span className="font-semibold text-foreground max-w-[200px] truncate">
            {schoolName}
          </span>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleToggleNotifications}
            className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-muted-foreground hover:text-foreground border border-border relative transition-all cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-primary text-primary-foreground min-w-[18px] text-center shadow-xs">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-88 rounded-2xl bg-popover border border-border shadow-2xl p-4 space-y-3 z-50 text-xs">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {isNotifLoading ? (
                <div className="py-6 text-center text-muted-foreground text-[11px]">
                  Loading alerts...
                </div>
              ) : recentNotifications.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground space-y-1">
                  <Bell className="w-6 h-6 text-muted-foreground/40 mx-auto" />
                  <p className="text-xs font-semibold text-foreground">No alerts</p>
                  <p className="text-[10px]">Important school notices and alerts will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-border -mx-2 max-h-72 overflow-y-auto">
                  {recentNotifications.map((n) => (
                    <Link
                      key={n._id}
                      href={n.actionUrl || "/admin/notifications"}
                      onClick={() => handleNotificationClick(n)}
                      className={`block p-2.5 hover:bg-surface-2 transition rounded-xl mx-1 ${
                        !n.isRead ? "bg-primary/5 font-medium" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            !n.isRead ? "bg-primary" : "bg-transparent"
                          }`}
                        />
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{n.title}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>
                          <span className="text-[9px] text-muted-foreground block pt-0.5">
                            {new Date(n.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-border text-center">
                <Link
                  href="/admin/notifications"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Open Notification Center &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Global Theme Toggle */}
        <ThemeToggle />

        {/* User Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-foreground transition-all cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-xs">
              {user?.name?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-semibold text-foreground leading-none truncate max-w-[110px]">
                {user?.name || "School Admin"}
              </p>
              <span className="text-[9px] font-bold text-primary font-mono uppercase tracking-wider">
                ADMIN
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-popover border border-border shadow-2xl p-2 space-y-1 z-50 text-xs">
              {/* Profile details */}
              <div className="p-3 border-b border-border space-y-1">
                <p className="font-bold text-foreground truncate">{user?.name || "School Administrator"}</p>
                <p className="text-[11px] text-muted-foreground truncate font-mono">{user?.email}</p>
                <div className="pt-1 flex items-center gap-1 text-[10px] text-primary font-semibold">
                  <ShieldCheck className="w-3 h-3" />
                  <span>School Administrator</span>
                </div>
              </div>

              {/* Menu links */}
              <Link
                href="/admin/profile"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-surface-2 text-foreground font-medium transition-colors"
              >
                <User className="w-4 h-4 text-primary" />
                <span>My Profile</span>
              </Link>

              <Link
                href="/admin/settings"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-surface-2 text-foreground font-medium transition-colors"
              >
                <Settings className="w-4 h-4 text-primary" />
                <span>School Settings</span>
              </Link>

              <div className="border-t border-border pt-1">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-destructive/10 text-destructive font-medium transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
