"use client";

import React from "react";
import { GraduationCap, Download, Printer } from "lucide-react";

export default function StudentReportCardsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Academic Report Cards
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Download and print official term report cards and cumulative transcripts.
          </p>
        </div>
      </div>

      <div className="p-8 rounded-3xl bg-card border border-border text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
          <GraduationCap className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">Report Cards Module</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Official report card generation and PDF downloads will be populated in Phase S5.
        </p>
      </div>
    </div>
  );
}
