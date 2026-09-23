"use client";

import React from "react";
import { Award, Calendar, AlertCircle } from "lucide-react";

export default function StudentExamsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Upcoming Examinations
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Check your examination schedule, subject dates, maximum marks, and syllabus.
          </p>
        </div>
      </div>

      <div className="p-8 rounded-3xl bg-card border border-border text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
          <Award className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">Exams Schedule Module</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Exam schedules and datesheets will be populated in Phase S4.
        </p>
      </div>
    </div>
  );
}
