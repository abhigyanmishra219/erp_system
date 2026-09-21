"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Building2,
  AlertCircle,
  UserCheck,
  ArrowLeft,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import ThemeToggle from "@/components/ThemeToggle";

export default function CreateAccountPage() {
  const { login } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirmPassword: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<import("@/context/UserContext").UserDetails | null>(null);

  // Email format validation
  const isEmailValid = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, [email]);

  // Password criteria
  const passwordCriteria = useMemo(() => {
    return {
      hasMinLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
    };
  }, [password]);

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
    if (!password)
      return { text: "Empty", color: "bg-surface-3", textColor: "text-muted-foreground", percent: 0 };
    if (passwordScore <= 2)
      return { text: "Weak", color: "bg-destructive", textColor: "text-destructive", percent: 33 };
    if (passwordScore <= 4)
      return { text: "Medium", color: "bg-amber-500", textColor: "text-amber-500", percent: 66 };
    return { text: "Strong", color: "bg-success", textColor: "text-success", percent: 100 };
  }, [password, passwordScore]);

  // Passwords match validation
  const passwordsMatch = useMemo(() => {
    if (!confirmPassword) return false;
    return password === confirmPassword;
  }, [password, confirmPassword]);

  const isFormValid =
    isEmailValid &&
    passwordCriteria.hasMinLength &&
    passwordsMatch &&
    agreeTerms;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      email: true,
      password: true,
      confirmPassword: true,
    });
    setApiError(null);

    if (!isFormValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      // Store in UserContext
      login(data.user, data.token);
      setCreatedUser(data.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setApiError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setAgreeTerms(false);
    setTouched({ email: false, password: false, confirmPassword: false });
    setCreatedUser(null);
    setApiError(null);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-background text-foreground p-4 sm:p-6 lg:p-8 selection:bg-primary/30 selection:text-primary overflow-hidden">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Controls Bar */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20 max-w-5xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors bg-surface-2 px-3 py-1.5 rounded-xl border border-border shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Home</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-lg z-10 my-12">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium tracking-wide uppercase mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Enterprise Resource Planning</span>
          </div>

          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
              Create Your Account
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Sign up to get started as a <span className="text-primary font-medium">System Admin</span>
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-2xl relative backdrop-blur-xl">
          {createdUser ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-success/10 border border-success/20 text-success rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Account Created & Logged In!
              </h2>

              <div className="p-4 rounded-xl bg-surface-2 border border-border text-left space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <span className="text-muted-foreground">Assigned Role:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    {createdUser.role}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="text-foreground font-mono">{createdUser.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">User ID:</span>
                  <span className="text-muted-foreground font-mono text-[11px]">{createdUser.id}</span>
                </div>
              </div>

              <p className="text-xs text-success">
                JWT Authentication Token successfully generated & stored in UserContext.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/dashboard"
                  className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-sm font-medium text-primary-foreground transition-all text-center shadow-lg shadow-primary/20"
                >
                  Go to Protected Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-sm font-medium text-foreground transition-all border border-border cursor-pointer"
                >
                  Create Another
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* API Error Alert */}
              {apiError && (
                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{apiError}</span>
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-wider text-foreground"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                    placeholder="admin@company.com"
                    className={`w-full pl-10 pr-10 py-2.5 text-sm rounded-xl bg-input border text-foreground placeholder:text-muted-foreground focus:outline-none transition-all duration-200 ${
                      touched.email && !isEmailValid && email.length > 0
                        ? "border-destructive focus:ring-2 focus:ring-destructive/20"
                        : touched.email && isEmailValid
                        ? "border-success focus:ring-2 focus:ring-success/20"
                        : "border-input-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                    }`}
                  />
                  {touched.email && email.length > 0 && (
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      {isEmailValid ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                  )}
                </div>
                {touched.email && !isEmailValid && (
                  <p className="text-xs text-destructive">
                    Please enter a valid email address.
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold uppercase tracking-wider text-foreground"
                  >
                    Password
                  </label>
                  {password && (
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
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() =>
                      setTouched((prev) => ({ ...prev, password: true }))
                    }
                    placeholder="Create a strong password"
                    className={`w-full pl-10 pr-11 py-2.5 text-sm rounded-xl bg-input border text-foreground placeholder:text-muted-foreground focus:outline-none transition-all duration-200 ${
                      touched.password && !passwordCriteria.hasMinLength
                        ? "border-destructive focus:ring-2 focus:ring-destructive/20"
                        : touched.password && passwordCriteria.hasMinLength
                        ? "border-input-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                        : "border-input-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors focus:outline-none cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Password Strength Bar */}
                {password.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="w-full bg-surface-3 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${strengthLabel.color}`}
                        style={{ width: `${strengthLabel.percent}%` }}
                      />
                    </div>
                    {/* Helper checks */}
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

              {/* Confirm Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="confirmPassword"
                    className="block text-xs font-semibold uppercase tracking-wider text-foreground"
                  >
                    Confirm Password
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
                    placeholder="Repeat your password"
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
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors focus:outline-none cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {touched.confirmPassword &&
                  confirmPassword.length > 0 &&
                  !passwordsMatch && (
                    <p className="text-xs text-destructive">
                      The passwords you entered do not match.
                    </p>
                  )}
              </div>

              {/* Terms and Conditions Checkbox */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  id="terms"
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-input-border bg-input text-primary focus:ring-primary/30 cursor-pointer accent-primary"
                />
                <label
                  htmlFor="terms"
                  className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none"
                >
                  I agree to the{" "}
                  <a
                    href="#"
                    className="text-primary hover:underline"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="#"
                    className="text-primary hover:underline"
                  >
                    Privacy Policy
                  </a>
                  .
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className={`w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-md transition-all duration-200 cursor-pointer ${
                  isFormValid && !isSubmitting
                    ? "bg-primary hover:bg-primary-hover text-primary-foreground shadow-primary/25 active:scale-[0.99]"
                    : "bg-surface-3 text-muted-foreground cursor-not-allowed border border-border"
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                    <span>Creating System Admin Account...</span>
                  </div>
                ) : (
                  <>
                    <span>Create System Admin Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer Link */}
          <div className="mt-6 pt-6 border-t border-border text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
