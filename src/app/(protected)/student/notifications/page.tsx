"use client";

import React from "react";
import { Inbox, BellRing, CheckCheck } from "lucide-react";

export default function StudentNotificationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Notification Center
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Stay updated with real-time alerts for assignments, published results, and announcements.
          </p>
        </div>
      </div>

      <div className="p-8 rounded-3xl bg-card border border-border text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
          <Inbox className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">Notifications Module</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Personal in-app student notifications and alert history will be populated in Phase S8.
        </p>
      </div>
    </div>
  );
}
