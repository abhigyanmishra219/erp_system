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
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  const { user, logout, isLoading } = useUser();

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-background text-foreground selection:bg-primary/30 selection:text-primary">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent blur-3xl pointer-events-none" />

      {/* Navigation */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
            <Building2 className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight text-foreground">ERP Nexus</span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          {!isLoading && user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end text-xs">
                <span className="font-medium text-foreground">{user.email}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold uppercase tracking-wider">
                  {user.role}
                </span>
              </div>
              <button
                onClick={logout}
                className="px-3.5 py-2 rounded-xl text-xs font-medium bg-surface-2 hover:bg-surface-3 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 border border-border cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-all duration-150"
              >
                Sign In
              </Link>
              <Link
                href="/create-account"
                className="px-4 py-2 rounded-xl text-sm font-medium bg-primary hover:bg-primary-hover text-primary-foreground transition-all duration-150 shadow-md shadow-primary/20"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-4xl mx-auto px-6 py-12 flex flex-col items-center text-center z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-2 border border-border text-xs font-medium text-muted-foreground mb-6 shadow-sm">
          <Database className="w-3.5 h-3.5 text-success" />
          <span>Connected to MongoDB Atlas • JWT Enabled</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent max-w-2xl leading-tight">
          Modern Enterprise Resource Planning
        </h1>

        <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
          Manage your enterprise operations, multi-tenant schools, inventory, workforce, and finance from a unified system.
        </p>

        {/* User Context Live Display Banner */}
        {user ? (
          <div className="mt-8 w-full max-w-lg p-5 rounded-2xl bg-card border border-primary/30 text-left space-y-3 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Active User Context Session</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-bold uppercase">
                {user.role}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-surface-2 p-3.5 rounded-xl border border-border">
              <div>
                <span className="text-muted-foreground block">Name:</span>
                <span className="text-foreground font-medium">{user.name || "N/A"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Role:</span>
                <span className="text-primary font-semibold">{user.role}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground block">Email:</span>
                <span className="text-foreground font-mono">{user.email}</span>
              </div>
            </div>

            <div className="pt-1">
              <Link
                href="/dashboard"
                className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-primary/20"
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
              className="px-6 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-medium text-sm shadow-xl shadow-primary/20 flex items-center gap-2 transition-all duration-150 group"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/create-account"
              className="px-6 py-3.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-foreground font-medium text-sm transition-all duration-150 flex items-center gap-2 shadow-sm"
            >
              <span>Create Account</span>
            </Link>
            <a
              href="/api/health/db"
              target="_blank"
              className="px-5 py-3.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-muted-foreground hover:text-foreground font-medium text-sm transition-all duration-150 flex items-center gap-2 shadow-sm"
            >
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>DB Health</span>
            </a>
          </div>
        )}

        {/* Feature Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 w-full max-w-3xl text-left">
          <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Global Theme Engine</h3>
            <p className="text-xs text-muted-foreground mt-1">Instant Light, Dark, and System Auto switching with zero flash of unstyled content.</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
              <Database className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">JWT Token Security</h3>
            <p className="text-xs text-muted-foreground mt-1">Multi-tenant isolation and secure cookie token sessions in `src/lib/jwt.ts`.</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center mb-3">
              <User className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">System Admin Role</h3>
            <p className="text-xs text-muted-foreground mt-1">Complete multi-tenant control center for schools, telemetry, and platform users.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border py-6 text-center text-xs text-muted-foreground">
        ERP System Workspace • Next.js & Mongoose & JWT • Professional Design System
      </footer>
    </div>
  );
}
