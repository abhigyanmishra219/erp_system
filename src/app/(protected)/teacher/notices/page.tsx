"use client";

import React from "react";
import { Bell, Sparkles } from "lucide-react";

export default function TeacherNoticesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Notices & Circulars
          </h1>
          <p className="text-xs text-muted-foreground">
            Official announcements and circulars published by school administration
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Phase T8 Module Ready</span>
        </div>
      </div>

      <div className="p-8 sm:p-12 rounded-3xl bg-card border border-border shadow-xs text-center space-y-4 max-w-2xl mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
          <Bell className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">Teacher Circulars Channel Prepared</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            School-wide announcements, staff circulars, and class-specific notices published by school administration will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
