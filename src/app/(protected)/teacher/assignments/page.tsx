"use client";

import React from "react";
import { FileText, Sparkles } from "lucide-react";

export default function TeacherAssignmentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Assignments & Grading
          </h1>
          <p className="text-xs text-muted-foreground">
            Create homework tasks, evaluate student submissions, and record grades
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Phase T3 Module Ready</span>
        </div>
      </div>

      <div className="p-8 sm:p-12 rounded-3xl bg-card border border-border shadow-xs text-center space-y-4 max-w-2xl mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-sm">
          <FileText className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">Assignment Workflow Prepared</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Coursework creation, file attachments, submission inbox, grading rubrics, and feedback dispatch will be active in the Phase T3 Assignments module.
          </p>
        </div>
      </div>
    </div>
  );
}
