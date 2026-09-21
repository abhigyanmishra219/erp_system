"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  User as UserIcon,
  Lock,
  ArrowRight,
  Sparkles,
  Building2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useUser } from "@/context/UserContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useUser();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!identifier.trim() || !password) {
      setErrorMsg("Please enter both ID/Email and Password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid ID/Email or Password");
      }

      // Save user to UserContext
      login(data.user, data.token);
      setIsSuccess(true);

      // Redirect after brief visual feedback
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to log in";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100 p-4 sm:p-6 lg:p-8 selection:bg-indigo-500 selection:text-white overflow-hidden">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md z-10">
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
              Welcome Back
            </h1>
          </div>
          <p className="text-sm text-zinc-400">
            Sign in to access your ERP portal and workspace
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/60 relative">
          {isSuccess ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10 animate-bounce">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-white">Login Successful!</h2>
              <p className="text-xs text-zinc-400">
                Redirecting you to your ERP dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* Error Alert */}
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Field 1: ID / Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="identifier"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-300"
                >
                  ID or Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    id="identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your ID or email"
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all duration-200"
                  />
                </div>
              </div>

              {/* Field 2: Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold uppercase tracking-wider text-zinc-300"
                  >
                    Password
                  </label>
                  <a
                    href="#"
                    className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline"
                  >
                    Forgot password?
                  </a>
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
                    placeholder="Enter your password"
                    required
                    className="w-full pl-10 pr-11 py-2.5 text-sm rounded-xl bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all duration-200"
                  />
                  {/* Eye Icon Visibility Toggle */}
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
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label
                  htmlFor="rememberMe"
                  className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none"
                >
                  <input
                    id="rememberMe"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-indigo-500/30 focus:ring-offset-zinc-900 cursor-pointer accent-indigo-500"
                  />
                  <span>Remember my session</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !identifier.trim() || !password}
                className={`w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-lg transition-all duration-200 cursor-pointer ${
                  identifier.trim() && password && !isSubmitting
                    ? "bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-indigo-500/25 active:scale-[0.99]"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50"
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer Navigation */}
          <div className="mt-6 pt-6 border-t border-zinc-800 text-center text-xs text-zinc-400">
            Don&apos;t have an account yet?{" "}
            <Link
              href="/create-account"
              className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline inline-flex items-center gap-1"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
