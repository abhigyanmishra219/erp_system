import React, { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getUserFromCookies } from "@/lib/helper";
import connectToDatabase from "@/lib/db";
import School, { ISchool } from "@/models/School";
import TeacherLayoutShell from "./components/TeacherLayoutShell";
import { ShieldAlert, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function TeacherLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getUserFromCookies();

  if (!user) {
    redirect("/login");
  }

  // 1. Enforce TEACHER role strictly
  if (user.role !== "TEACHER") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-3xl bg-card border border-destructive/30 shadow-2xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Access Denied (403)</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The Teacher Portal is strictly restricted to accounts with the <strong className="text-foreground">TEACHER</strong> role. Your current account role is <span className="font-mono font-bold text-primary">{user.role}</span>.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-md shadow-primary/25"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Enforce valid schoolId association
  if (!user.schoolId) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-3xl bg-card border border-amber-500/30 shadow-2xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto shadow-sm">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-foreground">No School Tenant Linked</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This teacher account is not linked to any active school tenant in the database. Please contact your institution administrator.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-foreground text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Workspace</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Fetch tenant School from MongoDB
  await connectToDatabase();
  const schoolDoc: ISchool | null = await School.findById(user.schoolId.toString()).lean();

  if (!schoolDoc || schoolDoc.isDeleted) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-3xl bg-card border border-destructive/30 shadow-2xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-foreground">School Not Found</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The school institution record associated with this teacher account has been archived or deleted.
          </p>
        </div>
      </div>
    );
  }

  // 4. Handle Suspended State
  if (schoolDoc.status === "SUSPENDED") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-3xl bg-card border border-amber-500/30 shadow-2xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto shadow-sm">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-foreground">School Account Suspended</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Access to <strong className="text-foreground">{schoolDoc.name}</strong> has been temporarily suspended by the platform administrator.
          </p>
        </div>
      </div>
    );
  }

  // 5. Render standard Teacher Layout Shell
  return (
    <TeacherLayoutShell
      schoolName={schoolDoc.name}
      schoolLogo={schoolDoc.logo || schoolDoc.branding?.logo}
      initialBranding={{
        logo: schoolDoc.logo || schoolDoc.branding?.logo || "",
        favicon: schoolDoc.branding?.favicon || "",
        primaryColor: schoolDoc.branding?.primaryColor || "",
        secondaryColor: schoolDoc.branding?.secondaryColor || "",
      }}
    >
      {children}
    </TeacherLayoutShell>
  );
}
