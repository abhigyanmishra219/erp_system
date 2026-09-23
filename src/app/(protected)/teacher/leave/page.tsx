"use client";

import React from "react";
import { CalendarX, Sparkles } from "lucide-react";

export default function TeacherLeavePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Leave Applications
          </h1>
          <p className="text-xs text-muted-foreground">
            Apply for faculty leave, view status, and track leave balances
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Phase T7 Module Ready</span>
        </div>
      </div>

      <div className="p-8 sm:p-12 rounded-3xl bg-card border border-border shadow-xs text-center space-y-4 max-w-2xl mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-sm">
          <CalendarX className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">Faculty Leave System Prepared</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Apply for Medical, Casual, and Academic leaves with reason submission, review past approvals/rejections, and monitor allocated balances.
          </p>
        </div>
      </div>
    </div>
  );
}
