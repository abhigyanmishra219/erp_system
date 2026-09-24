"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  User,
  GraduationCap,
  Calendar,
  ShieldCheck,
  Phone,
  Mail,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface ChildItem {
  studentId: string;
  student: {
    _id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    admissionNumber: string;
    rollNumber: string;
    gender: string;
    dateOfBirth: string;
    photo?: string | null;
    class: string;
    section: string;
    academicYear: string;
  };
  relationship: string;
  isPrimaryGuardian: boolean;
  isEmergencyContact: boolean;
  canPickup: boolean;
  notes?: string;
}

export default function ParentChildrenPage() {
  const [children, setChildren] = useState<ChildItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/parent/children");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load linked children");
      }
      setChildren(json.data.children || []);
    } catch (err: any) {
      console.error("Error fetching children:", err);
      setError(err.message || "Failed to load children records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs sm:text-sm text-muted-foreground font-medium">
          Loading linked children records...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-card via-card to-primary/5 border border-border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              My Children
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            View academic profiles, class enrollment, and guardian authorization details for your linked children.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchChildren}
          title="Refresh"
          className="p-2.5 rounded-2xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Children List / Grid */}
      {children.length === 0 ? (
        <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-foreground">No Children Linked Yet</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your children will appear here once linked by the school administration. Please contact the school office to update your guardian records.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {children.map((item) => (
            <div
              key={item.studentId}
              className="p-6 rounded-3xl bg-card border border-border hover:border-primary/40 transition-all flex flex-col justify-between space-y-5 shadow-xs"
            >
              {/* Profile Card Header */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl shrink-0 shadow-xs border border-primary/20">
                  {item.student.photo ? (
                    <img
                      src={item.student.photo}
                      alt={item.student.fullName}
                      className="w-full h-full rounded-2xl object-cover"
                    />
                  ) : (
                    item.student.firstName[0]
                  )}
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-bold text-foreground truncate">
                      {item.student.fullName}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                      {item.relationship}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <GraduationCap className="w-3.5 h-3.5 text-primary" />
                    <span>
                      {item.student.class} • Section {item.student.section}
                    </span>
                  </div>

                  <div className="text-[11px] text-muted-foreground font-mono">
                    Admission No: {item.student.admissionNumber}
                  </div>
                </div>
              </div>

              {/* Detail Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-muted/20 border border-border/80 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Roll Number</span>
                  <span className="font-semibold text-foreground">
                    {item.student.rollNumber || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Gender</span>
                  <span className="font-semibold text-foreground">
                    {item.student.gender || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Date of Birth</span>
                  <span className="font-semibold text-foreground">
                    {formatDate(item.student.dateOfBirth)}
                  </span>
                </div>
              </div>

              {/* Guardian Authorization Flags */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60 text-[11px]">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-medium border ${
                    item.isPrimaryGuardian
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{item.isPrimaryGuardian ? "Primary Guardian" : "Secondary Guardian"}</span>
                </span>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-medium border ${
                    item.isEmergencyContact
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{item.isEmergencyContact ? "Emergency Contact" : "Not Emergency Contact"}</span>
                </span>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-medium border ${
                    item.canPickup
                      ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  <span>{item.canPickup ? "Pickup Authorized" : "No Pickup Access"}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
