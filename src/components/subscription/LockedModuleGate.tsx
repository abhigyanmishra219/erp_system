"use client";

import React, { ReactNode } from "react";
import { SchoolModule } from "@/lib/subscription";
import { useSubscription } from "@/context/SubscriptionContext";
import LockedModuleState from "./LockedModuleState";
import { RotateCw } from "lucide-react";

interface LockedModuleGateProps {
  moduleKey: SchoolModule;
  children: ReactNode;
  dashboardPath?: string;
}

export default function LockedModuleGate({
  moduleKey,
  children,
  dashboardPath,
}: LockedModuleGateProps) {
  const { hasModuleAccess, isLoading, subscription, role } = useSubscription();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <RotateCw className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Verifying feature entitlements...</p>
      </div>
    );
  }

  const isEnabled = hasModuleAccess(moduleKey);

  if (!isEnabled) {
    const fallbackPath =
      dashboardPath ||
      (role === "TEACHER"
        ? "/teacher/dashboard"
        : role === "STUDENT"
        ? "/student/dashboard"
        : role === "PARENT"
        ? "/parent/dashboard"
        : "/admin");

    return (
      <LockedModuleState
        moduleKey={moduleKey}
        planName={subscription?.planName || "Current Plan"}
        dashboardPath={fallbackPath}
        role={role}
      />
    );
  }

  return <>{children}</>;
}
