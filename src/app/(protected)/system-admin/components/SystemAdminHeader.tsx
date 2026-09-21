"use client";

import React from "react";
import Link from "next/link";
import { LogOut, Home, ShieldCheck } from "lucide-react";
import { useUser } from "@/context/UserContext";
import type { AuthenticatedUserDoc } from "@/lib/helper";

export default function SystemAdminHeader({
  user,
}: {
  user: AuthenticatedUserDoc;
}) {
  const { logout } = useUser();

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md px-6 py-3.5 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold text-[10px] tracking-wider uppercase">
          <ShieldCheck className="w-3 h-3" />
          <span>Root Administrator</span>
        </span>
        <span className="text-xs text-zinc-400 hidden md:inline">
          System Admin Control Panel
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick link back to general dashboard or home */}
        <Link
          href="/dashboard"
          className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 border border-zinc-700/60"
        >
          <Home className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">My Profile</span>
        </Link>

        {/* User Card */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
          <div className="w-6 h-6 rounded-md bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-[11px]">
            {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "A"}
          </div>
          <div className="text-left hidden lg:block">
            <p className="text-[11px] font-semibold text-zinc-200 leading-none">
              {user?.name || user?.email}
            </p>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={logout}
          className="px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-500/30 text-zinc-300 transition-all flex items-center gap-1.5 border border-zinc-700/60 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
