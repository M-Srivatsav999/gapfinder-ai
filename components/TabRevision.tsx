"use client";

import React from "react";
import { 
  CalendarClock, 
  Clock, 
  Check, 
  AlertTriangle,
  Sparkles,
  BookOpen,
  TrendingUp,
  ArrowRight
} from "lucide-react";
import { RevisionScheduleItem, MaterialScope } from "@/lib/revision-formula";
import { getMasteryBadgeClass, formatPercent } from "@/lib/bayesian";

interface TabRevisionProps {
  schedule: RevisionScheduleItem[];
  metrics: {
    totalStudyHours: string;
    criticalGapsCount: number;
    masteredCount: number;
    totalItems: number;
  };
  currentScope: MaterialScope;
  onToggleStatus: (topicId: string, currentStatus: string) => void;
  onStartQuiz: (topicId: string) => void;
}

export const TabRevision: React.FC<TabRevisionProps> = ({
  schedule,
  metrics,
  currentScope,
  onToggleStatus,
  onStartQuiz,
}) => {
  const isBaselineSequence = schedule.every((s) => s.isBaselinePlan);

  return (
    <div className="space-y-6">
      {/* Dynamic Header Banner: Baseline vs Calibrated Plan */}
      <div className="rounded-2xl border border-indigo-500/30 bg-slate-900/90 p-5 shadow-glow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5 mb-1">
            <CalendarClock className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">
              {isBaselineSequence
                ? "STEP 1: Baseline Reading & Study Plan"
                : "STEP 4: Real-Time Dynamic Revision Schedule"}
            </h2>
            <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300 font-medium border border-indigo-500/30">
              {isBaselineSequence ? "Curriculum Order" : "Bayesian Calibrated"}
            </span>
          </div>
          <p className="text-xs text-slate-300">
            {isBaselineSequence ? (
              <span>
                Initial baseline reading sequence grouped by document section length. Complete diagnostic quizzes to trigger real-time mathematical prioritization.
              </span>
            ) : (
              <span>
                Strict mathematical ranking:{" "}
                <code className="text-indigo-300 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-indigo-500/30">
                  Priority = (1 - Mastery) × Exam Weight × Prereq Boost
                </code>
                . Weak topics elevated to the top!
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center space-x-4 bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800 text-xs flex-shrink-0">
          <div>
            <span className="text-slate-500 block text-[10px]">Estimated Duration</span>
            <strong className="text-white text-base">{metrics.totalStudyHours}h</strong>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <span className="text-slate-500 block text-[10px]">Critical Gaps</span>
            <strong className="text-rose-400 text-base">{metrics.criticalGapsCount}</strong>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <span className="text-slate-500 block text-[10px]">Mastered</span>
            <strong className="text-emerald-400 text-base">{metrics.masteredCount}</strong>
          </div>
        </div>
      </div>

      {/* Revision Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider">
              <th className="p-4 w-12 text-center">Order</th>
              <th className="p-4">Study Module</th>
              <th className="p-4">Diagnostic Status</th>
              <th className="p-4 hidden md:table-cell font-mono text-indigo-300">
                Formula Factors (Gap × Wt × Prereq)
              </th>
              <th className="p-4">Est. Time</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans text-slate-300">
            {schedule.map((item) => {
              const isUnassessed = item.category === "unassessed";
              const badgeClass = item.isUncovered
                ? "bg-slate-700/50 text-slate-300 border border-slate-600/40"
                : getMasteryBadgeClass(item.category);

              const isMastered = item.status === "mastered" || item.mastery > 0.75;
              const isInProgress = item.status === "in_progress";

              return (
                <tr
                  key={item.topicId}
                  className={`hover:bg-slate-850/50 transition ${
                    item.isUncovered
                      ? "bg-amber-500/[0.03]"
                      : item.category === "weak"
                      ? "bg-rose-500/[0.04]"
                      : ""
                  }`}
                >
                  {/* Rank */}
                  <td className="p-4 text-center font-bold text-indigo-400 font-mono">
                    #{item.rank}
                  </td>

                  {/* Topic & Unit */}
                  <td className="p-4">
                    <div className="font-bold text-slate-100 text-sm flex items-center gap-2">
                      <span>{item.topicName}</span>
                      {item.category === "weak" && (
                        <span className="rounded bg-rose-500/20 px-1.5 py-0.2 text-[9px] font-bold text-rose-300 border border-rose-500/40">
                          PRIORITY GAP
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span>{item.unitName}</span>
                      {item.isUncovered && (
                        <span className="text-rose-400 font-semibold flex items-center gap-0.5">
                          · <AlertTriangle className="h-3 w-3 inline" /> Missing in Notes
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Mastery Pill */}
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full font-semibold uppercase text-[10px] ${badgeClass}`}>
                      {isUnassessed ? "Unassessed" : `${formatPercent(item.mastery)} · ${item.category}`}
                    </span>
                  </td>

                  {/* Formula Breakdown */}
                  <td className="p-4 hidden md:table-cell font-mono text-slate-400 text-[11px]">
                    {isUnassessed ? (
                      <span className="text-slate-500">Baseline (0.50 × {item.examWeight.toFixed(1)} × 1.0x)</span>
                    ) : (
                      <>
                        <span className="text-slate-300">{item.gapDeficit.toFixed(2)}</span>
                        <span className="text-slate-600"> × </span>
                        <span className="text-amber-300">{item.examWeight.toFixed(2)}</span>
                        <span className="text-slate-600"> × </span>
                        <span className="text-indigo-300">{item.prerequisiteBoost.toFixed(2)}x</span>
                        <span className="text-slate-600"> = </span>
                        <strong className="text-indigo-400 font-bold">{item.priorityScore.toFixed(3)}</strong>
                      </>
                    )}
                  </td>

                  {/* Duration */}
                  <td className="p-4">
                    <div className="flex items-center space-x-1 text-slate-300">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      <span>{item.recommendedMinutes} min</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => {
                        const nextStatus = isMastered ? "todo" : isInProgress ? "mastered" : "in_progress";
                        onToggleStatus(item.topicId, nextStatus);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-md border font-medium transition ${
                        isMastered
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : isInProgress
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                      }`}
                    >
                      {isMastered ? "Mastered" : isInProgress ? "In Progress" : "Mark Done"}
                    </button>

                    <button
                      onClick={() => onStartQuiz(item.topicId)}
                      className="bg-indigo-600 text-white px-2.5 py-1 rounded-md font-semibold hover:bg-indigo-500 shadow-glow text-xs"
                    >
                      Quiz
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
