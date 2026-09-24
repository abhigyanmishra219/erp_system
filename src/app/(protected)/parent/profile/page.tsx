"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  Building,
  HeartHandshake,
  ShieldCheck,
  RefreshCw,
  Users,
  MapPin,
  Briefcase,
} from "lucide-react";

interface ParentProfileState {
  parent: {
    _id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
    relationship: string;
    occupation?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
    status: string;
  };
  school: {
    name: string;
    logo?: string | null;
  };
  linkedChildren: any[];
}

export default function ParentProfilePage() {
  const [data, setData] = useState<ParentProfileState | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/parent/me");
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Error fetching parent profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-medium">Loading guardian profile...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 rounded-3xl bg-card border border-border text-center space-y-2 max-w-md mx-auto">
        <p className="text-xs text-muted-foreground">Unable to load profile information.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-card via-card to-primary/5 border border-border shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-2xl shadow-md shadow-primary/20 shrink-0">
            {data.parent.firstName[0]}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {data.parent.fullName}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                {data.parent.relationship}
              </span>
              <span className="text-xs text-muted-foreground">• {data.school.name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4" />
            <span>Active Guardian</span>
          </span>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div className="p-6 rounded-3xl bg-card border border-border space-y-4 shadow-xs">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            <span>Contact & Personal Details</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground">Email Address</span>
              <span className="font-semibold text-foreground font-mono">{data.parent.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground">Phone Number</span>
              <span className="font-semibold text-foreground font-mono">{data.parent.phone}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground">Occupation</span>
              <span className="font-semibold text-foreground">{data.parent.occupation || "N/A"}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Relationship</span>
              <span className="font-semibold text-foreground">{data.parent.relationship}</span>
            </div>
          </div>
        </div>

        {/* Institution & Children Summary */}
        <div className="p-6 rounded-3xl bg-card border border-border space-y-4 shadow-xs">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Building className="w-4 h-4 text-primary" />
            <span>School & Guardian Authorization</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground">Enrolled Institution</span>
              <span className="font-semibold text-foreground">{data.school.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground">Total Linked Children</span>
              <span className="font-bold text-primary">{data.linkedChildren.length} Child(ren)</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Portal Status</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Authenticated (Role: PARENT)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
