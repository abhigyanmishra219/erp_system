"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  CalendarCheck,
  FileText,
  BookOpen,
  Award,
  Clock,
  CalendarX,
  Bell,
  User,
  ChevronLeft,
  ChevronRight,
  X,
  Lock,
} from "lucide-react";
import { SchoolModule } from "@/lib/subscription";
import { useSubscription } from "@/context/SubscriptionContext";
import { useSchoolBranding } from "@/context/SchoolBrandingContext";

interface TeacherSidebarProps {
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
        href: "/teacher/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "MY ACADEMICS",
    items: [
      {
        label: "My Students",
        href: "/teacher/students",
        icon: Users,
      },
      {
        label: "Attendance",
        href: "/teacher/attendance",
        icon: CalendarCheck,
        moduleKey: "ATTENDANCE",
      },
      {
        label: "Assignments",
        href: "/teacher/assignments",
        icon: FileText,
        moduleKey: "ASSIGNMENTS",
      },
      {
        label: "Study Material",
        href: "/teacher/study-material",
        icon: BookOpen,
        moduleKey: "STUDY_MATERIAL",
      },
      {
        label: "Exams & Marks",
        href: "/teacher/exams",
        icon: Award,
        moduleKey: "EXAMS",
      },
      {
        label: "Timetable",
        href: "/teacher/timetable",
        icon: Clock,
        moduleKey: "TIMETABLE",
      },
    ],
  },
  {
    title: "COMMUNICATION",
    items: [
      {
        label: "Notices",
        href: "/teacher/notices",
        icon: Bell,
        moduleKey: "NOTICES",
      },
    ],
  },
  {
    title: "MY ACCOUNT",
    items: [
      {
        label: "Leave",
        href: "/teacher/leave",
        icon: CalendarX,
        moduleKey: "LEAVE",
      },
      {
        label: "My Profile",
        href: "/teacher/profile",
        icon: User,
      },
    ],
  },
];

export default function TeacherSidebar({
  schoolName = "School Faculty",
  schoolLogo,
  isMobileOpen,
  setIsMobileOpen,
}: TeacherSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { hasModuleAccess, openLockedModal } = useSubscription();
  const { branding } = useSchoolBranding();

  const effectiveLogo = branding.logo || schoolLogo;

  useEffect(() => {
    try {
      const saved = localStorage.getItem("erp_teacher_sidebar_collapsed");
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
      localStorage.setItem("erp_teacher_sidebar_collapsed", String(next));
    } catch {
      // ignore
    }
  };

  const isActive = (href: string) => {
    if (href === "/teacher/dashboard" || href === "/teacher") {
      return pathname === "/teacher" || pathname === "/teacher/dashboard";
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

      {/* Sidebar Aside Element */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen bg-sidebar backdrop-blur-xl border-r border-sidebar-border flex flex-col justify-between transition-all duration-200 ease-in-out ${
          isCollapsed ? "md:w-20" : "md:w-64"
        } w-64 ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Top Header Identity */}
        <div>
          <div className="p-4 border-b border-sidebar-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold text-sm shrink-0 shadow-md border border-primary/20 overflow-hidden">
                {effectiveLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={effectiveLogo}
                    alt={schoolName}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <GraduationCap className="w-5 h-5" />
                )}
              </div>

              {!isCollapsed && (
                <div className="overflow-hidden space-y-0.5">
                  <h2 className="font-bold text-xs text-sidebar-foreground truncate leading-tight">
                    {schoolName}
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-[9px] uppercase tracking-wider font-mono border border-amber-500/20">
                      TEACHER
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden p-1.5 rounded-lg bg-surface-2 text-muted-foreground hover:text-foreground border border-border cursor-pointer"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Items List */}
          <div className="p-3 overflow-y-auto max-h-[calc(100vh-140px)] space-y-4">
            {NAV_SECTIONS.map((section) => (
              <div key={section.title} className="space-y-1">
                {!isCollapsed && (
                  <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 py-1">
                    {section.title}
                  </p>
                )}

                {section.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
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
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-muted-foreground/60 hover:text-muted-foreground hover:bg-surface-2/60 transition-all duration-150 group cursor-pointer ${
                          isCollapsed ? "justify-center" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0" />
                          {!isCollapsed && (
                            <span className="truncate text-muted-foreground/70">
                              {item.label}
                            </span>
                          )}
                        </div>
                        {!isCollapsed && (
                          <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/20">
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
                      onClick={() => setIsMobileOpen(false)}
                      title={isCollapsed ? item.label : undefined}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 group ${
                        isCollapsed ? "justify-center" : ""
                      } ${
                        active
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold shadow-xs"
                          : "text-muted-foreground hover:text-sidebar-foreground hover:bg-surface-2"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`w-4 h-4 transition-colors shrink-0 ${
                            active
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-muted-foreground group-hover:text-sidebar-foreground"
                          }`}
                        />
                        {!isCollapsed && (
                          <span className="truncate">{item.label}</span>
                        )}
                      </div>
                      {!isCollapsed && active && (
                        <ChevronRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Collapse Toggle (Desktop only) */}
        <div className="p-3 border-t border-sidebar-border bg-surface-1/40 flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Teacher Active</span>
            </div>
          )}

          <button
            onClick={toggleCollapse}
            className="hidden md:flex p-2 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-foreground transition-all cursor-pointer mx-auto"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
