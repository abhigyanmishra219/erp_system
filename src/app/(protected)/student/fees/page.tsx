"use client";

import React from "react";
import { CreditCard, Receipt, DollarSign } from "lucide-react";

export default function StudentFeesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Fee Invoices & Receipts
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review fee structures, outstanding balances, payment receipts, and due dates.
          </p>
        </div>
      </div>

      <div className="p-8 rounded-3xl bg-card border border-border text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto">
          <CreditCard className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">Fee Payments Module</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Student fee statements and receipt downloading will be populated in Phase S6.
        </p>
      </div>
    </div>
  );
}
