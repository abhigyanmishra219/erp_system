"use client";

import React, { useState, ReactNode } from "react";
import ParentSidebar from "./ParentSidebar";
import ParentHeader from "./ParentHeader";
import { ParentChildProvider } from "@/context/ParentChildContext";

interface ParentLayoutShellProps {
  children: ReactNode;
  schoolName?: string;
  schoolLogo?: string;
}

export default function ParentLayoutShell({
  children,
  schoolName,
  schoolLogo,
}: ParentLayoutShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <ParentChildProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
        {/* 1. Left Sidebar Navigation */}
        <ParentSidebar
          schoolName={schoolName}
          schoolLogo={schoolLogo}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
        />

        {/* 2. Main Content View Area */}
        <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
          {/* Top Navbar Header */}
          <ParentHeader
            schoolName={schoolName}
            onMenuClick={() => setIsMobileOpen((prev) => !prev)}
          />

          {/* Scrollable Page Body */}
          <main className="flex-1 min-h-0 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 bg-background/50">
            <div className="max-w-7xl mx-auto space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </ParentChildProvider>
  );
}
