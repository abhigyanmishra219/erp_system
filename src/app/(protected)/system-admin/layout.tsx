import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getUserFromCookies } from "@/lib/helper";
import SystemAdminSidebar from "./components/SystemAdminSidebar";
import SystemAdminHeader from "./components/SystemAdminHeader";

export default async function SystemAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const userDoc = await getUserFromCookies();

  if (!userDoc) {
    redirect("/login");
  }

  // Guard: Only SYSTEM_ADMIN role can access this section
  if (userDoc.role !== "SYSTEM_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row antialiased selection:bg-primary/30 selection:text-primary">
      {/* Sidebar Navigation */}
      <SystemAdminSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <SystemAdminHeader user={userDoc} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
