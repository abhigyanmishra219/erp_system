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
  CreditCard,
  Clock,
  UserX,
  Bell,
  Calendar,
  BarChart3,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  School as SchoolIcon,
  Sparkles,
  ShieldCheck,
  Menu,
  X,
  Building2,
} from "lucide-react";

interface AdminSidebarProps {
  schoolName?: string;
  schoolLogo?: string;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isComingSoon?: boolean;
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
        href: "/admin",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "ACADEMICS",
    items: [
      {
        label: "Academic Years",
        href: "/admin/academics/academic-years",
        icon: Calendar,
      },
      {
        label: "Classes & Sections",
        href: "/admin/academics/classes",
        icon: Building2,
      },
      {
        label: "Subjects & Curriculum",
        href: "/admin/academics/subjects",
        icon: BookOpen,
      },
    ],
  },
  {
    title: "PEOPLE",
    items: [
      {
        label: "Students",
        href: "/admin/students",
        icon: Users,
      },
      {
        label: "Teachers & Staff",
        href: "/admin/teachers",
        icon: User,
      },
      {
        label: "Parents",
        href: "/admin/parents",
        icon: ShieldCheck,
      },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      {
        label: "Attendance",
        href: "/admin/attendance",
        icon: CalendarCheck,
      },
      {
        label: "Assignments",
        href: "/admin/assignments",
        icon: FileText,
      },
      {
        label: "Study Material",
        href: "/admin/study-material",
        icon: BookOpen,
      },
      {
        label: "Exams",
        href: "/admin/exams",
        icon: Award,
      },
      {
        label: "Results & Reports",
        href: "/admin/results",
        icon: GraduationCap,
      },
      {
        label: "Fee Management",
        href: "/admin/fees",
        icon: CreditCard,
        isComingSoon: true,
      },
      {
        label: "Timetable",
        href: "/admin/timetable",
        icon: Clock,
        isComingSoon: true,
      },
      {
        label: "Staff Leave",
        href: "/admin/leave",
        icon: UserX,
        isComingSoon: true,
      },
    ],
  },
  {
    title: "COMMUNICATION",
    items: [
      {
        label: "Notices & Circulars",
        href: "/admin/notices",
        icon: Bell,
        isComingSoon: true,
      },
      {
        label: "Academic Calendar",
        href: "/admin/calendar",
        icon: Calendar,
        isComingSoon: true,
      },
    ],
  },
  {
    title: "REPORTS",
    items: [
      {
        label: "Reports & Analytics",
        href: "/admin/reports",
        icon: BarChart3,
        isComingSoon: true,
      },
    ],
  },
  {
    title: "ADMINISTRATION",
    items: [
      {
        label: "School Settings",
        href: "/admin/settings",
        icon: Settings,
      },
      {
        label: "My Profile",
        href: "/admin/profile",
        icon: User,
      },
    ],
  },
];

export default function AdminSidebar({
  schoolName = "School Administrator",
  schoolLogo,
  isMobileOpen,
  setIsMobileOpen,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load sidebar collapsed preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("erp_admin_sidebar_collapsed");
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
      localStorage.setItem("erp_admin_sidebar_collapsed", String(next));
    } catch {
      // ignore
    }
  };

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin" || pathname === "/admin/dashboard";
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
              <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0 shadow-md shadow-primary/25">
                {schoolLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={schoolLogo}
                    alt={schoolName}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <SchoolIcon className="w-5 h-5" />
                )}
              </div>

              {!isCollapsed && (
                <div className="overflow-hidden space-y-0.5">
                  <h2 className="font-bold text-xs text-sidebar-foreground truncate leading-tight">
                    {schoolName}
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.2 rounded bg-primary/15 text-primary font-bold text-[9px] uppercase tracking-wider font-mono">
                      ADMIN
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden p-1.5 rounded-lg bg-surface-2 text-muted-foreground hover:text-foreground border border-border"
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

                  if (item.isComingSoon) {
                    return (
                      <div
                        key={item.label}
                        title={isCollapsed ? `${item.label} (Coming Soon)` : undefined}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs text-muted-foreground/60 select-none cursor-not-allowed ${
                          isCollapsed ? "justify-center" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                          {!isCollapsed && (
                            <span className="truncate">{item.label}</span>
                          )}
                        </div>
                        {!isCollapsed && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface-2 text-muted-foreground/70 font-mono border border-border">
                            Soon
                          </span>
                        )}
                      </div>
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
                          ? "bg-primary/10 text-primary border border-primary/20 font-semibold shadow-xs"
                          : "text-muted-foreground hover:text-sidebar-foreground hover:bg-surface-2"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`w-4 h-4 transition-colors shrink-0 ${
                            active
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-sidebar-foreground"
                          }`}
                        />
                        {!isCollapsed && (
                          <span className="truncate">{item.label}</span>
                        )}
                      </div>
                      {!isCollapsed && active && (
                        <ChevronRight className="w-3.5 h-3.5 text-primary" />
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
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>School Instance Active</span>
            </div>
          )}

          <button
            onClick={toggleCollapse}
            className="hidden md:flex p-2 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-foreground transition-all cursor-pointer mx-auto"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-primary" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-primary" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
