"use client";

import React, { useState, ReactNode } from "react";
import TeacherSidebar from "./TeacherSidebar";
import TeacherHeader from "./TeacherHeader";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { SchoolBrandingProvider } from "@/context/SchoolBrandingContext";

interface TeacherLayoutShellProps {
  children: ReactNode;
  schoolName?: string;
  schoolLogo?: string;
  initialBranding?: {
    logo?: string;
    favicon?: string;
    primaryColor?: string;
    secondaryColor?: string;
  } | null;
}

export default function TeacherLayoutShell({
  children,
  schoolName = "School Institution",
  schoolLogo,
  initialBranding,
}: TeacherLayoutShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <SchoolBrandingProvider schoolName={schoolName} initialBranding={initialBranding}>
      <SubscriptionProvider role="TEACHER">
        <div className="flex min-h-screen bg-background text-foreground">
          {/* Teacher Navigation Sidebar */}
          <TeacherSidebar
            schoolName={schoolName}
            schoolLogo={schoolLogo}
            isMobileOpen={isMobileOpen}
            setIsMobileOpen={setIsMobileOpen}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <TeacherHeader
              schoolName={schoolName}
              onMenuClick={() => setIsMobileOpen(true)}
            />

            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
              {children}
            </main>
          </div>
        </div>
      </SubscriptionProvider>
    </SchoolBrandingProvider>
  );
}
