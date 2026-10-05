"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Building2,
  ArrowRight,
  Shield,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Users,
  GraduationCap,
  CalendarCheck,
  FileText,
  BookOpen,
  Award,
  CreditCard,
  Clock,
  Bell,
  BarChart3,
  CalendarX,
  Menu,
  X,
  Layers,
  ChevronRight,
  Lock,
  Server,
  Smartphone,
  Check,
  Globe,
  Sliders,
  LogOut,
  Mail,
  UserCheck,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  const { user, logout } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModuleTab, setActiveModuleTab] = useState<string>("academics");

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/25 selection:text-primary flex flex-col scroll-smooth">
      {/* ========================================================
          1. HEADER / NAVIGATION BAR
      ======================================================== */}
      <header className="sticky top-0 z-50 w-full bg-background/85 backdrop-blur-md border-b border-border transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link href="#top" className="flex items-center gap-3 group">
            <div className="p-2.5 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 group-hover:scale-105 transition-transform duration-200">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-foreground leading-tight">
                ERP Nexus
              </span>
              <span className="text-[11px] font-medium text-muted-foreground tracking-wide">
                School ERP Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link
              href="#features"
              className="hover:text-foreground transition-colors py-1"
            >
              Features
            </Link>
            <Link
              href="#modules"
              className="hover:text-foreground transition-colors py-1"
            >
              Modules
            </Link>
            <Link
              href="#how-it-works"
              className="hover:text-foreground transition-colors py-1"
            >
              How It Works
            </Link>
            <Link
              href="#portals"
              className="hover:text-foreground transition-colors py-1"
            >
              Portals
            </Link>
            <Link
              href="#security"
              className="hover:text-foreground transition-colors py-1"
            >
              Security
            </Link>
            <Link
              href="#pricing"
              className="hover:text-foreground transition-colors py-1"
            >
              Pricing
            </Link>
            <Link
              href="#contact"
              className="hover:text-foreground transition-colors py-1"
            >
              Contact
            </Link>
          </nav>

          {/* Right Controls: Theme + Sign In / Session */}
          <div className="hidden sm:flex items-center gap-3">
            <ThemeToggle />

            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-hover text-primary-foreground shadow-md shadow-primary/20 transition-all flex items-center gap-1.5"
                >
                  <span>Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={logout}
                  className="p-2 rounded-xl text-xs bg-surface-2 hover:bg-surface-3 text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-hover text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/35 transition-all duration-200 flex items-center gap-2 group"
              >
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}
          </div>

          {/* Mobile Hamburger Toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle variant="compact" />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl bg-surface-2 text-foreground border border-border focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Slide-out Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-border bg-background/98 backdrop-blur-xl px-6 py-6 space-y-4 animate-in slide-in-from-top-4 duration-200 shadow-2xl">
            <nav className="flex flex-col space-y-3 text-sm font-medium text-muted-foreground">
              <Link
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-foreground py-1"
              >
                Features
              </Link>
              <Link
                href="#modules"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-foreground py-1"
              >
                Modules
              </Link>
              <Link
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-foreground py-1"
              >
                How It Works
              </Link>
              <Link
                href="#portals"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-foreground py-1"
              >
                Portals
              </Link>
              <Link
                href="#security"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-foreground py-1"
              >
                Security
              </Link>
              <Link
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-foreground py-1"
              >
                Pricing
              </Link>
              <Link
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-foreground py-1"
              >
                Contact
              </Link>
            </nav>

            <div className="pt-4 border-t border-border flex flex-col gap-3">
              {user ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-xs text-center shadow-md shadow-primary/25"
                >
                  Open Dashboard ({user.role})
                </Link>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-xs text-center shadow-md shadow-primary/25 flex items-center justify-center gap-2"
                >
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ========================================================
          2. HERO SECTION + VISUAL PRODUCT MOCKUP
      ======================================================== */}
      <section
        id="top"
        className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 lg:pt-24 lg:pb-32"
      >
        {/* Soft Ambient Light Gradient Backgrounds */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-10 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              {/* Product Category Pill Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>All-in-One School ERP Platform</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
                Modern School <br className="hidden sm:inline" />
                Management, <br />
                <span className="bg-gradient-to-r from-primary via-purple-500 to-indigo-500 bg-clip-text text-transparent">
                  Made Simple.
                </span>
              </h1>

              {/* Subheading */}
              <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Manage students, teachers, academics, attendance, examinations,
                fees, communication, reports, and daily school operations from
                one secure platform.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-sm shadow-xl shadow-primary/25 hover:shadow-primary/35 transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="#features"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-foreground font-semibold text-sm border border-border shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <span>Explore Features</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              </div>

              {/* Trust / Benefits Row */}
              <div className="pt-6 border-t border-border/60">
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-4 text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    <span>Multi-Tenant & Secure</span>
                  </div>
                  <span className="text-border">•</span>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    <span>Cloud Based</span>
                  </div>
                  <span className="text-border">•</span>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    <span>Role-Based Access</span>
                  </div>
                  <span className="text-border">•</span>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    <span>Scalable</span>
                  </div>
                  <span className="text-border">•</span>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    <span>Mobile Ready</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Product Preview Mockup */}
            <div className="lg:col-span-6 relative">
              {/* Decorative Frame Glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-purple-500/20 to-blue-500/20 rounded-3xl blur-2xl -z-10" />

              {/* Mockup Window */}
              <div className="rounded-2xl sm:rounded-3xl bg-card border border-border/80 shadow-2xl overflow-hidden backdrop-blur-xl">
                {/* Browser/Window Header */}
                <div className="px-4 py-3 bg-surface-2/80 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 text-[11px] font-mono text-muted-foreground">
                      portal.erpnexus.com
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Campus Online</span>
                  </div>
                </div>

                {/* Dashboard Inside Preview */}
                <div className="p-4 sm:p-6 space-y-4 bg-card/60">
                  {/* Top Campus Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">
                          St. Xavier&apos;s International School
                        </h4>
                        <p className="text-[10px] text-muted-foreground">
                          Academic Session 2026-27 • CBSE Affiliated
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider">
                      Term 2 Active
                    </span>
                  </div>

                  {/* 4 Realistic KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl bg-surface-1 border border-border space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[10px] font-medium">Students</span>
                        <Users className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <p className="text-base font-bold text-foreground">2,840</p>
                      <p className="text-[9px] text-emerald-500 font-medium">
                        +12% vs last term
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-1 border border-border space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[10px] font-medium">Teachers</span>
                        <UserCheck className="w-3.5 h-3.5 text-purple-500" />
                      </div>
                      <p className="text-base font-bold text-foreground">148</p>
                      <p className="text-[9px] text-muted-foreground">
                        100% active roster
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-1 border border-border space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[10px] font-medium">Classes</span>
                        <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <p className="text-base font-bold text-foreground">64</p>
                      <p className="text-[9px] text-muted-foreground">
                        Grade 1 to 12
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-1 border border-border space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[10px] font-medium">Attendance</span>
                        <CalendarCheck className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <p className="text-base font-bold text-emerald-500">96.8%</p>
                      <p className="text-[9px] text-muted-foreground">
                        Daily average
                      </p>
                    </div>
                  </div>

                  {/* 2 Middle Preview Sections: Attendance & Schedule */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Schedule Snippet */}
                    <div className="p-3.5 rounded-xl bg-surface-2/60 border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground text-[11px] flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          <span>Today&apos;s Timetable</span>
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          Period 4 of 7
                        </span>
                      </div>
                      <div className="space-y-1.5 text-[10px]">
                        <div className="p-2 rounded-lg bg-surface-1 border border-border/80 flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-foreground">
                              Class 10-A • Mathematics
                            </span>
                            <p className="text-muted-foreground">Room 204 • Mr. Sharma</p>
                          </div>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-semibold text-[9px]">
                            In Progress
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-surface-1 border border-border/80 flex justify-between items-center opacity-75">
                          <div>
                            <span className="font-medium text-foreground">
                              Class 9-B • Physics Lab
                            </span>
                            <p className="text-muted-foreground">Lab 2 • Mrs. Sen</p>
                          </div>
                          <span className="text-muted-foreground text-[9px]">
                            11:30 AM
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Fees & Examination Snippet */}
                    <div className="p-3.5 rounded-xl bg-surface-2/60 border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground text-[11px] flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Fee Collection</span>
                        </span>
                        <span className="text-[9px] font-semibold text-emerald-500">
                          94.2% Cleared
                        </span>
                      </div>
                      <div className="space-y-2 text-[10px]">
                        <div className="w-full bg-surface-3 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: "94%" }}
                          />
                        </div>
                        <div className="flex justify-between text-muted-foreground pt-1">
                          <span>Collected: ₹42.8 Lakhs</span>
                          <span>Pending: ₹2.6 Lakhs</span>
                        </div>
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-between text-[10px]">
                          <span className="font-medium flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            <span>Mid-Term Exam Results Published</span>
                          </span>
                          <span className="font-bold">100%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          3. COMPACT STATS / PROOF COUNTERS
      ======================================================== */}
      <section className="border-y border-border bg-surface-1/60 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground">
                99.9%
              </p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Platform Uptime SLA
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-extrabold text-primary">
                15+
              </p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Integrated ERP Modules
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground">
                5 Roles
              </p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Dedicated Portals
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-500">
                100%
              </p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Multi-Tenant Data Isolated
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          4. POWERFUL FEATURES SECTION (12 TILES)
      ======================================================== */}
      <section id="features" className="py-20 sm:py-28 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
              <span>Core Capabilities</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Everything You Need to Run Your School
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              ERP Nexus brings your school&apos;s academic, administrative,
              financial, and communication workflows together in one platform.
            </p>
          </div>

          {/* 12 Feature Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Student Management */}
            <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                1. Student Management
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                Student profiles, admissions, academic information, enrollment
                records, roll numbers, and parent linkages.
              </p>
            </div>

            {/* 2. Teacher Management */}
            <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                2. Teacher Management
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                Faculty profiles, department assignments, class teacher
                designations, and academic workload coordination.
              </p>
            </div>

            {/* 3. Attendance Management */}
            <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                3. Attendance Management
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                Track attendance efficiently across classes and students with
                daily registers, leaves, and instant alerts.
              </p>
            </div>

            {/* 4. Assignment & Study Material */}
            <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                4. Assignment & Study Material
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                Create coursework, set deadlines, accept digital student
                submissions, and distribute curriculum resources.
              </p>
            </div>

            {/* 5. Examination & Results */}
            <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                5. Examination & Results
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                Manage term exams, subject weightages, teacher grade entry, and
                publish automated digital report cards.
              </p>
            </div>

            {/* 6. Fee Management */}
            <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                6. Fee Management
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                Configure fee categories, assign fees by class, record payments,
                track arrears, and issue downloadable receipts.
              </p>
            </div>

            {/* 7. Timetable Management */}
            <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                7. Timetable Management
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                Organize weekly class period routines, prevent teacher schedule
                conflicts, and view personal timetables.
              </p>
            </div>

            {/* 8. Notices & Notifications */}
            <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Bell className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                8. Notices & Notifications
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                Broadcast institutional announcements, targeted circulars, and
                keep parents, teachers, and students updated.
              </p>
            </div>

            {/* 9. Reports & Analytics */}
            <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                9. Reports & Analytics
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                Generate in-depth reports for attendance rates, fee collection,
                academic progress, and school performance metrics.
              </p>
            </div>

            {/* 10. Parent & Student Portals */}
            <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                10. Parent & Student Portals
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                Give parents and students dedicated, private login consoles to
                track homework, exams, circulars, and fees.
              </p>
            </div>

            {/* 11. Multi-Tenant Architecture */}
            <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                11. Multi-Tenant Architecture
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                Manage multiple schools, branches, and campuses securely from one
                central cloud instance with isolated databases.
              </p>
            </div>

            {/* 12. Role-Based Access */}
            <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                12. Role-Based Access
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                Separate access tiers for System Admin, School Admin, Teacher,
                Student, and Parent ensuring strict permission governance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          5. COMPLETE MODULES SECTION
      ======================================================== */}
      <section
        id="modules"
        className="py-20 sm:py-28 bg-surface-1/50 border-t border-border"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
              <span>Comprehensive Toolkit</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              One Platform. Every School Operation.
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Explore the full suite of specialized modules engineered for modern
              educational institutions.
            </p>
          </div>

          {/* Module Category Filter Pills */}
          <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
            <button
              onClick={() => setActiveModuleTab("academics")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeModuleTab === "academics"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-card hover:bg-surface-2 text-muted-foreground border border-border"
              }`}
            >
              Academics & Learning
            </button>
            <button
              onClick={() => setActiveModuleTab("admin")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeModuleTab === "admin"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-card hover:bg-surface-2 text-muted-foreground border border-border"
              }`}
            >
              School Administration
            </button>
            <button
              onClick={() => setActiveModuleTab("communication")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeModuleTab === "communication"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-card hover:bg-surface-2 text-muted-foreground border border-border"
              }`}
            >
              Communication & Finance
            </button>
          </div>

          {/* Modules Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              {
                icon: CalendarCheck,
                title: "Attendance",
                desc: "Real-time daily presence, biometric sync, and absentee reporting.",
                cat: "admin",
              },
              {
                icon: FileText,
                title: "Assignments",
                desc: "Homework distribution, digital submissions, and grading.",
                cat: "academics",
              },
              {
                icon: BookOpen,
                title: "Study Material",
                desc: "Centralized syllabus, lesson plans, videos, and PDFs.",
                cat: "academics",
              },
              {
                icon: Award,
                title: "Examinations",
                desc: "Exam scheduling, date sheets, seating plans, and hall tickets.",
                cat: "academics",
              },
              {
                icon: GraduationCap,
                title: "Results & Grading",
                desc: "Marks entry, automatic GPA calculation, and class ranks.",
                cat: "academics",
              },
              {
                icon: FileText,
                title: "Report Cards",
                desc: "Customizable institutional report cards ready for download.",
                cat: "academics",
              },
              {
                icon: CreditCard,
                title: "Fee Management",
                desc: "Fee structures, offline & online payments, and receipts.",
                cat: "communication",
              },
              {
                icon: Clock,
                title: "Timetable",
                desc: "Weekly class schedules and automated conflict avoidance.",
                cat: "admin",
              },
              {
                icon: CalendarX,
                title: "Leave Management",
                desc: "Online teacher and student leave applications and approvals.",
                cat: "admin",
              },
              {
                icon: Bell,
                title: "Notices & Circulars",
                desc: "Urgent announcements, circulars, and target audience delivery.",
                cat: "communication",
              },
              {
                icon: Mail,
                title: "Notifications",
                desc: "Multi-channel in-app alerts and notifications system.",
                cat: "communication",
              },
              {
                icon: BarChart3,
                title: "Reports & Analytics",
                desc: "Data-driven insights on attendance, finances, and grades.",
                cat: "admin",
              },
              {
                icon: Users,
                title: "Student Roster",
                desc: "Complete directory of student details, guardians, and batches.",
                cat: "admin",
              },
              {
                icon: UserCheck,
                title: "Teacher Faculty",
                desc: "Teacher qualifications, subject mapping, and schedule load.",
                cat: "admin",
              },
              {
                icon: Layers,
                title: "Academic Setup",
                desc: "Academic years, grade levels, sections, and subjects setup.",
                cat: "admin",
              },
            ]
              .filter(
                (m) => activeModuleTab === "all" || m.cat === activeModuleTab
              )
              .map((mod, idx) => {
                const Icon = mod.icon;
                return (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-card border border-border hover:border-primary/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-sm text-foreground">
                        {mod.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                        {mod.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </section>

      {/* ========================================================
          6. HOW IT WORKS SECTION (4 STEPS)
      ======================================================== */}
      <section id="how-it-works" className="py-20 sm:py-28 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
              <span>Seamless Onboarding</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              How ERP Nexus Works
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Get your institution operational in hours with guided deployment
              and intuitive management tools.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-3 relative group hover:border-primary/40 transition-all">
              <span className="font-mono text-3xl font-extrabold text-primary/30 group-hover:text-primary transition-colors">
                01
              </span>
              <h3 className="text-lg font-bold text-foreground">
                Set Up Your School
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Configure your school profile, academic year, grade classes,
                sections, and import your initial faculty and student records.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-3 relative group hover:border-primary/40 transition-all">
              <span className="font-mono text-3xl font-extrabold text-primary/30 group-hover:text-primary transition-colors">
                02
              </span>
              <h3 className="text-lg font-bold text-foreground">
                Manage Daily Operations
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Teachers mark attendance, distribute assignments, and submit exam
                grades while administrators coordinate fees and timetable routines.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-3 relative group hover:border-primary/40 transition-all">
              <span className="font-mono text-3xl font-extrabold text-primary/30 group-hover:text-primary transition-colors">
                03
              </span>
              <h3 className="text-lg font-bold text-foreground">
                Connect Everyone
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Give administrators, teachers, students, and parents
                role-specific portal logins with customized permissions.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-3 relative group hover:border-primary/40 transition-all">
              <span className="font-mono text-3xl font-extrabold text-primary/30 group-hover:text-primary transition-colors">
                04
              </span>
              <h3 className="text-lg font-bold text-foreground">
                Track & Improve
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Leverage analytics and downloadable reports to understand student
                progress, financial health, and institutional growth.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          7. ROLE-BASED PLATFORM SECTION (4 PORTALS)
      ======================================================== */}
      <section
        id="portals"
        className="py-20 sm:py-28 bg-surface-1/40 border-t border-border"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
              <span>Tailored Experiences</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              One Platform for Everyone
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Every member of your school community receives a tailored,
              dedicated interface optimized for their daily responsibilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Admin Portal */}
            <div className="p-6 rounded-2xl bg-card border border-border hover:border-indigo-500/40 shadow-sm hover:shadow-xl transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                  Institution Leadership
                </span>
                <h3 className="text-lg font-bold text-foreground mt-0.5">
                  School Admin Portal
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Complete school administration and management: configure terms,
                manage faculty, oversee fee collection, and approve leaves.
              </p>
              <ul className="text-xs text-muted-foreground space-y-1.5 pt-2 border-t border-border">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Student & Teacher Onboarding</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Fee Collection & Ledger</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Campus-Wide Circulars</span>
                </li>
              </ul>
            </div>

            {/* Teacher Portal */}
            <div className="p-6 rounded-2xl bg-card border border-border hover:border-amber-500/40 shadow-sm hover:shadow-xl transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                  Academic Faculty
                </span>
                <h3 className="text-lg font-bold text-foreground mt-0.5">
                  Teacher Portal
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Manage assigned classes, record daily attendance, upload
                coursework, enter examination marks, and track student growth.
              </p>
              <ul className="text-xs text-muted-foreground space-y-1.5 pt-2 border-t border-border">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-amber-500" />
                  <span>One-Click Class Attendance</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-amber-500" />
                  <span>Digital Homework & Material</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-amber-500" />
                  <span>Exam Mark Evaluation</span>
                </li>
              </ul>
            </div>

            {/* Student Portal */}
            <div className="p-6 rounded-2xl bg-card border border-border hover:border-emerald-500/40 shadow-sm hover:shadow-xl transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                  Learners
                </span>
                <h3 className="text-lg font-bold text-foreground mt-0.5">
                  Student Portal
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Access academics, class attendance records, submit assignments,
                view upcoming examination schedules, and download report cards.
              </p>
              <ul className="text-xs text-muted-foreground space-y-1.5 pt-2 border-t border-border">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Daily Schedule & Timetable</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Course Material Downloads</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Published Report Cards</span>
                </li>
              </ul>
            </div>

            {/* Parent Portal */}
            <div className="p-6 rounded-2xl bg-card border border-border hover:border-cyan-500/40 shadow-sm hover:shadow-xl transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-500">
                  Guardians
                </span>
                <h3 className="text-lg font-bold text-foreground mt-0.5">
                  Parent Portal
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Stay connected with your child&apos;s academic activities, view
                attendance trends, monitor fee receipts, and receive official
                circulars.
              </p>
              <ul className="text-xs text-muted-foreground space-y-1.5 pt-2 border-t border-border">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Live Attendance & Alerts</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Fee Receipts & Invoices</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Direct School Circulars</span>
                </li>
              </ul>
            </div>
          </div>

          {/* System Admin Platform Note */}
          <div className="p-5 rounded-2xl bg-surface-2 border border-border/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-foreground text-sm block">
                  Platform System Administration
                </span>
                <span>
                  High-security platform-level management of tenant schools,
                  subscriptions, and infrastructure configuration (provisioned
                  via dedicated administrative protocol).
                </span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-surface-3 text-muted-foreground font-mono text-[11px] whitespace-nowrap">
              Restricted Infrastructure Tier
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================
          8. MULTI-TENANT ARCHITECTURE SECTION
      ======================================================== */}
      <section
        id="multi-tenant"
        className="py-20 sm:py-28 relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
              <span>Enterprise Isolation</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Built for Multiple Schools
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Manage multiple schools from a single secure platform while keeping
              each school&apos;s users, data, settings, and operations isolated.
            </p>
          </div>

          {/* Elegant Visual Multi-Tenant Architecture Diagram */}
          <div className="max-w-4xl mx-auto p-6 sm:p-10 rounded-3xl bg-card border border-border shadow-xl space-y-8">
            {/* Top Root: Platform Core */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-xl shadow-primary/25">
                <Globe className="w-5 h-5" />
                <span>ERP Nexus Multi-Tenant Engine</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Unified security, subscription management, and platform governance
              </p>
            </div>

            {/* Connecting Lines */}
            <div className="relative flex justify-center">
              <div className="w-px h-8 bg-border" />
            </div>

            {/* Sub-Tenants Grid: School A, B, C, D */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-surface-2 border border-border text-center space-y-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
                  <Building2 className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-xs text-foreground">
                  School A: St. Xavier&apos;s
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  Independent roster, isolated student data & fee ledgers.
                </p>
                <span className="inline-block text-[9px] px-2 py-0.5 rounded-full bg-surface-3 text-muted-foreground font-mono">
                  Tenant ID: #SCH-01
                </span>
              </div>

              <div className="p-4 rounded-xl bg-surface-2 border border-border text-center space-y-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                  <Building2 className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-xs text-foreground">
                  School B: Oakridge Academy
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  Custom grading system, separate teacher pool & schedules.
                </p>
                <span className="inline-block text-[9px] px-2 py-0.5 rounded-full bg-surface-3 text-muted-foreground font-mono">
                  Tenant ID: #SCH-02
                </span>
              </div>

              <div className="p-4 rounded-xl bg-surface-2 border border-border text-center space-y-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto">
                  <Building2 className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-xs text-foreground">
                  School C: Delhi Public
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  Independent branding, distinct academic year & fees.
                </p>
                <span className="inline-block text-[9px] px-2 py-0.5 rounded-full bg-surface-3 text-muted-foreground font-mono">
                  Tenant ID: #SCH-03
                </span>
              </div>

              <div className="p-4 rounded-xl bg-surface-2 border border-border text-center space-y-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                  <Building2 className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-xs text-foreground">
                  School D: Cambridge Prep
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  Isolated exams, student report cards, and notices.
                </p>
                <span className="inline-block text-[9px] px-2 py-0.5 rounded-full bg-surface-3 text-muted-foreground font-mono">
                  Tenant ID: #SCH-04
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          9. SECURITY SECTION
      ======================================================== */}
      <section
        id="security"
        className="py-20 sm:py-28 bg-surface-1/40 border-t border-border"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
              <span>Enterprise Confidence</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Built With Security in Mind
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Protecting school records, student privacy, and financial
              transactions with industrial-grade data safeguards.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                Role-Based Access Control
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Granular permission validation across every action so staff,
                students, and parents only access permitted resources.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                Secure Authentication
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Hardened credential encryption, session validation, and strict
                token guards protecting against unauthorized entry.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                Multi-Tenant Data Isolation
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Every school&apos;s database queries are strictly scoped to their
                tenant instance, eliminating cross-tenant visibility.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                Protected School Data
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Comprehensive data privacy protocols preventing data tampering,
                unauthorized exports, and unverified data modifications.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                Controlled User Permissions
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Administrative control over class allocations, marks entry
                locks, and publication permissions across faculty.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                Scalable Cloud Infrastructure
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Architected for high concurrency during peak morning attendance
                and exam result releases with zero performance degradation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          10. PRICING SECTION (MATCHING SYSTEM PLANS)
      ======================================================== */}
      <section id="pricing" className="py-20 sm:py-28 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
              <span>Subscription Plans</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Transparent Plans for Every Institution
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Choose the ideal tier for your school or educational group.
              Subscriptions can be managed anytime by your school administrator.
            </p>
          </div>

          {/* 4 Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* BASIC */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Starter
                  </span>
                  <h3 className="text-xl font-bold text-foreground mt-0.5">
                    Basic Plan
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ideal for small academies and early learning centers.
                  </p>
                </div>

                <div className="pt-2 border-t border-border">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-foreground">
                      ₹9,999
                    </span>
                    <span className="text-xs text-muted-foreground">/year</span>
                  </div>
                </div>

                <ul className="text-xs text-muted-foreground space-y-2.5 pt-2">
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Up to 200 Students</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>2 School Admins</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>5 GB Cloud Storage</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Attendance & Homework</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Fee Tracking & Receipts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Notices & Circulars</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/login"
                className="w-full py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-xs font-semibold text-foreground text-center border border-border transition-colors block"
              >
                Sign In to Subscribe
              </Link>
            </div>

            {/* STANDARD */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Growing School
                  </span>
                  <h3 className="text-xl font-bold text-foreground mt-0.5">
                    Standard Plan
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    For secondary schools requiring examination management.
                  </p>
                </div>

                <div className="pt-2 border-t border-border">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-foreground">
                      ₹19,999
                    </span>
                    <span className="text-xs text-muted-foreground">/year</span>
                  </div>
                </div>

                <ul className="text-xs text-muted-foreground space-y-2.5 pt-2">
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Up to 500 Students</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>5 School Admins</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>10 GB Cloud Storage</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Term Exams & Grade Entry</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Digital Study Material</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Student & Parent Consoles</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/login"
                className="w-full py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-xs font-semibold text-foreground text-center border border-border transition-colors block"
              >
                Sign In to Subscribe
              </Link>
            </div>

            {/* PROFESSIONAL (Featured) */}
            <div className="p-6 rounded-2xl bg-card border-2 border-primary shadow-xl shadow-primary/10 flex flex-col justify-between space-y-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground font-bold text-[10px] uppercase tracking-wider shadow-md">
                Most Popular
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Comprehensive
                  </span>
                  <h3 className="text-xl font-bold text-foreground mt-0.5">
                    Professional
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Complete solution for established K-12 institutions.
                  </p>
                </div>

                <div className="pt-2 border-t border-border">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-foreground">
                      ₹39,999
                    </span>
                    <span className="text-xs text-muted-foreground">/year</span>
                  </div>
                </div>

                <ul className="text-xs text-muted-foreground space-y-2.5 pt-2">
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Up to 1,500 Students</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>10 School Admins</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>25 GB Cloud Storage</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Automated Timetable Matrix</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Report Cards & Transcripts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Leave Approval Workflow</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Priority Technical Support</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/login"
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-xs font-semibold text-primary-foreground text-center shadow-md shadow-primary/20 transition-all block"
              >
                Sign In to Subscribe
              </Link>
            </div>

            {/* ENTERPRISE */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Multi-Branch
                  </span>
                  <h3 className="text-xl font-bold text-foreground mt-0.5">
                    Enterprise
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    For large educational chains, colleges, and trusts.
                  </p>
                </div>

                <div className="pt-2 border-t border-border">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-foreground">
                      Custom
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Tailored Quotas
                    </span>
                  </div>
                </div>

                <ul className="text-xs text-muted-foreground space-y-2.5 pt-2">
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>5,000+ Students</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Unlimited School Admins</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>100 GB Cloud Storage</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>All Core & Advanced Modules</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Multi-School Tenant Hub</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Dedicated Account Manager</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/login"
                className="w-full py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-xs font-semibold text-foreground text-center border border-border transition-colors block"
              >
                Sign In / Inquire
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          11. FINAL CALL TO ACTION (CTA) SECTION
      ======================================================== */}
      <section className="py-20 bg-gradient-to-b from-surface-1 to-background border-t border-border relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/25">
            <Building2 className="w-8 h-8" />
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
            Ready to Simplify Your School Management?
          </h2>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Bring your school&apos;s academic, administrative, and operational
            workflows together with ERP Nexus.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-sm shadow-xl shadow-primary/25 hover:shadow-primary/35 transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Sign In to Your Portal</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================
          12. PROFESSIONAL SAAS FOOTER
      ======================================================== */}
      <footer id="contact" className="border-t border-border bg-surface-1 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 lg:gap-12 pb-12 border-b border-border">
            {/* Brand column */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-lg tracking-tight text-foreground">
                  ERP Nexus
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm leading-relaxed">
                Modern School ERP Platform unifying academic operations,
                attendance, examinations, fees, and multi-tenant management for
                institutions worldwide.
              </p>
            </div>

            {/* Product Column */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                Product
              </p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <Link href="#features" className="hover:text-foreground">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#modules" className="hover:text-foreground">
                    Modules
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="hover:text-foreground">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#how-it-works" className="hover:text-foreground">
                    How It Works
                  </Link>
                </li>
              </ul>
            </div>

            {/* Platform Column */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                Platform
              </p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <Link href="/login" className="hover:text-foreground">
                    School Admin Portal
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-foreground">
                    Teacher Portal
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-foreground">
                    Student Portal
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-foreground">
                    Parent Portal
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal & Company Column */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                Governance
              </p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <Link href="#security" className="hover:text-foreground">
                    Data Security
                  </Link>
                </li>
                <li>
                  <Link href="#multi-tenant" className="hover:text-foreground">
                    Multi-Tenant Cloud
                  </Link>
                </li>
                <li>
                  <span className="hover:text-foreground cursor-pointer">
                    Privacy Policy
                  </span>
                </li>
                <li>
                  <span className="hover:text-foreground cursor-pointer">
                    Terms & Conditions
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>© 2026 ERP Nexus. All rights reserved.</p>
            <p>Enterprise Resource Planning Platform for Education</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
