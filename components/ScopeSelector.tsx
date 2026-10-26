"use client";

import React from "react";
import { FileText, BookOpen, GraduationCap, ArrowRight, Check } from "lucide-react";
import { MaterialScope } from "@/lib/revision-formula";

interface ScopeSelectorProps {
  currentScope: MaterialScope;
  onSelectScope: (scope: MaterialScope) => void;
  isLoading?: boolean;
}

export const ScopeSelector: React.FC<ScopeSelectorProps> = ({
  currentScope,
  onSelectScope,
  isLoading,
}) => {
  const scopes: {
    id: MaterialScope;
    title: string;
    description: string;
    formulaBehavior: string;
    badge: string;
    icon: any;
  }[] = [
    {
      id: "notes_only",
      title: "Notes Only",
      description: "Auto-extracted self-paced reading sequence based purely on lecture notes.",
      formulaBehavior: "Exam Weight = 1.0 (Uniform). Focus is pure topic comprehension.",
      badge: "Linear Study Plan",
      icon: FileText,
    },
    {
      id: "notes_syllabus",
      title: "Notes + Syllabus",
      description: "Flags missing course gaps and cross-references syllabus modules against notes.",
      formulaBehavior: "Exam Weight = 1.5x for core syllabus modules. Uncovered warnings active.",
      badge: "Gap Detection",
      icon: BookOpen,
    },
    {
      id: "full",
      title: "Notes + Syllabus + Past Papers (Full Mode)",
      description: "Calculates exact high-yield exam return on investment using past papers.",
      formulaBehavior: "Exam Weight = (Frequency × Marks) normalized. Maximum exam ROI.",
      badge: "Exam Precision (Recommended)",
      icon: GraduationCap,
    },
  ];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <span>Material Scope Selector</span>
            <span className="text-xs font-normal text-indigo-400">
              (Changes mathematical weight optimization in real time)
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Select your uploaded document boundary to calibrate the Bayesian gap analysis.
          </p>
        </div>
        <div className="text-xs text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
          Current Engine Mode: <strong className="text-indigo-300 uppercase">{currentScope.replace("_", " + ")}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {scopes.map((s) => {
          const Icon = s.icon;
          const isSelected = currentScope === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelectScope(s.id)}
              disabled={isLoading}
              className={`relative flex flex-col justify-between text-left rounded-lg p-3.5 transition border ${
                isSelected
                  ? "bg-slate-850 border-indigo-500/70 shadow-glow ring-1 ring-indigo-500/40"
                  : "bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850/50"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`p-2 rounded-lg ${
                      isSelected ? "bg-indigo-600/20 text-indigo-400" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      isSelected
                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {s.badge}
                  </span>
                </div>

                <h4 className="text-sm font-medium text-slate-100 flex items-center justify-between">
                  <span>{s.title}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-indigo-400" />}
                </h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{s.description}</p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-400 block">
                  ⚙️ {s.formulaBehavior}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
