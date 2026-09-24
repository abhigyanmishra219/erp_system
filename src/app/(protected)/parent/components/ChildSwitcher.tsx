"use client";

import React from "react";
import { useParentChild } from "@/context/ParentChildContext";
import {
  User,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronDown,
  Users,
} from "lucide-react";

interface ChildSwitcherProps {
  variant?: "cards" | "pills" | "compact";
  className?: string;
  showTitle?: boolean;
}

export default function ChildSwitcher({
  variant = "cards",
  className = "",
  showTitle = true,
}: ChildSwitcherProps) {
  const { children, selectedChildId, setSelectedChildId, isLoading, error } = useParentChild();

  if (isLoading) {
    return (
      <div className={`w-full animate-pulse ${className}`}>
        {showTitle && (
          <div className="h-4 w-32 bg-surface-2 rounded-md mb-3" />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="h-20 bg-surface-2/60 rounded-2xl border border-border" />
          <div className="h-20 bg-surface-2/60 rounded-2xl border border-border hidden sm:block" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>Failed to load child profiles: {error}</span>
      </div>
    );
  }

  if (!children || children.length === 0) {
    return (
      <div className="w-full p-6 rounded-2xl bg-card border border-dashed border-border text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-surface-2 flex items-center justify-center text-muted-foreground mb-3">
          <Users className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-foreground">No Children Linked</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          There are no active student profiles linked to your parent account. Please contact the school administration to link your children.
        </p>
      </div>
    );
  }

  // If compact dropdown variant
  if (variant === "compact") {
    const active = children.find((c) => c.studentId === selectedChildId) || children[0];
    return (
      <div className={`relative inline-block ${className}`}>
        <label htmlFor="child-compact-select" className="sr-only">
          Select Child
        </label>
        <div className="relative">
          <select
            id="child-compact-select"
            value={active.studentId}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="appearance-none bg-card hover:bg-surface-2 text-foreground text-xs font-semibold pl-8 pr-8 py-2 rounded-xl border border-border shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-primary transition-all cursor-pointer"
          >
            {children.map((item) => (
              <option key={item.studentId} value={item.studentId}>
                {item.student.fullName} ({item.student.class} - {item.student.section})
              </option>
            ))}
          </select>
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-primary">
            <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">
              {active.student.firstName[0]}
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
    );
  }

  // Pill variant (streamlined touch horizontal bar)
  if (variant === "pills") {
    return (
      <div className={`w-full ${className}`}>
        {showTitle && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" />
              Switch Child ({children.length})
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {children.map((item) => {
            const isSelected = item.studentId === selectedChildId;
            return (
              <button
                key={item.studentId}
                type="button"
                onClick={() => setSelectedChildId(item.studentId)}
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card hover:bg-surface-2 text-foreground border-border hover:border-primary/40"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {item.student.firstName[0]}
                </div>
                <span>{item.student.fullName}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-md ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-surface-2 text-muted-foreground"
                  }`}
                >
                  {item.student.class}-{item.student.section}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Default "cards" variant - Mobile-First, Large Touch Targets
  return (
    <div className={`w-full ${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Select Child</span>
            </h2>
            <span className="text-xs text-muted-foreground font-medium">
              ({children.length} {children.length === 1 ? "student" : "students"} linked)
            </span>
          </div>
          {children.length > 1 && (
            <span className="text-[11px] text-muted-foreground hidden sm:inline-block">
              Tap a child card to switch view
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {children.map((item) => {
          const isSelected = item.studentId === selectedChildId;
          const { student } = item;

          return (
            <button
              key={item.studentId}
              type="button"
              onClick={() => setSelectedChildId(item.studentId)}
              className={`relative flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl text-left transition-all border cursor-pointer group ${
                isSelected
                  ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary/40"
                  : "bg-card hover:bg-surface-2 border-border hover:border-primary/40 shadow-2xs"
              }`}
            >
              {/* Active checkmark badge */}
              {isSelected && (
                <div className="absolute top-2.5 right-2.5">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
              )}

              {/* Avatar */}
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base transition-transform group-hover:scale-105 shrink-0 ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {student.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={student.avatarUrl}
                    alt={student.fullName}
                    className="w-full h-full rounded-2xl object-cover"
                  />
                ) : (
                  <span>{student.firstName[0]}</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-sm font-bold text-foreground truncate">
                    {student.fullName}
                  </h3>
                  {item.isPrimaryGuardian && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      Primary
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                    <GraduationCap className="w-3.5 h-3.5 text-primary" />
                    {student.class} - {student.section}
                  </span>
                  {student.admissionNumber && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-[11px]">
                        Adm #{student.admissionNumber}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                  <span className="capitalize">{item.relationship.toLowerCase()}</span>
                  {student.rollNumber && (
                    <>
                      <span>•</span>
                      <span>Roll #{student.rollNumber}</span>
                    </>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
