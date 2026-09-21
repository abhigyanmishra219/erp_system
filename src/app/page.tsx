import Link from "next/link";
import { Building2, ArrowRight, ShieldCheck, Database, Layers } from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-zinc-950 text-zinc-100 selection:bg-indigo-500 selection:text-white">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Navigation */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
            <Building2 className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">ERP Nexus</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/create-account"
            className="px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all duration-150 shadow-md shadow-indigo-600/20"
          >
            Create Account
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="w-full max-w-4xl mx-auto px-6 py-16 flex flex-col items-center text-center z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 mb-6 shadow-sm">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>Connected to MongoDB Atlas</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent max-w-2xl leading-tight">
          Modern Enterprise Resource Planning
        </h1>

        <p className="mt-6 text-base sm:text-lg text-zinc-400 max-w-xl leading-relaxed">
          Manage your operations, inventory, customers, and workforce all in one high-performance platform.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center">
          <Link
            href="/create-account"
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-medium text-sm shadow-xl shadow-indigo-500/20 flex items-center gap-2 transition-all duration-150 group"
          >
            <span>Get Started & Create Account</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <a
            href="/api/health/db"
            target="_blank"
            className="px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-medium text-sm transition-all duration-150 flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Check DB Health</span>
          </a>
        </div>

        {/* Feature badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 w-full max-w-3xl text-left">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-zinc-200">Modular Architecture</h3>
            <p className="text-xs text-zinc-400 mt-1">Scale effortlessly with independent ERP modules.</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <Database className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-zinc-200">MongoDB & Mongoose</h3>
            <p className="text-xs text-zinc-400 mt-1">Robust document database for dynamic business objects.</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center mb-3">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-zinc-200">Enterprise Security</h3>
            <p className="text-xs text-zinc-400 mt-1">Secure credentials, validations, and role-based access.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-900 py-6 text-center text-xs text-zinc-500">
        ERP System Workspace • Next.js & Mongoose
      </footer>
    </div>
  );
}
