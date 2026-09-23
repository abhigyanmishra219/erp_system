"use client";

import React from "react";
import { Users, Sparkles, Filter, Search } from "lucide-react";

export default function TeacherStudentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            My Students
          </h1>
          <p className="text-xs text-muted-foreground">
            Student directory restricted to your assigned classes and sections
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Phase T1 Module Foundation</span>
        </div>
      </div>

      <div className="p-8 sm:p-12 rounded-3xl bg-card border border-border shadow-xs text-center space-y-4 max-w-2xl mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-sm">
          <Users className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">Student Roster Scope Prepared</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The student roster for teachers is scoped strictly to enrolled students in your assigned classes and sections. Full student profiles and guardian contact views will be enabled in Phase T1.
          </p>
        </div>
      </div>
    </div>
  );
}
