"use client";

import React, { ReactNode, useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

interface AdminLayoutShellProps {
  children: ReactNode;
  schoolName: string;
  schoolLogo?: string;
}

export default function AdminLayoutShell({
  children,
  schoolName,
  schoolLogo,
}: AdminLayoutShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-row w-full">
      {/* Sidebar Navigation */}
      <AdminSidebar
        schoolName={schoolName}
        schoolLogo={schoolLogo}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <AdminHeader
          schoolName={schoolName}
          onMenuClick={() => setIsMobileOpen(true)}
        />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
