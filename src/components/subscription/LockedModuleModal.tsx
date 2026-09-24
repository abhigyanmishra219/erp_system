"use client";

import React from "react";
import { Lock, ShieldAlert, Sparkles, X, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { ERP_MODULES, SchoolModule } from "@/lib/subscription";

interface LockedModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleKey?: SchoolModule | string | null;
  planName?: string;
  role?: string;
}

export default function LockedModuleModal({
  isOpen,
  onClose,
  moduleKey,
  planName = "Current Plan",
  role = "ADMIN",
}: LockedModuleModalProps) {
  if (!isOpen || !moduleKey) return null;

  const validKey = moduleKey as SchoolModule;
  const modMeta = ERP_MODULES[validKey] || {
    label: String(moduleKey).replace(/_/g, " "),
    description: "This feature module is not included in your active subscription tier.",
  };

  const isSchoolAdmin = role === "ADMIN";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md p-6 overflow-hidden text-left align-middle bg-card border border-border/80 rounded-3xl shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header with Lock Icon */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center border border-amber-500/25 shadow-md shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Sparkles className="w-3 h-3" />
                <span>Subscription Required</span>
              </div>
              <h3 className="text-lg font-bold text-foreground">
                {modMeta.label} Module
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Body */}
        <div className="space-y-3 text-xs">
          <p className="text-muted-foreground leading-relaxed">
            This module is not included in your school&apos;s active subscription package.
          </p>

          <div className="p-3.5 rounded-2xl bg-surface-2 border border-border space-y-2">
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

          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-muted-foreground flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              {isSchoolAdmin
                ? "To unlock this feature, please contact your platform administrator to upgrade your school's plan or enable this module in your subscription."
                : "Please contact your school administrator to enable this module for your institution."}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-foreground text-xs font-semibold transition-colors cursor-pointer border border-border"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
