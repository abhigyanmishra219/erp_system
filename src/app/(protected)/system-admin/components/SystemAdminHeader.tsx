"use client";

import React from "react";
import Link from "next/link";
import { LogOut, Home, ShieldCheck } from "lucide-react";
import { useUser } from "@/context/UserContext";
import type { AuthenticatedUserDoc } from "@/lib/helper";
import ThemeToggle from "@/components/ThemeToggle";

export default function SystemAdminHeader({
  user,
}: {
  user: AuthenticatedUserDoc;
}) {
  const { logout } = useUser();

  return (
    <header className="border-b border-border bg-header backdrop-blur-md px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 font-semibold text-[10px] tracking-wider uppercase">
          <ShieldCheck className="w-3 h-3" />
          <span>Root Administrator</span>
        </span>
        <span className="text-xs text-muted-foreground hidden md:inline">
          System Admin Control Panel
        </span>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Quick link back to general dashboard or home */}
        <Link
          href="/dashboard"
          className="px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 border border-border shadow-sm"
        >
          <Home className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">My Profile</span>
        </Link>

        {/* User Card */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-2 border border-border shadow-sm">
          <div className="w-6 h-6 rounded-md bg-primary/20 text-primary flex items-center justify-center font-bold text-[11px]">
            {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "A"}
          </div>
          <div className="text-left hidden lg:block">
            <p className="text-[11px] font-semibold text-foreground leading-none">
              {user?.name || user?.email}
            </p>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={logout}
          className="px-3 py-1.5 rounded-xl text-xs font-medium bg-surface-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-muted-foreground hover:text-destructive transition-all flex items-center gap-1.5 border border-border cursor-pointer shadow-sm"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
