"use client";

import React from "react";
import { Clock, Calendar, MapPin } from "lucide-react";

export default function StudentTimetablePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Class Timetable & Periods
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            View your weekly class schedule, subject slots, teacher allocations, and room assignments.
          </p>
        </div>
      </div>

      <div className="p-8 rounded-3xl bg-card border border-border text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">Class Timetable Module</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Student section weekly schedule views will be populated in Phase S7.
        </p>
      </div>
    </div>
  );
}
