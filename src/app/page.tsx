"use client";

import Link from "next/link";
import {
  Building2,
  ArrowRight,
  ShieldCheck,
  Database,
  Layers,
  User,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useUser } from "@/context/UserContext";

export default function Home() {
  const { user, logout, isLoading } = useUser();

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-zinc-950 text-zinc-100 selection:bg-indigo-500 selection:text-white">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Navigation */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
            <Building2 className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">ERP Nexus</span>
        </div>

        <div className="flex items-center gap-3">
          {!isLoading && user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end text-xs">
                <span className="font-medium text-zinc-200">{user.email}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold uppercase tracking-wider">
                  {user.role}
                </span>
              </div>
              <button
                onClick={logout}
                className="px-3.5 py-2 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 border border-zinc-700/60 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-all duration-150"
              >
                Sign In
              </Link>
              <Link
                href="/create-account"
                className="px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all duration-150 shadow-md shadow-indigo-600/20"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-4xl mx-auto px-6 py-12 flex flex-col items-center text-center z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 mb-6 shadow-sm">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>Connected to MongoDB Atlas • JWT Enabled</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent max-w-2xl leading-tight">
          Modern Enterprise Resource Planning
        </h1>

        <p className="mt-6 text-base sm:text-lg text-zinc-400 max-w-xl leading-relaxed">
          Manage your enterprise operations, inventory, workforce, and finance from a unified system.
        </p>

        {/* User Context Live Display Banner */}
        {user ? (
          <div className="mt-8 w-full max-w-lg p-5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-left space-y-3 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Active User Context Session</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold uppercase">
                {user.role}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800">
              <div>
                <span className="text-zinc-500 block">Name:</span>
                <span className="text-zinc-200 font-medium">{user.name || "N/A"}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Role:</span>
                <span className="text-indigo-400 font-semibold">{user.role}</span>
              </div>
              <div className="col-span-2">
                <span className="text-zinc-500 block">Email:</span>
                <span className="text-zinc-300 font-mono">{user.email}</span>
              </div>
            </div>

            <div className="pt-1">
              <Link
                href="/dashboard"
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20"
              >
                <span>Open Protected Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 flex flex-col sm:flex-row gap-3 items-center">
            <Link
              href="/login"
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-medium text-sm shadow-xl shadow-indigo-500/20 flex items-center gap-2 transition-all duration-150 group"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/create-account"
              className="px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-medium text-sm transition-all duration-150 flex items-center gap-2"
            >
              <span>Create Account</span>
            </Link>
            <a
              href="/api/health/db"
              target="_blank"
              className="px-5 py-3.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 font-medium text-sm transition-all duration-150 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>DB Health</span>
            </a>
          </div>
        )}

        {/* Feature Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 w-full max-w-3xl text-left">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-zinc-200">UserContext Provider</h3>
            <p className="text-xs text-zinc-400 mt-1">Access user details, email, and role seamlessly everywhere via `useUser()` hook.</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <Database className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-zinc-200">JWT Token Security</h3>
            <p className="text-xs text-zinc-400 mt-1">JWT `createToken` and `verifyToken` helpers in `src/lib/jwt.ts`.</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center mb-3">
              <User className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-zinc-200">System Admin Role</h3>
            <p className="text-xs text-zinc-400 mt-1">Accounts created default to `SYSTEM_ADMIN` role with full privileges.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-900 py-6 text-center text-xs text-zinc-500">
        ERP System Workspace • Next.js & Mongoose & JWT
      </footer>
    </div>
  );
}
