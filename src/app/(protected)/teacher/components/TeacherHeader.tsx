"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Bell,
  Building2,
  User,
  LogOut,
  ChevronDown,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import ThemeToggle from "@/components/ThemeToggle";

interface TeacherHeaderProps {
  schoolName?: string;
  onMenuClick: () => void;
}

export default function TeacherHeader({
  schoolName = "School Institution",
  onMenuClick,
}: TeacherHeaderProps) {
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
      // Ignore background error
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
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

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

  const getPageTitle = () => {
    if (pathname === "/teacher" || pathname === "/teacher/dashboard") return "Teacher Dashboard";
    if (pathname === "/teacher/profile") return "My Faculty Profile";
    if (pathname.startsWith("/teacher/students")) return "My Students";
    if (pathname.startsWith("/teacher/attendance")) return "Class Attendance";
    if (pathname.startsWith("/teacher/assignments")) return "Assignments & Grading";
    if (pathname.startsWith("/teacher/study-material")) return "Study Material";
    if (pathname.startsWith("/teacher/exams")) return "Exams & Marks Entry";
    if (pathname.startsWith("/teacher/timetable")) return "My Teaching Schedule";
    if (pathname.startsWith("/teacher/leave")) return "Leave Applications";
    if (pathname.startsWith("/teacher/notices")) return "School Notices & Circulars";
    return "Teacher Workspace";
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-header backdrop-blur-md border-b border-border px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left side: Mobile Menu + Page Title */}
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
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Teacher Portal
            </span>
          </div>
          <span className="hidden sm:block text-[10px] text-muted-foreground">
            Academic Management & Instruction
          </span>
        </div>
      </div>

      {/* Right side: School Branding + Notifications + Theme Toggle + User Menu */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* School Context (Zero schoolCode exposed) */}
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
              </div>

              {isNotifLoading ? (
                <div className="py-6 text-center text-muted-foreground text-[11px]">
                  Loading notices...
                </div>
              ) : recentNotifications.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground space-y-1">
                  <Bell className="w-6 h-6 text-muted-foreground/40 mx-auto" />
                  <p className="text-xs font-semibold text-foreground">No alerts</p>
                  <p className="text-[10px]">Academic updates and school circulars will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-border -mx-2 max-h-72 overflow-y-auto">
                  {recentNotifications.map((n) => (
                    <Link
                      key={n._id}
                      href={n.actionUrl || "/teacher/notices"}
                      onClick={() => setIsNotificationsOpen(false)}
                      className="block p-2.5 hover:bg-surface-2 transition rounded-xl mx-1"
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            !n.isRead ? "bg-amber-500" : "bg-transparent"
                          }`}
                        />
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{n.title}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-border text-center">
                <Link
                  href="/teacher/notices"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  View School Circulars &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Teacher Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-foreground transition-all cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
              {user?.name?.[0]?.toUpperCase() || "T"}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-semibold text-foreground leading-none truncate max-w-[120px]">
                {user?.name || "Teacher"}
              </p>
              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 font-mono uppercase tracking-wider">
                TEACHER
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-popover border border-border shadow-2xl p-2 space-y-1 z-50 text-xs">
              <div className="p-3 border-b border-border space-y-1">
                <p className="font-bold text-foreground truncate">{user?.name || "Teacher"}</p>
                <p className="text-[11px] text-muted-foreground truncate font-mono">{user?.email}</p>
                <div className="pt-1 flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                  <GraduationCap className="w-3 h-3" />
                  <span>Academic Faculty</span>
                </div>
              </div>

              <Link
                href="/teacher/profile"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-surface-2 text-foreground font-medium transition-colors"
              >
                <User className="w-4 h-4 text-amber-500" />
                <span>My Profile</span>
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
