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
];

const COMING_SOON_ITEMS = [
  { label: "Plans & Pricing", icon: Layers },
  { label: "Subscriptions", icon: CreditCard },
  { label: "Audit Logs", icon: History },
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
      <div className="md:hidden flex items-center justify-between p-4 bg-zinc-900 border-b border-zinc-800 z-30">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white">
            ERP Platform Admin
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white"
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
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-zinc-900/90 backdrop-blur-xl border-r border-zinc-800 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 space-y-6">
          {/* Logo / Title */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-md shadow-indigo-600/30">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-zinc-100 leading-tight">
                ERP Nexus
              </h2>
              <div className="inline-flex items-center gap-1 text-[10px] text-indigo-400 font-semibold tracking-wide uppercase">
                <Sparkles className="w-2.5 h-2.5" />
                <span>System Admin</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
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
                      ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-semibold shadow-inner"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        active
                          ? "text-indigo-400"
                          : "text-zinc-500 group-hover:text-zinc-300"
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {active && (
                    <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Upcoming Phase Links (Disabled) */}
          <div className="space-y-1 pt-2">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
              Future Modules
            </p>
            {COMING_SOON_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center justify-between px-3 py-2 text-xs text-zinc-600 rounded-lg cursor-not-allowed select-none"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-zinc-600" />
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-mono">
                    Soon
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/40 text-center text-[11px] text-zinc-500 space-y-1">
          <p className="font-mono text-zinc-400">Phase 1: Multi-Tenant Core</p>
          <p className="text-[10px]">MongoDB Atlas • JWT Protected</p>
        </div>
      </aside>
    </>
  );
}
