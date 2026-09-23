"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Bell,
  User,
  LogOut,
  ChevronDown,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import ThemeToggle from "@/components/ThemeToggle";

interface StudentHeaderProps {
  schoolName?: string;
  onMenuClick: () => void;
}

export default function StudentHeader({
  schoolName = "School Institution",
  onMenuClick,
}: StudentHeaderProps) {
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
    if (pathname === "/student" || pathname === "/student/dashboard") return "Student Dashboard";
    if (pathname === "/student/profile") return "My Student Profile";
    if (pathname.startsWith("/student/attendance")) return "My Attendance";
    if (pathname.startsWith("/student/assignments")) return "My Assignments";
    if (pathname.startsWith("/student/study-material")) return "Study Material";
    if (pathname.startsWith("/student/exams")) return "Exams Schedule";
    if (pathname.startsWith("/student/results")) return "Exam Results";
    if (pathname.startsWith("/student/report-cards")) return "Report Cards";
    if (pathname.startsWith("/student/timetable")) return "Class Timetable";
    if (pathname.startsWith("/student/fees")) return "Fee Payments";
    if (pathname.startsWith("/student/notices")) return "School Notices";
    if (pathname.startsWith("/student/notifications")) return "Notifications";
    return "Student Portal";
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 bg-header backdrop-blur-md border-b border-header-border transition-colors">
      {/* Left: Mobile Menu Trigger & Dynamic Page Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-2 lg:hidden transition-colors border border-transparent cursor-pointer"
          aria-label="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              {getPageTitle()}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-semibold">
              <Sparkles className="w-3 h-3" />
              <span>Student Area</span>
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground hidden sm:block">
            {schoolName}
          </p>
        </div>
      </div>

      {/* Right: Actions, Notifications, Theme & Profile Dropdown */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={handleToggleNotifications}
            className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors border border-transparent cursor-pointer"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-xs ring-2 ring-card animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-card border border-border shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-1">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <Link
                  href="/student/notifications"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="text-[11px] text-primary hover:underline font-semibold"
                >
                  View all
                </Link>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-border/50 scrollbar-thin">
                {isNotifLoading ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    Loading alerts...
                  </div>
                ) : recentNotifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No new notifications right now.
                  </div>
                ) : (
                  recentNotifications.map((notif) => (
                    <div
                      key={notif._id}
                      className={`p-3 text-xs transition-colors hover:bg-surface-2 ${
                        !notif.isRead ? "bg-primary/5 font-medium" : ""
                      }`}
                    >
                      <p className="font-semibold text-foreground truncate">{notif.title}</p>
                      <p className="text-muted-foreground text-[11px] line-clamp-2 mt-0.5">
                        {notif.message}
                      </p>
                      <span className="text-[9px] text-muted-foreground/80 mt-1 block font-mono">
                        {new Date(notif.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-surface-2 transition-colors border border-transparent focus:outline-hidden cursor-pointer"
            aria-label="User profile menu"
          >
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-xs">
              {user?.name ? user.name[0].toUpperCase() : "S"}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-foreground leading-none truncate max-w-[120px]">
                {user?.name || "Student"}
              </span>
              <span className="text-[10px] text-muted-foreground leading-none mt-1 font-mono">
                Student
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden md:block" />
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-card border border-border shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-border/60 mb-1">
                <p className="text-xs font-bold text-foreground truncate">
                  {user?.name || "Student"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate font-mono">
                  {user?.email}
                </p>
                <span className="inline-block mt-1 px-1.5 py-0.2 rounded bg-primary/10 text-primary text-[10px] font-bold">
                  STUDENT
                </span>
              </div>

              <Link
                href="/student/profile"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
              >
                <User className="w-4 h-4 text-primary" />
                <span>My Profile</span>
              </Link>

              <Link
                href="/student/timetable"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
              >
                <GraduationCap className="w-4 h-4 text-primary" />
                <span>My Classes & Timetable</span>
              </Link>

              <div className="my-1 border-t border-border/60" />

              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
