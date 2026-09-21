"use client";

import React, { useState, useMemo } from "react";
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  KeyRound,
} from "lucide-react";
import { useUser } from "@/context/UserContext";

export default function MandatoryPasswordChangeModal() {
  const { user, setUser, refreshUser } = useUser();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [touched, setTouched] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Password criteria
  const passwordCriteria = useMemo(() => {
    return {
      hasMinLength: newPassword.length >= 8,
      hasUpper: /[A-Z]/.test(newPassword),
      hasLower: /[a-z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      hasSpecial: /[^A-Za-z0-9]/.test(newPassword),
    };
  }, [newPassword]);

  // Password strength calculation
  const passwordScore = useMemo(() => {
    let score = 0;
    if (passwordCriteria.hasMinLength) score++;
    if (passwordCriteria.hasUpper) score++;
    if (passwordCriteria.hasLower) score++;
    if (passwordCriteria.hasNumber) score++;
    if (passwordCriteria.hasSpecial) score++;
    return score;
  }, [passwordCriteria]);

  const strengthLabel = useMemo(() => {
    if (!newPassword)
      return { text: "Empty", color: "bg-surface-3", textColor: "text-muted-foreground", percent: 0 };
    if (passwordScore <= 2)
      return { text: "Weak", color: "bg-destructive", textColor: "text-destructive", percent: 33 };
    if (passwordScore <= 4)
      return { text: "Medium", color: "bg-amber-500", textColor: "text-amber-500", percent: 66 };
    return { text: "Strong", color: "bg-success", textColor: "text-success", percent: 100 };
  }, [newPassword, passwordScore]);

  // Match validation
  const passwordsMatch = useMemo(() => {
    if (!confirmPassword) return false;
    return newPassword === confirmPassword;
  }, [newPassword, confirmPassword]);

  const isFormValid =
    currentPassword.trim().length > 0 &&
    passwordCriteria.hasMinLength &&
    passwordsMatch &&
    currentPassword !== newPassword;

  // Only render if current user has mustChangePassword === true
  if (!user || !user.mustChangePassword) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setTouched({
      currentPassword: true,
      newPassword: true,
      confirmPassword: true,
    });

    if (!isFormValid) {
      if (currentPassword === newPassword) {
        setErrorMessage("New password must be different from your temporary password.");
      }
      return;
    }

    setIsSubmitting(true);
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
        throw new Error(json.error || json.message || "Failed to change password");
      }

      setIsSuccess(true);

      // Update User state
      if (user) {
        const updated = { ...user, mustChangePassword: false };
        setUser(updated);
        try {
          localStorage.setItem("erp_user_data", JSON.stringify(updated));
        } catch {}
      }

      await refreshUser();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error updating password"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="bg-popover border border-border rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 text-foreground animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto shadow-sm">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Change Your Password
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
            For security, you must change your temporary password before continuing into your administrator dashboard.
          </p>
        </div>

        {isSuccess ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-14 h-14 bg-success/10 border border-success/20 text-success rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              Password Changed Successfully!
            </h3>
            <p className="text-xs text-muted-foreground">
              Your account is now fully active. Initializing your dashboard...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Error Alert */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Field 1: Current Temporary Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="currentPassword"
                className="block text-xs font-semibold uppercase tracking-wider text-foreground"
              >
                Current Temporary Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, currentPassword: true }))
                  }
                  placeholder="Enter temporary password"
                  required
                  className="w-full pl-10 pr-11 py-2.5 text-sm rounded-xl bg-input border border-input-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  aria-label={
                    showCurrentPassword ? "Hide password" : "Show password"
                  }
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Field 2: New Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="newPassword"
                  className="block text-xs font-semibold uppercase tracking-wider text-foreground"
                >
                  New Password
                </label>
                {newPassword && (
                  <span className={`text-xs font-medium ${strengthLabel.textColor}`}>
                    {strengthLabel.text}
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, newPassword: true }))
                  }
                  placeholder="Create a strong new password"
                  required
                  className={`w-full pl-10 pr-11 py-2.5 text-sm rounded-xl bg-input border text-foreground placeholder:text-muted-foreground focus:outline-none transition-all duration-200 ${
                    touched.newPassword && !passwordCriteria.hasMinLength
                      ? "border-destructive focus:ring-2 focus:ring-destructive/20"
                      : "border-input-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={
                    showNewPassword ? "Hide new password" : "Show new password"
                  }
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Password Strength Checklist */}
              {newPassword.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="w-full bg-surface-3 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${strengthLabel.color}`}
                      style={{ width: `${strengthLabel.percent}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground pt-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          passwordCriteria.hasMinLength
                            ? "bg-success"
                            : "bg-surface-3"
                        }`}
                      />
                      <span>8+ characters</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          passwordCriteria.hasNumber
                            ? "bg-success"
                            : "bg-surface-3"
                        }`}
                      />
                      <span>Includes number</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          passwordCriteria.hasUpper && passwordCriteria.hasLower
                            ? "bg-success"
                            : "bg-surface-3"
                        }`}
                      />
                      <span>Upper & lower case</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          passwordCriteria.hasSpecial
                            ? "bg-success"
                            : "bg-surface-3"
                        }`}
                      />
                      <span>Special character</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Field 3: Confirm New Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold uppercase tracking-wider text-foreground"
                >
                  Confirm New Password
                </label>
                {confirmPassword.length > 0 && (
                  <span
                    className={`text-xs font-medium flex items-center gap-1 ${
                      passwordsMatch ? "text-success" : "text-destructive"
                    }`}
                  >
                    {passwordsMatch ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Passwords match</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Passwords do not match</span>
                      </>
                    )}
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, confirmPassword: true }))
                  }
                  placeholder="Repeat your new password"
                  required
                  className={`w-full pl-10 pr-11 py-2.5 text-sm rounded-xl bg-input border text-foreground placeholder:text-muted-foreground focus:outline-none transition-all duration-200 ${
                    touched.confirmPassword &&
                    confirmPassword.length > 0 &&
                    !passwordsMatch
                      ? "border-destructive focus:ring-2 focus:ring-destructive/20"
                      : confirmPassword.length > 0 && passwordsMatch
                      ? "border-success focus:ring-2 focus:ring-success/20"
                      : "border-input-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className={`w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-md transition-all duration-200 cursor-pointer pt-3 ${
                isFormValid && !isSubmitting
                  ? "bg-primary hover:bg-primary-hover text-primary-foreground shadow-primary/25 active:scale-[0.99]"
                  : "bg-surface-3 text-muted-foreground cursor-not-allowed border border-border"
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                  <span>Updating Password...</span>
                </div>
              ) : (
                <span>Change Password & Continue</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
