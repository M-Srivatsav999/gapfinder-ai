"use client";

import React, { useState } from "react";
import { 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Layers, 
  ArrowUpRight, 
  BookOpen,
  TrendingUp,
  Award,
  Sparkles
} from "lucide-react";
import { getMasteryBadgeClass, getMasteryBorderClass, formatPercent } from "@/lib/bayesian";

interface TopicItem {
  id: string;
  unitName: string;
  topicName: string;
  subtopicName: string;
  isUncovered: boolean;
  syllabusRequired: boolean;
  inNotes: boolean;
  examFrequency: number;
  examMarksAvg: number;
  alpha: number;
  beta: number;
  estimatedMastery: number;
  masteryStats: {
    category: "weak" | "medium" | "strong" | "unassessed";
    expectedMastery: number;
    variance: number;
    confidenceLower: number;
    confidenceUpper: number;
    totalAttempts: number;
  };
}

interface UnitNode {
  unitName: string;
  averageMastery: number;
  uncoveredCount: number;
  weakCount: number;
  topics: TopicItem[];
}

interface TabDashboardProps {
  metrics: {
    overallMastery: number;
    totalTopics: number;
    weakTopicsCount: number;
    mediumTopicsCount: number;
    strongTopicsCount: number;
    uncoveredTopicsCount: number;
    assessedCount: number;
  };
  unitTree: UnitNode[];
  onTakeQuizForTopic: (topicId: string) => void;
  onExplainTopic: (topicName: string) => void;
}

export const TabDashboard: React.FC<TabDashboardProps> = ({
  metrics,
  unitTree,
  onTakeQuizForTopic,
  onExplainTopic,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<"all" | "weak" | "uncovered" | "strong" | "unassessed">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const isInitialBaselineState = metrics.assessedCount === 0;

  // Calculate Exam Readiness Score
  const examReadinessScore = isInitialBaselineState
    ? 50
    : Math.round(metrics.overallMastery * 100 - (metrics.uncoveredTopicsCount * 8));

  return (
    <div className="space-y-6">
      {/* 4-Step Diagnostic Lifecycle Step 1 Notice Banner */}
      {isInitialBaselineState && (
        <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 p-4.5 shadow-glow flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3 text-xs">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex-shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <strong className="text-white text-sm block">STEP 1: Baseline Course Ingestion Active</strong>
              <span className="text-slate-300">
                Course notes, syllabus, and past papers loaded. Topics start unassessed with zero fake scores. Click <strong>"Start Diagnostic Quiz"</strong> on any topic to run Step 2.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3 Clean Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Curriculum Scope */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Curriculum Scope</span>
            <Layers className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">{metrics.totalTopics}</span>
            <span className="text-xs text-slate-400">Total Topics Ingested</span>
          </div>
          <div className="mt-3 flex items-center space-x-2 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            <span>{metrics.assessedCount} of {metrics.totalTopics} Diagnosed via Quiz</span>
          </div>
        </div>

        {/* Card 2: Bayesian Mastery Average */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Bayesian Mastery State</span>
            <TrendingUp className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">
              {isInitialBaselineState ? "Pending" : formatPercent(metrics.overallMastery)}
            </span>
            <span className="text-xs text-slate-400">
              {isInitialBaselineState ? "Uniform Prior (α=1, β=1)" : "Beta-Binomial Mean"}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-500 shadow-glow"
              style={{ width: `${isInitialBaselineState ? 50 : Math.round(metrics.overallMastery * 100)}%` }}
            />
          </div>
        </div>

        {/* Card 3: Exam Readiness Score */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Exam Readiness</span>
            <Award className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-amber-300">
              {examReadinessScore}
              <span className="text-base text-slate-500 font-normal"> / 100</span>
            </span>
            <span className="text-xs text-slate-400">Calibrated ROI</span>
          </div>
          <div className="mt-3 text-xs text-slate-400 flex items-center space-x-2">
            {metrics.uncoveredTopicsCount > 0 ? (
              <span className="text-amber-400 font-medium flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{metrics.uncoveredTopicsCount} uncovered syllabus gaps detected</span>
              </span>
            ) : (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>All syllabus topics covered in notes</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Control & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/70 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-2 text-xs overflow-x-auto pb-1 sm:pb-0">
          <span className="text-slate-400 font-medium hidden sm:inline">Filter:</span>
          <button
            onClick={() => setSelectedFilter("all")}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              selectedFilter === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All Topics ({metrics.totalTopics})
          </button>
          <button
            onClick={() => setSelectedFilter("unassessed")}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              selectedFilter === "unassessed" ? "bg-slate-800 text-slate-300 border border-slate-700" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Pending Diagnostic ({metrics.totalTopics - metrics.assessedCount})
          </button>
          <button
            onClick={() => setSelectedFilter("weak")}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              selectedFilter === "weak"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Weak Gaps ({metrics.weakTopicsCount})
          </button>
          <button
            onClick={() => setSelectedFilter("uncovered")}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              selectedFilter === "uncovered"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Uncovered Gaps ({metrics.uncoveredTopicsCount})
          </button>
        </div>

        {/* View Toggle */}
        <div className="flex rounded-lg bg-slate-950 p-0.5 border border-slate-800 self-end sm:self-auto">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-2.5 py-1 rounded text-xs transition ${
              viewMode === "grid" ? "bg-slate-800 text-white font-medium" : "text-slate-400"
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`px-2.5 py-1 rounded text-xs transition ${
              viewMode === "table" ? "bg-slate-800 text-white font-medium" : "text-slate-400"
            }`}
          >
            Table
          </button>
        </div>
      </div>

      {/* Topics Display */}
      {viewMode === "grid" ? (
        <div className="space-y-6">
          {unitTree.map((unit) => {
            const filteredTopics = unit.topics.filter((t) => {
              if (selectedFilter === "weak") return t.masteryStats.category === "weak";
              if (selectedFilter === "uncovered") return t.isUncovered;
              if (selectedFilter === "strong") return t.masteryStats.category === "strong";
              if (selectedFilter === "unassessed") return t.masteryStats.category === "unassessed";
              return true;
            });

            if (filteredTopics.length === 0) return null;

            return (
              <div key={unit.unitName} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center space-x-2">
                    <Layers className="h-4 w-4 text-indigo-400" />
                    <h3 className="font-bold text-slate-200 text-sm">{unit.unitName}</h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {unit.topics.filter((t) => t.masteryStats.category !== "unassessed").length} / {unit.topics.length} Diagnosed
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredTopics.map((topic) => {
                    const isUnassessed = topic.masteryStats.category === "unassessed";
                    const badgeClass = topic.isUncovered
                      ? "bg-slate-700/50 text-slate-300 border border-slate-600/40"
                      : getMasteryBadgeClass(topic.masteryStats.category);
                    const borderClass = topic.isUncovered
                      ? "border-amber-500/50 bg-amber-500/[0.02]"
                      : getMasteryBorderClass(topic.masteryStats.category);

                    return (
                      <div
                        key={topic.id}
                        className={`rounded-2xl border p-4 transition-all duration-150 flex flex-col justify-between ${borderClass} bg-slate-900/90 hover:bg-slate-850/80 shadow-sm`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-2">
                            {/* Mastery Pill */}
                            <span
                              className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wide ${badgeClass}`}
                            >
                              {isUnassessed
                                ? "Unassessed / Pending"
                                : `${formatPercent(topic.estimatedMastery)} · ${topic.masteryStats.category}`}
                            </span>

                            {topic.isUncovered && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-medium">
                                Missing in Notes!
                              </span>
                            )}
                          </div>

                          <h4 className="font-bold text-slate-100 text-sm mt-1">{topic.topicName}</h4>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {topic.subtopicName}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <button
                            onClick={() => onExplainTopic(topic.topicName)}
                            className="text-xs text-slate-400 hover:text-indigo-300 flex items-center gap-1 transition font-medium"
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            <span>Explain</span>
                          </button>

                          <button
                            onClick={() => onTakeQuizForTopic(topic.id)}
                            className="text-xs bg-indigo-600 px-3 py-1.5 rounded-xl text-white font-semibold shadow-glow hover:bg-indigo-500 transition flex items-center gap-1.5"
                          >
                            <span>Start Diagnostic Quiz</span>
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-lg">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="p-3.5">Topic</th>
                <th className="p-3.5">Unit</th>
                <th className="p-3.5">Diagnostic State</th>
                <th className="p-3.5">Coverage</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans text-slate-300">
              {unitTree.flatMap((u) => u.topics).map((topic) => {
                const isUnassessed = topic.masteryStats.category === "unassessed";
                const badgeClass = topic.isUncovered
                  ? "bg-slate-700/50 text-slate-300 border border-slate-600/40"
                  : getMasteryBadgeClass(topic.masteryStats.category);

                return (
                  <tr key={topic.id} className="hover:bg-slate-850/50 transition">
                    <td className="p-3.5 font-semibold text-slate-100">{topic.topicName}</td>
                    <td className="p-3.5 text-slate-400">{topic.unitName}</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full font-semibold uppercase text-[10px] ${badgeClass}`}>
                        {isUnassessed ? "Unassessed" : `${formatPercent(topic.estimatedMastery)} · ${topic.masteryStats.category}`}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {topic.isUncovered ? (
                        <span className="text-amber-400 font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Missing in Notes</span>
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Notes Verified</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => onExplainTopic(topic.topicName)}
                        className="text-slate-400 hover:text-indigo-300 font-medium"
                      >
                        Explain
                      </button>
                      <button
                        onClick={() => onTakeQuizForTopic(topic.id)}
                        className="bg-indigo-600 text-white px-2.5 py-1 rounded-md font-semibold hover:bg-indigo-500 shadow-glow"
                      >
                        Diagnostic Quiz
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
