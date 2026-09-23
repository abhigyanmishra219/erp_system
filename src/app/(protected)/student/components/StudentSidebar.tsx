"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  CalendarCheck,
  FileText,
  BookOpen,
  Award,
  TrendingUp,
  GraduationCap,
  Clock,
  CreditCard,
  Bell,
  Inbox,
  ChevronLeft,
  ChevronRight,
  School as SchoolIcon,
  X,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useUser } from "@/context/UserContext";

interface StudentSidebarProps {
  schoolName?: string;
  schoolLogo?: string;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
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
        href: "/student/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "ACADEMICS",
    items: [
      {
        label: "My Profile",
        href: "/student/profile",
        icon: User,
      },
      {
        label: "Attendance",
        href: "/student/attendance",
        icon: CalendarCheck,
      },
      {
        label: "Assignments",
        href: "/student/assignments",
        icon: FileText,
      },
      {
        label: "Study Material",
        href: "/student/study-material",
        icon: BookOpen,
      },
      {
        label: "Exams",
        href: "/student/exams",
        icon: Award,
      },
      {
        label: "Results",
        href: "/student/results",
        icon: TrendingUp,
      },
      {
        label: "Report Cards",
        href: "/student/report-cards",
        icon: GraduationCap,
      },
    ],
  },
  {
    title: "SCHOOL",
    items: [
      {
        label: "Timetable",
        href: "/student/timetable",
        icon: Clock,
      },
      {
        label: "Fees",
        href: "/student/fees",
        icon: CreditCard,
      },
      {
        label: "Notices",
        href: "/student/notices",
        icon: Bell,
      },
      {
        label: "Notifications",
        href: "/student/notifications",
        icon: Inbox,
      },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      {
        label: "My Profile",
        href: "/student/profile",
        icon: User,
      },
    ],
  },
];

export default function StudentSidebar({
  schoolName = "School Institution",
  schoolLogo,
  isMobileOpen,
  setIsMobileOpen,
}: StudentSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useUser();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load sidebar collapsed preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("erp_student_sidebar_collapsed");
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
      localStorage.setItem("erp_student_sidebar_collapsed", String(next));
    } catch {
      // ignore
    }
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname, setIsMobileOpen]);

  const isActive = (href: string) => {
    if (href === "/student" || href === "/student/dashboard") {
      return pathname === "/student" || pathname === "/student/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out lg:static ${
          isCollapsed ? "lg:w-20" : "lg:w-64"
        } ${
          isMobileOpen
            ? "translate-x-0 w-72 shadow-2xl"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header / School Branding */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm shadow-primary/25">
              {schoolLogo ? (
                <img
                  src={schoolLogo}
                  alt={schoolName}
                  className="w-full h-full rounded-xl object-cover"
                />
              ) : (
                <GraduationCap className="w-5 h-5" />
              )}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-sidebar-foreground truncate tracking-tight">
                  {schoolName}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-wider">
                    Student Portal
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

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-sidebar-border">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              {!isCollapsed && (
                <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/60 mb-2">
                  {section.title}
                </h3>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary ${
                        active
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-surface-2 border border-transparent"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                          active
                            ? "text-primary-foreground"
                            : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate">{item.label}</span>
                      )}

                      {/* Tooltip for collapsed state */}
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

        {/* Student Profile & Footer Action */}
        <div className="p-3 border-t border-sidebar-border space-y-2">
          {!isCollapsed && user && (
            <div className="flex items-center gap-3 px-2.5 py-2 rounded-xl bg-surface-1 border border-sidebar-border/60">
              <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/25">
                {user.name ? user.name[0].toUpperCase() : "S"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-sidebar-foreground truncate">
                  {user.name || "Student"}
                </p>
                <p className="text-[10px] text-sidebar-foreground/60 truncate font-mono">
                  {user.email}
                </p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => logout()}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors border border-transparent cursor-pointer ${
              isCollapsed ? "justify-center" : ""
            }`}
            title="Log Out"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Log Out</span>}
          </button>

          {/* Desktop Collapse Toggle */}
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
