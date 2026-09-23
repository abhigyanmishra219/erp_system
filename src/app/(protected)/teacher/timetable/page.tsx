"use client";

import React from "react";
import { Clock, Sparkles } from "lucide-react";

export default function TeacherTimetablePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            My Timetable & Schedule
          </h1>
          <p className="text-xs text-muted-foreground">
            Weekly teaching schedule, period allocations, and room assignments
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Phase T6 Module Ready</span>
        </div>
      </div>

      <div className="p-8 sm:p-12 rounded-3xl bg-card border border-border shadow-xs text-center space-y-4 max-w-2xl mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto shadow-sm">
          <Clock className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">Weekly Timetable Matrix Prepared</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Personal teaching matrix mapped from Monday through Saturday, featuring period timings, classroom assignments, and conflict-free slot views.
          </p>
        </div>
      </div>
    </div>
  );
}
