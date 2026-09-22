"use client";

import React, { useState } from "react";
import {
  User,
  Building2,
  Lock,
  ShieldCheck,
  Save,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useUser } from "@/context/UserContext";

export default function AdminProfilePage() {
  const { user } = useUser();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSubmittingPass, setIsSubmittingPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (newPassword !== confirmPassword) {
      setPassError("New password and confirm password do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setPassError("New password must be at least 8 characters long.");
      return;
    }

    setIsSubmittingPass(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to change password");
      }

      setPassSuccess("Password updated successfully! Please keep your new credentials secure.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPassError(err instanceof Error ? err.message : "Error updating password");
    } finally {
      setIsSubmittingPass(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-1.5">
          <User className="w-3.5 h-3.5" />
          <span>Personal Account</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Administrator Profile & Security
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          View your administrative account credentials and manage security authentication.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border space-y-6 shadow-sm">
        <div className="flex items-center gap-4 border-b border-border pb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-extrabold text-2xl shadow-sm">
            {user?.name?.[0]?.toUpperCase() || "A"}
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground">{user?.name || "School Administrator"}</h2>
            <p className="text-xs text-muted-foreground font-mono">{user?.email}</p>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider font-mono">
              Role: ADMIN (School Administrator)
            </span>
          </div>
        </div>

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-surface-2 border border-border space-y-1">
            <span className="text-muted-foreground block text-[11px]">Assigned Role:</span>
            <span className="font-semibold text-foreground">School Administrator (ADMIN)</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-2 border border-border space-y-1">
            <span className="text-muted-foreground block text-[11px]">Primary Email:</span>
            <span className="font-mono text-foreground font-semibold">{user?.email}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-2 border border-border space-y-1">
            <span className="text-muted-foreground block text-[11px]">User ID (Internal):</span>
            <span className="font-mono text-foreground text-[11px]">{user?.id || "N/A"}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-2 border border-border space-y-1">
            <span className="text-muted-foreground block text-[11px]">Account Status:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Active & Verified</span>
            </span>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border space-y-5 shadow-sm">
        <div className="flex items-center gap-2 text-foreground font-bold text-sm border-b border-border pb-3">
          <Lock className="w-4 h-4 text-primary" />
          <span>Security & Password Management</span>
        </div>

        {passSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{passSuccess}</span>
          </div>
        )}

        {passError && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{passError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md text-xs">
          <div className="space-y-1.5">
            <label className="font-medium text-foreground">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-foreground">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <p className="text-[10px] text-muted-foreground">
              Must be at least 8 characters with letters, numbers, and symbols.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-foreground">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmittingPass}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Save className={`w-4 h-4 ${isSubmittingPass ? "animate-spin" : ""}`} />
            <span>{isSubmittingPass ? "Updating Password..." : "Update Password"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
