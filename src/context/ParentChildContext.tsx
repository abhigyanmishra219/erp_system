"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface LinkedStudent {
  _id: string;
  studentId: string;
  admissionNumber: string;
  rollNumber?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  gender?: string;
  avatarUrl?: string;
  status: string;
  class: string;
  section: string;
  academicYear: string;
  classId?: string;
  sectionId?: string;
  academicYearId?: string;
}

export interface LinkedChildItem {
  studentId: string;
  relationship: string;
  isPrimaryGuardian: boolean;
  isEmergencyContact: boolean;
  canPickup: boolean;
  notes?: string;
  student: LinkedStudent;
}

interface ParentChildContextType {
  children: LinkedChildItem[];
  selectedChild: LinkedChildItem | null;
  selectedChildId: string | null;
  setSelectedChildId: (id: string) => void;
  isLoading: boolean;
  error: string | null;
  refreshChildren: () => Promise<void>;
}

const ParentChildContext = createContext<ParentChildContextType | undefined>(undefined);

const STORAGE_KEY = "erp_parent_selected_child_id";

export function ParentChildProvider({ children }: { children: React.ReactNode }) {
  const [linkedChildren, setLinkedChildren] = useState<LinkedChildItem[]>([]);
  const [selectedChildId, setSelectedChildIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChildren = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/parent/children");
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setLinkedChildren([]);
          setSelectedChildIdState(null);
          return;
        }
        throw new Error("Failed to load children list");
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.data?.children)) {
        const items: LinkedChildItem[] = data.data.children;
        setLinkedChildren(items);

        // Determine active child
        let nextSelectedId: string | null = null;
        if (items.length > 0) {
          const savedId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
          const foundSaved = savedId ? items.find((c) => c.studentId === savedId) : null;
          if (foundSaved) {
            nextSelectedId = foundSaved.studentId;
          } else {
            nextSelectedId = items[0].studentId;
          }
        }
        setSelectedChildIdState(nextSelectedId);
      } else {
        setLinkedChildren([]);
        setSelectedChildIdState(null);
      }
    } catch (err: any) {
      console.error("Error loading parent children:", err);
      setError(err.message || "Failed to load linked children");
      setLinkedChildren([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  const setSelectedChildId = useCallback((id: string) => {
    setSelectedChildIdState(id);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, id);
      } catch (e) {
        console.warn("Could not persist selected child ID:", e);
      }
    }
  }, []);

  const selectedChild =
    linkedChildren.find((c) => c.studentId === selectedChildId) ||
    (linkedChildren.length > 0 ? linkedChildren[0] : null);

  return (
    <ParentChildContext.Provider
      value={{
        children: linkedChildren,
        selectedChild,
        selectedChildId: selectedChild?.studentId || null,
        setSelectedChildId,
        isLoading,
        error,
        refreshChildren: fetchChildren,
      }}
    >
      {children}
    </ParentChildContext.Provider>
  );
}

export function useParentChild(): ParentChildContextType {
  const context = useContext(ParentChildContext);
  if (!context) {
    throw new Error("useParentChild must be used within a ParentChildProvider");
  }
  return context;
}
