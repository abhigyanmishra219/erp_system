"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FileText,
  TrendingUp,
  Award,
  Clock,
  CreditCard,
  Bell,
  Inbox,
  CalendarDays,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  School as SchoolIcon,
  X,
  HeartHandshake,
  Lock,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { SchoolModule } from "@/lib/subscription";
import { useSubscription } from "@/context/SubscriptionContext";
import { useSchoolBranding } from "@/context/SchoolBrandingContext";

interface ParentSidebarProps {
  schoolName?: string;
  schoolLogo?: string;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  moduleKey?: SchoolModule;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "MAIN",
    items: [
      {
        label: "Dashboard",
        href: "/parent/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "CHILDREN",
    items: [
      {
        label: "My Children",
        href: "/parent/children",
        icon: Users,
      },
    ],
  },
  {
    title: "ACADEMICS",
    items: [
      {
        label: "Attendance",
        href: "/parent/attendance",
        icon: CalendarCheck,
        moduleKey: "ATTENDANCE",
      },
      {
        label: "Assignments",
        href: "/parent/assignments",
        icon: FileText,
        moduleKey: "ASSIGNMENTS",
      },
      {
        label: "Results",
        href: "/parent/results",
        icon: TrendingUp,
        moduleKey: "RESULTS",
      },
      {
        label: "Exams",
        href: "/parent/exams",
        icon: Award,
        moduleKey: "EXAMS",
      },
      {
        label: "Timetable",
        href: "/parent/timetable",
        icon: Clock,
        moduleKey: "TIMETABLE",
      },
    ],
  },
  {
    title: "FINANCE",
    items: [
      {
        label: "Fees",
        href: "/parent/fees",
        icon: CreditCard,
        moduleKey: "FEES",
      },
    ],
  },
  {
    title: "COMMUNICATION",
    items: [
      {
        label: "Notices",
        href: "/parent/notices",
        icon: Bell,
        moduleKey: "NOTICES",
      },
      {
        label: "Notifications",
        href: "/parent/notifications",
        icon: Inbox,
        moduleKey: "NOTIFICATIONS",
      },
    ],
  },
  {
    title: "REQUESTS",
    items: [
      {
        label: "Leave",
        href: "/parent/leave",
        icon: CalendarDays,
        moduleKey: "LEAVE",
      },
    ],
  },
];

export default function ParentSidebar({
  schoolName = "School Institution",
  schoolLogo,
  isMobileOpen,
  setIsMobileOpen,
}: ParentSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useUser();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { hasModuleAccess, openLockedModal } = useSubscription();
  const { branding } = useSchoolBranding();

  const effectiveLogo = branding.logo || schoolLogo;

  // Load sidebar collapsed preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("erp_parent_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem("erp_parent_sidebar_collapsed", String(next));
    } catch {
      // ignore
    }
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname, setIsMobileOpen]);

  const isActive = (href: string) => {
    if (href === "/parent" || href === "/parent/dashboard") {
      return pathname === "/parent" || pathname === "/parent/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out lg:static ${
          isCollapsed ? "lg:w-20" : "lg:w-[280px]"
        } ${
          isMobileOpen
            ? "translate-x-0 w-[280px] shadow-2xl"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* 1. Header / School Branding */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm shadow-primary/25 overflow-hidden">
              {effectiveLogo ? (
                <img
                  src={effectiveLogo}
                  alt={schoolName}
                  className="w-full h-full rounded-xl object-cover"
                />
              ) : (
                <SchoolIcon className="w-5 h-5" />
              )}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-bold text-sidebar-foreground truncate tracking-tight">
                  {schoolName}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-primary/10 text-primary border border-primary/20 text-[9px] font-bold uppercase tracking-wider">
                    <HeartHandshake className="w-3 h-3" />
                    <span>Parent Portal</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Close Button (Mobile only) */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-surface-2 lg:hidden cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Scrollable Navigation Sections */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-3.5 py-3 space-y-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              {!isCollapsed && (
                <h3 className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/50">
                  {section.title}
                </h3>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const isLocked = item.moduleKey ? !hasModuleAccess(item.moduleKey) : false;

                  if (isLocked) {
                    return (
                      <button
                        type="button"
                        key={item.label}
                        onClick={() => {
                          if (item.moduleKey) {
                            openLockedModal(item.moduleKey);
                          }
                        }}
                        title={
                          isCollapsed
                            ? `${item.label} (Plan Required - Locked)`
                            : "Plan Required - Click to view details"
                        }
                        className="w-full flex items-center gap-3 px-3 py-2.5 sm:py-2 rounded-xl text-xs font-medium text-sidebar-foreground/45 hover:text-sidebar-foreground/70 hover:bg-surface-2/60 transition-all group relative cursor-pointer"
                      >
                        <Icon className="w-4 h-4 shrink-0 text-sidebar-foreground/40 group-hover:text-sidebar-foreground/60" />
                        {!isCollapsed && (
                          <span className="truncate flex-1 text-left">
                            {item.label}
                          </span>
                        )}
                        {!isCollapsed && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/20">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Plan Req</span>
                          </span>
                        )}
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 sm:py-2 rounded-xl text-xs font-medium transition-all group relative focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary ${
                        active
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-surface-2 border border-transparent"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                          active
                            ? "text-primary-foreground"
                            : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate">{item.label}</span>
                      )}

                      {/* Tooltip for collapsed desktop view */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-xl bg-popover text-popover-foreground text-[11px] font-medium shadow-lg border border-border opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                          {item.label}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* 3. Account / User Info & Logout */}
        <div className="p-3 border-t border-sidebar-border bg-sidebar shrink-0 space-y-2">
          {!isCollapsed && (
            <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/50">
              ACCOUNT
            </h3>
          )}

          {/* Profile link */}
          <Link
            href="/parent/profile"
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              pathname === "/parent/profile"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-surface-2"
            }`}
          >
            <User className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>My Profile</span>}
          </Link>

          {/* User Profile Card */}
          {!isCollapsed && user && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-surface-1 border border-sidebar-border/60">
              <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/25">
                {user.name ? user.name[0].toUpperCase() : "P"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-sidebar-foreground truncate">
                  {user.name || "Parent"}
                </p>
                <p className="text-[10px] text-sidebar-foreground/60 truncate font-mono">
                  {user.email}
                </p>
              </div>
            </div>
          )}

          {/* Logout Action Button */}
          <button
            type="button"
            onClick={() => logout()}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors border border-transparent cursor-pointer ${
              isCollapsed ? "justify-center" : ""
            }`}
            title="Log Out"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </button>

          {/* Desktop Collapse/Expand Toggle Button */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden lg:flex w-full items-center justify-center py-1.5 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-surface-2 text-xs transition-colors cursor-pointer"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
