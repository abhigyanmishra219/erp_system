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
} from "lucide-react";

export default function CreateAccountPage() {
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
  const [formSubmitted, setFormSubmitted] = useState(false);

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
    if (!password) return { text: "Empty", color: "bg-zinc-700", textColor: "text-zinc-500", percent: 0 };
    if (passwordScore <= 2) return { text: "Weak", color: "bg-rose-500", textColor: "text-rose-400", percent: 33 };
    if (passwordScore <= 4) return { text: "Medium", color: "bg-amber-500", textColor: "text-amber-400", percent: 66 };
    return { text: "Strong", color: "bg-emerald-500", textColor: "text-emerald-400", percent: 100 };
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (!isFormValid) {
      return;
    }

    setIsSubmitting(true);
    // Frontend only simulation
    setTimeout(() => {
      setIsSubmitting(false);
      setFormSubmitted(true);
    }, 1000);
  };

  const handleReset = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setAgreeTerms(false);
    setTouched({ email: false, password: false, confirmPassword: false });
    setFormSubmitted(false);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100 p-4 sm:p-6 lg:p-8 selection:bg-indigo-500 selection:text-white overflow-hidden">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-lg z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium tracking-wide uppercase mb-4 shadow-inner">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Enterprise Resource Planning</span>
          </div>

          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-lg shadow-indigo-500/25">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              Create Your Account
            </h1>
          </div>
          <p className="text-sm text-zinc-400">
            Sign up to get started with your ERP system workspace
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/60 relative">
          {formSubmitted ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10 animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white">
                Account Validation Successful!
              </h2>
              <p className="text-sm text-zinc-400 max-w-sm mx-auto">
                Your frontend form validated correctly. Email:{" "}
                <span className="text-indigo-400 font-medium">{email}</span>.
                Passwords matched seamlessly!
              </p>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-white transition-all duration-150 border border-zinc-700 cursor-pointer"
                >
                  Create Another Account
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* Email Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-300"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                    placeholder="name@company.com"
                    className={`w-full pl-10 pr-10 py-2.5 text-sm rounded-xl bg-zinc-950/60 border text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all duration-200 ${
                      touched.email && !isEmailValid && email.length > 0
                        ? "border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                        : touched.email && isEmailValid
                        ? "border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
                        : "border-zinc-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    }`}
                  />
                  {touched.email && email.length > 0 && (
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      {isEmailValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      )}
                    </div>
                  )}
                </div>
                {touched.email && !isEmailValid && (
                  <p className="text-xs text-rose-400">
                    Please enter a valid email address.
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold uppercase tracking-wider text-zinc-300"
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
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
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
                    className={`w-full pl-10 pr-11 py-2.5 text-sm rounded-xl bg-zinc-950/60 border text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all duration-200 ${
                      touched.password && !passwordCriteria.hasMinLength
                        ? "border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                        : touched.password && passwordCriteria.hasMinLength
                        ? "border-zinc-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        : "border-zinc-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-200 transition-colors focus:outline-none cursor-pointer"
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
                    <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${strengthLabel.color}`}
                        style={{ width: `${strengthLabel.percent}%` }}
                      />
                    </div>
                    {/* Helper checks */}
                    <div className="grid grid-cols-2 gap-1 text-[11px] text-zinc-400 pt-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            passwordCriteria.hasMinLength
                              ? "bg-emerald-400"
                              : "bg-zinc-600"
                          }`}
                        />
                        <span>8+ characters</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            passwordCriteria.hasNumber
                              ? "bg-emerald-400"
                              : "bg-zinc-600"
                          }`}
                        />
                        <span>Includes number</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            passwordCriteria.hasUpper && passwordCriteria.hasLower
                              ? "bg-emerald-400"
                              : "bg-zinc-600"
                          }`}
                        />
                        <span>Upper & lower case</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            passwordCriteria.hasSpecial
                              ? "bg-emerald-400"
                              : "bg-zinc-600"
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
                    className="block text-xs font-semibold uppercase tracking-wider text-zinc-300"
                  >
                    Confirm Password
                  </label>
                  {confirmPassword.length > 0 && (
                    <span
                      className={`text-xs font-medium flex items-center gap-1 ${
                        passwordsMatch ? "text-emerald-400" : "text-rose-400"
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
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
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
                    className={`w-full pl-10 pr-11 py-2.5 text-sm rounded-xl bg-zinc-950/60 border text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all duration-200 ${
                      touched.confirmPassword &&
                      confirmPassword.length > 0 &&
                      !passwordsMatch
                        ? "border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                        : confirmPassword.length > 0 && passwordsMatch
                        ? "border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
                        : "border-zinc-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
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
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-200 transition-colors focus:outline-none cursor-pointer"
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
                    <p className="text-xs text-rose-400">
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
                  className="mt-1 w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-indigo-500/30 focus:ring-offset-zinc-900 cursor-pointer accent-indigo-500"
                />
                <label
                  htmlFor="terms"
                  className="text-xs text-zinc-400 leading-relaxed cursor-pointer select-none"
                >
                  I agree to the{" "}
                  <a
                    href="#"
                    className="text-indigo-400 hover:underline hover:text-indigo-300"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="#"
                    className="text-indigo-400 hover:underline hover:text-indigo-300"
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
                className={`w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-lg transition-all duration-200 cursor-pointer ${
                  isFormValid && !isSubmitting
                    ? "bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-indigo-500/25 active:scale-[0.99]"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50"
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Creating Account...</span>
                  </div>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer Link */}
          <div className="mt-6 pt-6 border-t border-zinc-800 text-center text-xs text-zinc-400">
            Already have an account?{" "}
            <Link
              href="/"
              className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline inline-flex items-center gap-1"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
