"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Mail,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  KeyRound,
  Check,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

// Helper to mask email e.g. abhigyan@gmail.com -> a***@gmail.com
function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email;
  const [local, domain] = email.split("@");
  if (local.length <= 1) {
    return `${local}***@${domain}`;
  }
  return `${local[0]}***@${domain}`;
}

type Step = "EMAIL" | "OTP" | "RESET" | "SUCCESS";

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Current Step
  const [step, setStep] = useState<Step>("EMAIL");

  // Step 1: Email Form State
  const [email, setEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Step 2: OTP State
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Step 3: Password Reset State
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Status & Error Messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Cooldown countdown timer for OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (step === "OTP" && resendCooldown > 0) {
      setCanResend(false);
      timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    } else if (step === "OTP" && resendCooldown <= 0) {
      setCanResend(true);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [step, resendCooldown]);

  // Handle Step 1: Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg("Please enter your registered email address.");
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setIsSendingEmail(true);
    try {
      const res = await fetch("/api/auth/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process request. Please try again.");
      }

      // Transition to OTP step
      setStep("OTP");
      setOtpDigits(["", "", "", "", "", ""]);
      setResendCooldown(60);
      setCanResend(false);
      setInfoMsg(
        "A 6-digit verification code has been sent to your registered email address."
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send code";
      setErrorMsg(msg);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (!canResend || isSendingEmail) return;

    setErrorMsg(null);
    setInfoMsg(null);
    setIsSendingEmail(true);

    try {
      const res = await fetch("/api/auth/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to resend verification code.");
      }

      setResendCooldown(60);
      setCanResend(false);
      setOtpDigits(["", "", "", "", "", ""]);
      setInfoMsg("A new verification code has been sent to your email.");
      otpInputsRef.current[0]?.focus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to resend code";
      setErrorMsg(msg);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // OTP Input handlers (auto-advance, backspace, paste support)
  const handleOtpDigitChange = (index: number, val: string) => {
    // Only accept numbers
    const cleaned = val.replace(/\D/g, "");
    if (!cleaned) {
      const newDigits = [...otpDigits];
      newDigits[index] = "";
      setOtpDigits(newDigits);
      return;
    }

    const newDigits = [...otpDigits];
    // If single digit typed
    newDigits[index] = cleaned[cleaned.length - 1];
    setOtpDigits(newDigits);

    // Auto-focus next input
    if (index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        // Move to previous input and clear it
        const newDigits = [...otpDigits];
        newDigits[index - 1] = "";
        setOtpDigits(newDigits);
        otpInputsRef.current[index - 1]?.focus();
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    // Match up to 6 digits
    const digitsOnly = pastedData.replace(/\D/g, "").slice(0, 6);
    if (!digitsOnly) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = digitsOnly[i] || "";
    }
    setOtpDigits(newDigits);

    // Focus last filled digit or final input
    const nextIndex = Math.min(digitsOnly.length, 5);
    otpInputsRef.current[nextIndex]?.focus();
  };

  // Handle Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const fullOtp = otpDigits.join("");
    if (fullOtp.length !== 6) {
      setErrorMsg("Please enter all 6 digits of the verification code.");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const res = await fetch("/api/auth/forgot-password/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: fullOtp,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to verify code.");
      }

      // Store single-use reset authorization token in state
      setResetToken(data.resetToken);
      setStep("RESET");
      setInfoMsg(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to verify code";
      setErrorMsg(msg);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Password validation checks
  const passwordCriteria = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
  };
  const isPasswordValid = Object.values(passwordCriteria).every(Boolean);

  // Handle Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!resetToken) {
      setErrorMsg("Session has expired. Please restart the password reset process.");
      setStep("EMAIL");
      return;
    }

    if (!isPasswordValid) {
      setErrorMsg("Please meet all password requirements.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("New password and confirm password do not match.");
      return;
    }

    setIsResettingPassword(true);
    try {
      const res = await fetch("/api/auth/forgot-password/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          resetToken,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      // Move to success step & clear sensitive state
      setResetToken(null);
      setNewPassword("");
      setConfirmPassword("");
      setStep("SUCCESS");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reset password";
      setErrorMsg(msg);
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-background text-foreground p-4 sm:p-6 lg:p-8 selection:bg-primary/30 selection:text-primary overflow-hidden">
      {/* Background ambient lighting effects matching Dhurava ERP style */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Controls Bar */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20 max-w-5xl mx-auto">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors bg-surface-2 px-3 py-1.5 rounded-xl border border-border shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-md z-10 my-12">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium tracking-wide uppercase mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dhurava ERP Platform</span>
          </div>

          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
              {step === "SUCCESS"
                ? "Password Reset"
                : step === "RESET"
                ? "Create New Password"
                : step === "OTP"
                ? "Verify Your Email"
                : "Forgot your password?"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {step === "SUCCESS"
              ? "Your password has been successfully updated"
              : step === "RESET"
              ? "Set a new secure password to access your account"
              : step === "OTP"
              ? "Enter the 6-digit verification code sent to your registered email address"
              : "Enter your registered email address and we'll send you a verification code."}
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-2xl relative backdrop-blur-xl">
          {/* Error Alert */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Info Alert */}
          {infoMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* STEP 1: Enter Email */}
          {step === "EMAIL" && (
            <form onSubmit={handleSendOtp} noValidate className="space-y-5">
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
                    placeholder="Enter your registered email"
                    required
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-input border border-input-border focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground focus:outline-none transition-all duration-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSendingEmail || !email.trim()}
                className={`w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-md transition-all duration-200 cursor-pointer ${
                  email.trim() && !isSendingEmail
                    ? "bg-primary hover:bg-primary-hover text-primary-foreground shadow-primary/25 active:scale-[0.99]"
                    : "bg-surface-3 text-muted-foreground cursor-not-allowed border border-border"
                }`}
              >
                {isSendingEmail ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                    <span>Sending verification code...</span>
                  </div>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}

          {/* STEP 2: Verify OTP */}
          {step === "OTP" && (
            <form onSubmit={handleVerifyOtp} noValidate className="space-y-6">
              {/* Masked Email Badge */}
              <div className="text-center p-3 rounded-xl bg-surface-2 border border-border">
                <p className="text-xs text-muted-foreground">Verification code sent to:</p>
                <p className="text-sm font-semibold text-foreground mt-0.5 tracking-wide">
                  {maskEmail(email.trim())}
                </p>
              </div>

              {/* 6-Digit OTP Input */}
              <div className="space-y-2">
                <label className="block text-center text-xs font-semibold uppercase tracking-wider text-foreground">
                  Verification Code
                </label>
                <div
                  className="flex items-center justify-between gap-1.5 sm:gap-2.5"
                  onPaste={handleOtpPaste}
                >
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputsRef.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-11 sm:w-12 h-12 text-center text-lg font-bold rounded-xl bg-input border border-input-border focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground focus:outline-none transition-all duration-150"
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>
              </div>

              {/* Verify OTP Button */}
              <button
                type="submit"
                disabled={isVerifyingOtp || otpDigits.join("").length !== 6}
                className={`w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-md transition-all duration-200 cursor-pointer ${
                  otpDigits.join("").length === 6 && !isVerifyingOtp
                    ? "bg-primary hover:bg-primary-hover text-primary-foreground shadow-primary/25 active:scale-[0.99]"
                    : "bg-surface-3 text-muted-foreground cursor-not-allowed border border-border"
                }`}
              >
                {isVerifyingOtp ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  <>
                    <span>Verify OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Resend & Change Email Navigation */}
              <div className="pt-2 border-t border-border space-y-2 text-center">
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                  <span>Didn&apos;t receive the code?</span>
                  {canResend ? (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isSendingEmail}
                      className="text-primary hover:underline font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Resend OTP</span>
                    </button>
                  ) : (
                    <span className="text-muted-foreground font-medium">
                      Resend OTP ({resendCooldown}s)
                    </span>
                  )}
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("EMAIL");
                      setErrorMsg(null);
                      setInfoMsg(null);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
                  >
                    Change Email
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* STEP 3: Create New Password */}
          {step === "RESET" && (
            <form onSubmit={handleResetPassword} noValidate className="space-y-5">
              {/* New Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="newPassword"
                  className="block text-xs font-semibold uppercase tracking-wider text-foreground"
                >
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                    required
                    autoFocus
                    className="w-full pl-10 pr-11 py-2.5 text-sm rounded-xl bg-input border border-input-border focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground focus:outline-none transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold uppercase tracking-wider text-foreground"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    required
                    className="w-full pl-10 pr-11 py-2.5 text-sm rounded-xl bg-input border border-input-border focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground focus:outline-none transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements List */}
              <div className="p-3.5 rounded-xl bg-surface-2 border border-border space-y-2 text-xs">
                <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
                  Password Requirements:
                </p>
                <div className="grid grid-cols-2 gap-1.5 text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                        passwordCriteria.length
                          ? "bg-success/20 text-success"
                          : "bg-surface-3 text-muted-foreground"
                      }`}
                    >
                      <Check className="w-2.5 h-2.5" />
                    </div>
                    <span>8+ characters</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                        passwordCriteria.uppercase
                          ? "bg-success/20 text-success"
                          : "bg-surface-3 text-muted-foreground"
                      }`}
                    >
                      <Check className="w-2.5 h-2.5" />
                    </div>
                    <span>1 uppercase letter</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                        passwordCriteria.lowercase
                          ? "bg-success/20 text-success"
                          : "bg-surface-3 text-muted-foreground"
                      }`}
                    >
                      <Check className="w-2.5 h-2.5" />
                    </div>
                    <span>1 lowercase letter</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                        passwordCriteria.number
                          ? "bg-success/20 text-success"
                          : "bg-surface-3 text-muted-foreground"
                      }`}
                    >
                      <Check className="w-2.5 h-2.5" />
                    </div>
                    <span>1 number</span>
                  </div>
                </div>
              </div>

              {/* Reset Password Button */}
              <button
                type="submit"
                disabled={
                  isResettingPassword ||
                  !isPasswordValid ||
                  !confirmPassword ||
                  newPassword !== confirmPassword
                }
                className={`w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-md transition-all duration-200 cursor-pointer ${
                  isPasswordValid && confirmPassword && newPassword === confirmPassword && !isResettingPassword
                    ? "bg-primary hover:bg-primary-hover text-primary-foreground shadow-primary/25 active:scale-[0.99]"
                    : "bg-surface-3 text-muted-foreground cursor-not-allowed border border-border"
                }`}
              >
                {isResettingPassword ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                    <span>Updating password...</span>
                  </div>
                ) : (
                  <>
                    <span>Reset Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 4: Success Screen */}
          {step === "SUCCESS" && (
            <div className="text-center py-6 space-y-5">
              <div className="w-16 h-16 bg-success/10 border border-success/20 text-success rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-foreground">
                  Password Reset Successfully
                </h2>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  Your password has been updated. You can now sign in with your new password.
                </p>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground shadow-md shadow-primary/25 transition-all duration-200 cursor-pointer active:scale-[0.99]"
                >
                  <span>Back to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Footer note */}
          <div className="mt-6 pt-6 border-t border-border text-center text-xs text-muted-foreground">
            Enterprise Portal • Need assistance? Contact your institution administrator.
          </div>
        </div>
      </div>
    </div>
  );
}
