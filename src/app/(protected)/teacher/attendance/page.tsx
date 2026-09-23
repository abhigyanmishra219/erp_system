"use client";

import React from "react";
import { CalendarCheck, Sparkles } from "lucide-react";

export default function TeacherAttendancePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Class Attendance
          </h1>
          <p className="text-xs text-muted-foreground">
            Daily roll-call marking and attendance history for assigned classes
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Phase T2 Module Ready</span>
        </div>
      </div>

      <div className="p-8 sm:p-12 rounded-3xl bg-card border border-border shadow-xs text-center space-y-4 max-w-2xl mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
          <CalendarCheck className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">Attendance Architecture Prepared</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Attendance roll-call marking, bulk toggle (Present/Absent/Late/Excused), class-teacher locking, and monthly attendance reviews will be active in the Phase T2 Attendance rollout.
          </p>
        </div>
      </div>
    </div>
  );
}
