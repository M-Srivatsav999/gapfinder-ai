"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  BrainCircuit, 
  Sparkles, 
  ShieldCheck, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Cpu,
  Layers,
  Scale
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isJudgeLoading, setIsJudgeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1-Click Judge Demo Login
  const handleJudgeDemoLogin = async () => {
    setIsJudgeLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/judge-login", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(data.error || "Failed to log in as Judge Demo");
      }
    } catch (err: any) {
      setError(err.message || "Network error during demo login");
    } finally {
      setIsJudgeLoading(false);
    }
  };

  // Standard Login / Register
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const endpoint = activeTab === "login" ? "/api/auth/login" : "/api/auth/register";
    const payload = activeTab === "login" ? { email, password } : { name, email, password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(data.error || "Authentication failed.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row">
      {/* Left Hero Brand Panel (Desktop) */}
      <div className="lg:w-1/2 p-8 lg:p-14 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-850 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/30">
        <div>
          {/* Brand Logo */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-glow">
              <BrainCircuit className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">
                GapFinder <span className="text-indigo-400">AI</span>
              </span>
              <p className="text-[11px] font-mono text-indigo-300">
                Diagnostic Education Engine v1.0
              </p>
            </div>
          </div>

          <div className="space-y-4 max-w-md">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
              Proactive Knowledge Diagnostics Powered by Mathematics.
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Stop guessing exam readiness. GapFinder AI ingests your course materials, identifies syllabus blind spots, models topic mastery via Bayesian Beta-Binomial updating, and deterministically computes your optimal revision schedule.
            </p>
          </div>

          {/* Core Architectural Pillars */}
          <div className="mt-8 space-y-3.5 max-w-md">
            <div className="flex items-start space-x-3 rounded-lg bg-slate-900/60 p-3 border border-slate-800/80">
              <Scale className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <strong className="text-slate-200 block">Code & Math Make Decisions</strong>
                <span className="text-slate-400">The local Ollama LLM only writes text. Zero scoring hallucinations.</span>
              </div>
            </div>

            <div className="flex items-start space-x-3 rounded-lg bg-slate-900/60 p-3 border border-slate-800/80">
              <ShieldCheck className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <strong className="text-slate-200 block">Deterministic Quote Gate</strong>
                <span className="text-slate-400">Every citation is substring-verified against local document chunks.</span>
              </div>
            </div>

            <div className="flex items-start space-x-3 rounded-lg bg-slate-900/60 p-3 border border-slate-800/80">
              <Cpu className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <strong className="text-slate-200 block">100% Local & Self-Contained</strong>
                <span className="text-slate-400">SQLite + TypeScript hybrid RAG. Zero cloud dashboard setup required.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 text-xs text-slate-500 font-mono flex items-center space-x-3">
          <span>Local SQLite (dev.db)</span>
          <span>·</span>
          <span>Ollama llama3.1:8b</span>
          <span>·</span>
          <span>Strict Grounding</span>
        </div>
      </div>

      {/* Right Authentication Panel */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          {/* JUDGE DEMO PROMINENT BANNER */}
          <div className="rounded-2xl border-2 border-indigo-500/50 bg-gradient-to-br from-indigo-950/60 via-slate-900 to-violet-950/40 p-5 shadow-glow relative overflow-hidden">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-md bg-indigo-500/20 text-indigo-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Evaluator Quick Pass</h3>
                  <p className="text-xs text-indigo-200/80">Skip typing and evaluate instantly</p>
                </div>
              </div>
              <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-500/40">
                1-Click Ready
              </span>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Pre-loaded with <strong>CS301 Distributed Systems</strong>, real syllabus citations, pre-calculated Bayesian priors, and deliberate uncovered gaps.
            </p>

            <button
              onClick={handleJudgeDemoLogin}
              disabled={isJudgeLoading}
              className="w-full flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg hover:from-indigo-500 hover:to-violet-500 transition duration-150 border border-indigo-400/40 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              <span>{isJudgeLoading ? "Logging in as Judge..." : "🚀 1-Click Judge Demo Login"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center text-xs text-slate-500 uppercase tracking-wider">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <span className="relative bg-slate-950 px-3">or continue with credentials</span>
          </div>

          {/* Auth Card Container */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl backdrop-blur-sm">
            {/* Tab Switcher */}
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-950 p-1 border border-slate-800 mb-5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("login");
                  setError(null);
                }}
                className={`rounded-md py-1.5 text-xs font-semibold transition ${
                  activeTab === "login"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("register");
                  setError(null);
                }}
                className={`rounded-md py-1.5 text-xs font-semibold transition ${
                  activeTab === "register"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Register
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-4 rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {activeTab === "register" && (
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ada Lovelace"
                      className="w-full rounded-lg bg-slate-950 pl-9 pr-3 py-2 text-slate-100 border border-slate-800 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-slate-300 font-medium block mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="w-full rounded-lg bg-slate-950 pl-9 pr-3 py-2 text-slate-100 border border-slate-800 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg bg-slate-950 pl-9 pr-3 py-2 text-slate-100 border border-slate-800 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                {activeTab === "login" && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    Pre-seeded demo password: <code className="text-indigo-300">demo1234</code>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 flex items-center justify-center space-x-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-glow hover:bg-indigo-500 disabled:opacity-40 transition"
              >
                <span>{isLoading ? "Processing..." : activeTab === "login" ? "Sign In" : "Create Account"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
