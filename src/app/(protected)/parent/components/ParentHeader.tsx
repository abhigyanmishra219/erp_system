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
  HeartHandshake,
  Users,
  Check,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useParentChild } from "@/context/ParentChildContext";
import ThemeToggle from "@/components/ThemeToggle";

interface ParentHeaderProps {
  schoolName?: string;
  onMenuClick: () => void;
}

export default function ParentHeader({
  schoolName = "School Institution",
  onMenuClick,
}: ParentHeaderProps) {
  const pathname = usePathname();
  const { user, logout } = useUser();
  const { children, selectedChild, selectedChildId, setSelectedChildId } = useParentChild();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChildDropdownOpen, setIsChildDropdownOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const childDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (childDropdownRef.current && !childDropdownRef.current.contains(event.target as Node)) {
        setIsChildDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getPageTitle = () => {
    if (pathname === "/parent" || pathname === "/parent/dashboard") return "Parent Dashboard";
    if (pathname.startsWith("/parent/children")) return "My Children";
    if (pathname.startsWith("/parent/attendance")) return "Child Attendance";
    if (pathname.startsWith("/parent/assignments")) return "Assignments & Coursework";
    if (pathname.startsWith("/parent/results")) return "Academic Results & Reports";
    if (pathname.startsWith("/parent/fees")) return "Fee Invoices & Payments";
    if (pathname.startsWith("/parent/timetable")) return "Class Timetable";
    if (pathname.startsWith("/parent/exams")) return "Exams Schedule";
    if (pathname.startsWith("/parent/notices")) return "School Circulars & Notices";
    if (pathname.startsWith("/parent/leave")) return "Leave Applications";
    if (pathname.startsWith("/parent/notifications")) return "Alerts & Notifications";
    if (pathname.startsWith("/parent/profile")) return "Guardian Profile";
    return "Parent Portal";
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 bg-header backdrop-blur-md border-b border-header-border transition-colors">
      {/* Left: Mobile Menu Trigger & Title */}
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
              <HeartHandshake className="w-3 h-3" />
              <span>Guardian Area</span>
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground hidden sm:block">
            {schoolName}
          </p>
        </div>
      </div>

      {/* Right: Child Selector Dropdown, Theme, Notifications & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Linked Child Quick Switcher Dropdown in Header */}
        {selectedChild && children.length > 0 && (
          <div className="relative" ref={childDropdownRef}>
            <button
              type="button"
              onClick={() => setIsChildDropdownOpen(!isChildDropdownOpen)}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-colors shadow-2xs text-xs font-semibold text-foreground cursor-pointer"
              title="Switch active child"
            >
              <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                {selectedChild.student.firstName[0]}
              </div>
              <span className="truncate max-w-[90px] sm:max-w-[130px]">
                {selectedChild.student.fullName}
              </span>
              <span className="text-[10px] text-muted-foreground font-normal hidden sm:inline">
                ({selectedChild.student.class})
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
            </button>

            {isChildDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-card border border-border shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 border-b border-border/60 mb-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Switch Active Child ({children.length})
                  </span>
                </div>
                {children.map((c) => {
                  const isCur = c.studentId === selectedChildId;
                  return (
                    <button
                      key={c.studentId}
                      type="button"
                      onClick={() => {
                        setSelectedChildId(c.studentId);
                        setIsChildDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                        isCur
                          ? "bg-primary/10 text-primary font-bold"
                          : "text-foreground hover:bg-surface-2"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isCur
                              ? "bg-primary text-primary-foreground"
                              : "bg-surface-2 text-foreground"
                          }`}
                        >
                          {c.student.firstName[0]}
                        </div>
                        <div className="truncate">
                          <p className="truncate leading-tight font-semibold">{c.student.fullName}</p>
                          <p className="text-[10px] text-muted-foreground font-normal">
                            {c.student.class} - {c.student.section}
                          </p>
                        </div>
                      </div>
                      {isCur && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications Shortcut */}
        <Link
          href="/parent/notifications"
          className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors border border-transparent"
          aria-label="View notifications"
        >
          <Bell className="w-5 h-5" />
        </Link>

        {/* User Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-surface-2 transition-colors border border-transparent focus:outline-hidden cursor-pointer"
            aria-label="User profile menu"
          >
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-xs">
              {user?.name ? user.name[0].toUpperCase() : "P"}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-foreground leading-none truncate max-w-[120px]">
                {user?.name || "Parent"}
              </span>
              <span className="text-[10px] text-muted-foreground leading-none mt-1 font-mono">
                Guardian
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden md:block" />
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-card border border-border shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-border/60 mb-1">
                <p className="text-xs font-bold text-foreground truncate">
                  {user?.name || "Guardian"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate font-mono">
                  {user?.email}
                </p>
                <span className="inline-block mt-1 px-1.5 py-0.2 rounded bg-primary/10 text-primary text-[10px] font-bold">
                  PARENT
                </span>
              </div>

              <Link
                href="/parent/profile"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
              >
                <User className="w-4 h-4 text-primary" />
                <span>Guardian Profile</span>
              </Link>

              <Link
                href="/parent/children"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
              >
                <Users className="w-4 h-4 text-primary" />
                <span>My Children</span>
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
