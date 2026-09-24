"use client";

import React from "react";
import Link from "next/link";
import { Lock, ArrowLeft, ShieldAlert, Sparkles } from "lucide-react";
import { ERP_MODULES, SchoolModule } from "@/lib/subscription";

interface LockedModuleStateProps {
  moduleKey: SchoolModule | string;
  planName?: string;
  dashboardPath?: string;
  role?: string;
}

export default function LockedModuleState({
  moduleKey,
  planName = "Current Plan",
  dashboardPath = "/admin",
  role = "ADMIN",
}: LockedModuleStateProps) {
  const validKey = moduleKey as SchoolModule;
  const modMeta = ERP_MODULES[validKey] || {
    label: String(moduleKey).replace(/_/g, " "),
    description: "This feature module is not included in your active subscription tier.",
  };

  const isSchoolAdmin = role === "ADMIN";

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-lg w-full p-8 rounded-3xl bg-card border border-border shadow-xl text-center space-y-6 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Lock Icon Emblem */}
        <div className="w-16 h-16 rounded-3xl bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/25 shadow-lg shadow-amber-500/10">
          <Lock className="w-8 h-8" />
        </div>

        {/* Header Text */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Plan Required</span>
          </div>

          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            {modMeta.label} Module Not Included
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            This module is not included in your school&apos;s current subscription plan.
          </p>
        </div>

        {/* Current Plan & Module Specs */}
        <div className="p-4 rounded-2xl bg-surface-2 border border-border space-y-2.5 text-xs text-left max-w-sm mx-auto">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-medium">Current Plan:</span>
            <span className="font-bold text-foreground px-2 py-0.5 rounded-lg bg-surface-1 border border-border">
              {planName}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-medium">Required Module:</span>
            <span className="font-semibold text-amber-500">
              {modMeta.label}
            </span>
          </div>
        </div>

        {/* Advisory Box */}
        <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-muted-foreground text-xs flex items-start gap-2.5 text-left max-w-sm mx-auto">
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            {isSchoolAdmin
              ? "Please contact your platform administrator to enable this module in your subscription plan."
              : "Please contact your school administrator to enable this module for your institution."}
          </p>
        </div>

        {/* Return Button */}
        <div className="pt-2">
          <Link
            href={dashboardPath}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-md shadow-primary/25 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
