"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  School,
  Users,
  CreditCard,
  Layers,
  History,
  Activity,
  ShieldCheck,
  Menu,
  X,
  Sparkles,
  ChevronRight,
} from "lucide-react";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/system-admin",
    icon: LayoutDashboard,
    activeExact: true,
  },
  {
    label: "Schools",
    href: "/system-admin/schools",
    icon: School,
    activeExact: false,
  },
  {
    label: "Users",
    href: "/system-admin/users",
    icon: Users,
    activeExact: false,
  },
  {
    label: "Plans & Limits",
    href: "/system-admin/plans",
    icon: Layers,
    activeExact: false,
  },
  {
    label: "Subscriptions",
    href: "/system-admin/subscriptions",
    icon: CreditCard,
    activeExact: false,
  },
  {
    label: "Audit Logs",
    href: "/system-admin/audit-logs",
    icon: History,
    activeExact: false,
  },
  {
    label: "System Monitoring",
    href: "/system-admin/monitoring",
    icon: Activity,
    activeExact: false,
  },
];

export default function SystemAdminSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (href: string, exact: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Top Navbar with hamburger */}
      <div className="md:hidden flex items-center justify-between p-4 bg-sidebar border-b border-sidebar-border z-30">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="font-bold text-sm tracking-tight text-sidebar-foreground">
            ERP Platform Admin
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg bg-surface-2 text-muted-foreground hover:text-foreground border border-border"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-sidebar backdrop-blur-xl border-r border-sidebar-border flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 space-y-6">
          {/* Logo / Title */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-sidebar-foreground leading-tight">
                ERP Nexus
              </h2>
              <div className="inline-flex items-center gap-1 text-[10px] text-primary font-semibold tracking-wide uppercase">
                <Sparkles className="w-2.5 h-2.5" />
                <span>System Admin</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Platform Management
            </p>
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href, item.activeExact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 group ${
                    active
                      ? "bg-primary/10 text-primary border border-primary/20 font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-sidebar-foreground hover:bg-surface-2"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        active
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-sidebar-foreground"
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {active && (
                    <ChevronRight className="w-3.5 h-3.5 text-primary" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-sidebar-border bg-surface-1/50 text-center text-[11px] text-muted-foreground space-y-1">
          <p className="font-mono text-sidebar-foreground/80 font-medium">Phase 1: Multi-Tenant Core</p>
          <p className="text-[10px]">MongoDB Atlas • JWT Protected</p>
        </div>
      </aside>
    </>
  );
}
