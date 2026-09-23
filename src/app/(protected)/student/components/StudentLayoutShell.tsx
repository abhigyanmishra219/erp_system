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
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Student Navigation Sidebar */}
      <StudentSidebar
        schoolName={schoolName}
        schoolLogo={schoolLogo}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <StudentHeader
          schoolName={schoolName}
          onMenuClick={() => setIsMobileOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl w-full mx-auto animate-in fade-in duration-200">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
