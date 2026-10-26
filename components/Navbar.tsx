"use client";

import React from "react";
import { 
  BrainCircuit, 
  LayoutDashboard, 
  HelpCircle, 
  CalendarClock, 
  MessageSquareQuote, 
  Cpu, 
  Upload, 
  LogOut,
  RefreshCw,
  User,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { MaterialScope } from "@/lib/revision-formula";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  ollamaStatus: {
    online: boolean;
    model: string;
    endpoint: string;
    latencyMs?: number;
    usingFallback: boolean;
  } | null;
  currentUser: {
    name: string;
    email: string;
    role: string;
  } | null;
  currentScope: MaterialScope;
  onLogout: () => void;
  onOpenUpload: () => void;
  onRefreshOllama: () => void;
  isCheckingOllama: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  ollamaStatus,
  currentUser,
  currentScope,
  onLogout,
  onOpenUpload,
  onRefreshOllama,
  isCheckingOllama,
}) => {
  const tabs = [
    { id: "dashboard", label: "Gap Dashboard", icon: LayoutDashboard },
    { id: "quiz", label: "Diagnostic Quiz", icon: HelpCircle },
    { id: "revision", label: "Revision Schedule", icon: CalendarClock },
    { id: "assistant", label: "Explain Assistant", icon: MessageSquareQuote },
    { id: "architecture", label: "Tech Architecture", icon: Cpu },
  ];

  const scopeLabels: Record<MaterialScope, { label: string; badgeClass: string }> = {
    notes_only: { label: "Notes Only", badgeClass: "bg-slate-800 text-slate-300" },
    notes_syllabus: { label: "Notes + Syllabus", badgeClass: "bg-amber-500/20 text-amber-300 border border-amber-500/30" },
    full: { label: "Full Mode (Exam Calibrated)", badgeClass: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" },
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-850 bg-slate-950/95 backdrop-blur-md">
      {/* Top Header Bar */}
      <div className="mx-auto max-w-7xl px-4 py-2.5">
        <div className="flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-glow">
              <BrainCircuit className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold tracking-tight text-white">
                  GapFinder <span className="text-indigo-400">AI</span>
                </span>
                <span className="hidden sm:inline-block rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-400 border border-indigo-500/20">
                  Bayesian Core
                </span>
              </div>
            </div>
          </div>

          {/* Right Controls: Scope Pill, Ollama Status, User, Logout */}
          <div className="flex items-center space-x-2.5 text-xs">
            {/* Active Scope Pill */}
            <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-500 text-[11px]">Scope:</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${scopeLabels[currentScope].badgeClass}`}>
                {scopeLabels[currentScope].label}
              </span>
            </div>

            {/* Ollama Connection Indicator */}
            <button
              onClick={onRefreshOllama}
              title="Click to re-probe local Ollama"
              className="flex items-center space-x-1.5 rounded-lg bg-slate-900 px-2.5 py-1 border border-slate-800 hover:border-slate-700 transition"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  ollamaStatus?.online
                    ? "bg-emerald-400 shadow-glow-emerald"
                    : "bg-amber-400"
                }`}
              />
              <span className="font-mono text-[11px] text-slate-300 hidden sm:inline">
                {ollamaStatus?.online ? `Ollama (${ollamaStatus.model})` : "Local Engine (Ollama Offline)"}
              </span>
              <RefreshCw
                className={`h-2.5 w-2.5 text-slate-500 ${
                  isCheckingOllama ? "animate-spin text-indigo-400" : ""
                }`}
              />
            </button>

            {/* Upload Materials Trigger */}
            <button
              onClick={onOpenUpload}
              className="flex items-center space-x-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-slate-200 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 transition"
            >
              <Upload className="h-3.5 w-3.5 text-indigo-400" />
              <span className="font-medium hidden sm:inline">Upload Materials</span>
            </button>

            {/* User Session Pill */}
            {currentUser && (
              <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                <User className="h-3 w-3 text-slate-400" />
                <span className="max-w-[120px] truncate font-medium">{currentUser.email}</span>
                {currentUser.role === "evaluator" && (
                  <span className="rounded bg-indigo-500/20 px-1 py-0.2 text-[9px] text-indigo-300 font-mono">
                    Judge
                  </span>
                )}
              </div>
            )}

            {/* Logout Button */}
            <button
              onClick={onLogout}
              title="Sign Out"
              className="flex items-center space-x-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-slate-400 border border-slate-800 hover:text-rose-300 hover:border-rose-500/40 hover:bg-rose-500/10 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Clean Tab Navigation Bar */}
      <div className="border-t border-slate-850/80 bg-slate-950/70">
        <div className="mx-auto max-w-7xl px-4">
          <nav className="flex space-x-1 overflow-x-auto py-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 rounded-lg px-3.5 py-2 text-xs md:text-sm font-medium transition whitespace-nowrap ${
                    isActive
                      ? "bg-slate-900 text-indigo-400 border border-indigo-500/40 shadow-glow"
                      : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
