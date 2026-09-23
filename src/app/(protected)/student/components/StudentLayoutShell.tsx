"use client";

import React, { useState, ReactNode } from "react";
import StudentSidebar from "./StudentSidebar";
import StudentHeader from "./StudentHeader";

interface StudentLayoutShellProps {
  children: ReactNode;
  schoolName?: string;
  schoolLogo?: string;
}

export default function StudentLayoutShell({
  children,
  schoolName = "School Institution",
  schoolLogo,
}: StudentLayoutShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Student Navigation Sidebar */}
      <StudentSidebar
        schoolName={schoolName}
        schoolLogo={schoolLogo}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <StudentHeader
          schoolName={schoolName}
          onMenuClick={() => setIsMobileOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
          {children}
        </main>
      </div>
    </div>
  );
}
