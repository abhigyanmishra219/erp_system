"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { EffectiveSubscription, SchoolModule, hasModuleAccess as checkModuleAccess } from "@/lib/subscription";
import LockedModuleModal from "@/components/subscription/LockedModuleModal";

interface StudentUsageMetrics {
  current: number;
  limit: number;
  remaining: number;
  percentage: number;
  isNearLimit: boolean; // >= 80%
  isAtLimit: boolean; // >= 100%
}

interface SubscriptionContextType {
  subscription: EffectiveSubscription | null;
  isLoading: boolean;
  error: string | null;
  hasModuleAccess: (moduleKey: SchoolModule | string) => boolean;
  studentUsage: StudentUsageMetrics;
  openLockedModal: (moduleKey: SchoolModule | string) => void;
  closeLockedModal: () => void;
  refetchSubscription: () => Promise<void>;
  role?: string;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({
  children,
  role = "ADMIN",
  initialSubscription,
}: {
  children: ReactNode;
  role?: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "SYSTEM_ADMIN" | string;
  initialSubscription?: EffectiveSubscription | null;
}) {
  const [subscription, setSubscription] = useState<EffectiveSubscription | null>(
    initialSubscription || null
  );
  const [isLoading, setIsLoading] = useState<boolean>(!initialSubscription);
  const [error, setError] = useState<string | null>(null);

  // Locked Modal Global State
  const [lockedModalModule, setLockedModalModule] = useState<SchoolModule | string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/subscription");
      if (!res.ok) {
        if (res.status === 401) {
          setSubscription(null);
          return;
        }
        throw new Error(`Failed to load subscription status (${res.status})`);
      }
      const data = await res.json();
      if (data.success && data.subscription) {
        setSubscription(data.subscription);
      } else {
        setSubscription(null);
      }
    } catch (err: any) {
      console.error("SubscriptionContext fetch error:", err);
      setError(err.message || "Failed to load subscription");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialSubscription) {
      fetchSubscription();
    }
  }, [fetchSubscription, initialSubscription]);

  const hasModule = useCallback(
    (moduleKey: SchoolModule | string): boolean => {
      if (!subscription) return false;
      return checkModuleAccess(
        {
          enabledModules: subscription.enabledModules,
          subscriptionStatus: subscription.status,
          subscriptionExpiryDate: subscription.expiryDate ? new Date(subscription.expiryDate) : undefined,
          status: "ACTIVE",
        },
        moduleKey as SchoolModule
      );
    },
    [subscription]
  );

  const openLockedModal = useCallback((moduleKey: SchoolModule | string) => {
    setLockedModalModule(moduleKey);
  }, []);

  const closeLockedModal = useCallback(() => {
    setLockedModalModule(null);
  }, []);

  const currentStudents = subscription?.currentStudents || 0;
  const maxStudents = subscription?.maxStudents || 200;
  const remaining = Math.max(0, maxStudents - currentStudents);
  const percentage = maxStudents > 0 ? Math.min(100, Math.round((currentStudents / maxStudents) * 100)) : 0;

  const studentUsage: StudentUsageMetrics = {
    current: currentStudents,
    limit: maxStudents,
    remaining,
    percentage,
    isNearLimit: percentage >= 80 && percentage < 100,
    isAtLimit: currentStudents >= maxStudents,
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        isLoading,
        error,
        hasModuleAccess: hasModule,
        studentUsage,
        openLockedModal,
        closeLockedModal,
        refetchSubscription: fetchSubscription,
        role,
      }}
    >
      {children}

      {/* Global Locked Feature Modal */}
      <LockedModuleModal
        isOpen={lockedModalModule !== null}
        onClose={closeLockedModal}
        moduleKey={lockedModalModule}
        planName={subscription?.planName || "Standard Plan"}
        role={role}
      />
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    // Return safe fallback if used outside provider
    return {
      subscription: null,
      isLoading: false,
      error: null,
      hasModuleAccess: () => false,
      studentUsage: {
        current: 0,
        limit: 200,
        remaining: 200,
        percentage: 0,
        isNearLimit: false,
        isAtLimit: false,
      },
      openLockedModal: () => {},
      closeLockedModal: () => {},
      refetchSubscription: async () => {},
      role: "ADMIN",
    };
  }
  return context;
}
