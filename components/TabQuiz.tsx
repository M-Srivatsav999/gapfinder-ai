"use client";

import React, { useState } from "react";
import { 
  ShieldCheck, 
  AlertCircle, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  FileText, 
  BrainCircuit, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Award,
  RefreshCw
} from "lucide-react";
import { formatPercent, getMasteryBadgeClass } from "@/lib/bayesian";

interface QuoteVerification {
  chunkId?: string;
  sourceDocTitle?: string;
  section?: string;
  verified: boolean;
  matchOffset: number;
  matchLength: number;
  confidence: number;
  matchType: string;
  quotedText: string;
  highlightedChunkSnippet?: string;
  rejectionReason?: string;
}

interface SingleQuestion {
  id: string;
  question: string;
  options: string[];
  quoteCitation: string;
  quoteVerification: QuoteVerification;
  sourceDocTitle: string;
  sourceSection: string;
  chunkContent: string;
  difficulty: string;
}

interface QuizSessionData {
  topicId: string;
  topicName: string;
  unitName: string;
  currentAlpha: number;
  currentBeta: number;
  currentMastery: number;
  totalSessionQuestions: number;
  questions: SingleQuestion[];
}

interface TabQuizProps {
  sessionData: QuizSessionData | null;
  isLoading: boolean;
  onFinishSession: (topicId: string, answers: { questionId: string; selectedAnswerIndex: number }[]) => Promise<any>;
  onSelectTopic: (topicId: string) => void;
  availableTopics: { id: string; topicName: string; estimatedMastery: number; alpha: number; beta: number }[];
  selectedTopicId: string | null;
  onViewRevisionPlan: () => void;
}

export const TabQuiz: React.FC<TabQuizProps> = ({
  sessionData,
  isLoading,
  onFinishSession,
  onSelectTopic,
  availableTopics,
  selectedTopicId,
  onViewRevisionPlan,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [recordedAnswers, setRecordedAnswers] = useState<{ questionId: string; selectedAnswerIndex: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completionModalData, setCompletionModalData] = useState<any | null>(null);
  const [showChunkSource, setShowChunkSource] = useState(false);

  // Skeleton Loader while generating
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-12 text-center space-y-4 max-w-3xl mx-auto shadow-xl">
        <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-glow">
          <BrainCircuit className="h-8 w-8 text-indigo-400 animate-pulse" />
        </div>
        <h3 className="text-base font-bold text-slate-100">
          Preparing 5-Question Grounded Diagnostic Session...
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Retrieving course document chunks and verifying quotations via Deterministic Quote Gate.
        </p>
      </div>
    );
  }

  if (!sessionData || !sessionData.questions || sessionData.questions.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-10 text-center max-w-2xl mx-auto">
        <HelpCircle className="h-8 w-8 text-slate-500 mx-auto mb-2" />
        <h3 className="text-base font-semibold text-slate-200">No Questions Ready</h3>
        <p className="text-xs text-slate-400 mt-1">
          Select another topic or upload course materials to generate an adaptive diagnostic quiz.
        </p>
      </div>
    );
  }

  const currentQ = sessionData.questions[currentQuestionIndex];
  const totalQuestions = Math.min(5, sessionData.questions.length);
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  // Handle Question Progress
  const handleProceed = async () => {
    if (selectedOption === null || isSubmitting) return;

    const newAnswers = [
      ...recordedAnswers,
      { questionId: currentQ.id, selectedAnswerIndex: selectedOption },
    ];
    setRecordedAnswers(newAnswers);

    if (isLastQuestion) {
      // 5th Question Submitted: Trigger Session Completion & Bayesian Recalculation
      setIsSubmitting(true);
      try {
        const result = await onFinishSession(sessionData.topicId, newAnswers);
        setCompletionModalData(result);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Move to next question in the 5-question test
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setShowChunkSource(false);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setRecordedAnswers([]);
    setCompletionModalData(null);
    setShowChunkSource(false);
    onSelectTopic(sessionData.topicId);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Target Selector & 5-Question Progress Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 shadow-sm">
        <div className="flex items-center space-x-2">
          <label className="text-xs text-slate-400 font-medium">Diagnostic Topic:</label>
          <select
            value={selectedTopicId || sessionData.topicId}
            onChange={(e) => {
              setCurrentQuestionIndex(0);
              setSelectedOption(null);
              setRecordedAnswers([]);
              setCompletionModalData(null);
              onSelectTopic(e.target.value);
            }}
            className="bg-slate-950 text-slate-200 text-xs rounded-lg px-3 py-1.5 border border-slate-800 focus:outline-none focus:border-indigo-500"
          >
            {availableTopics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.topicName} {t.alpha === 1 && t.beta === 1 ? "(Pending Diagnostic)" : `(${Math.round(t.estimatedMastery * 100)}%)`}
              </option>
            ))}
          </select>
        </div>

        {/* Question Counter Pill */}
        <div className="flex items-center space-x-2.5">
          <span className="text-xs font-semibold text-indigo-400">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </span>
          <div className="flex space-x-1">
            {Array.from({ length: totalQuestions }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-6 rounded-full transition-all ${
                  i < currentQuestionIndex
                    ? "bg-emerald-500"
                    : i === currentQuestionIndex
                    ? "bg-indigo-500 shadow-glow"
                    : "bg-slate-800"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Diagnostic Question Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-xl relative backdrop-blur-sm">
        {/* Quote Gate Status Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {sessionData.unitName}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs font-semibold text-indigo-300">
              {sessionData.topicName}
            </span>
          </div>

          {/* Quote Gate Badge */}
          {currentQ.quoteVerification.verified ? (
            <div className="flex items-center space-x-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400 border border-emerald-500/30 shadow-glow-emerald">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="font-semibold">Quote Gate Verified</span>
              <span className="font-mono text-[10px] text-emerald-300/80">
                (Offset #{currentQ.quoteVerification.matchOffset})
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs text-rose-400 border border-rose-500/30">
              <AlertCircle className="h-3.5 w-3.5" />
              <span className="font-semibold">Unverified Citation</span>
            </div>
          )}
        </div>

        {/* Question Stem */}
        <div className="space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
            {currentQ.question}
          </h2>

          {/* Verified Source Citation Box */}
          <div className="rounded-xl bg-slate-950/80 p-3.5 border border-slate-800/90 text-xs">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1.5">
              <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
                <FileText className="h-3.5 w-3.5" />
                <span>Verified Source Citation:</span>
              </span>
              <span className="text-slate-500 font-mono text-[10px]">
                {currentQ.sourceDocTitle} · {currentQ.sourceSection}
              </span>
            </div>
            <p className="italic text-slate-300">"{currentQ.quoteCitation}"</p>
          </div>

          {/* Multiple Choice Options */}
          <div className="space-y-2.5 pt-2">
            {currentQ.options.map((option, index) => {
              const isSelected = selectedOption === index;
              const letters = ["A", "B", "C", "D"];

              return (
                <button
                  key={index}
                  onClick={() => setSelectedOption(index)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all duration-150 flex items-start space-x-3 ${
                    isSelected
                      ? "bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-glow ring-1 ring-indigo-500/40"
                      : "bg-slate-850/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 text-slate-200"
                  }`}
                >
                  <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-md bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-300">
                    {letters[index]}
                  </span>
                  <span className="text-sm pt-0.5 leading-snug">{option}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 flex justify-between items-center pt-4 border-t border-slate-800/80">
          <button
            onClick={() => setShowChunkSource(!showChunkSource)}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
          >
            <span>{showChunkSource ? "Hide" : "Inspect"} Full Source Chunk</span>
            {showChunkSource ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          <button
            onClick={handleProceed}
            disabled={selectedOption === null || isSubmitting}
            className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-glow hover:bg-indigo-500 disabled:opacity-40 transition"
          >
            <span>
              {isSubmitting
                ? "Calculating Bayesian Gap..."
                : isLastQuestion
                ? "Submit 5-Question Diagnostic"
                : "Next Question"}
            </span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Chunk Inspector */}
        {showChunkSource && (
          <div className="mt-4 rounded-xl bg-slate-950 p-4 border border-slate-800 text-xs text-slate-300 leading-relaxed font-mono">
            {currentQ.chunkContent}
          </div>
        )}
      </div>

      {/* STEP 3: QUIZ COMPLETION MODAL */}
      {completionModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl border border-indigo-500/40 bg-slate-900 p-8 shadow-2xl space-y-6 text-center relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />

            <div className="inline-flex p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shadow-glow">
              <Award className="h-10 w-10 text-indigo-400" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold text-white">Diagnostic Quiz Complete! 🎉</h3>
              <p className="text-xs text-slate-400">
                Bayesian Beta-Binomial posterior evaluated for <strong>{completionModalData.topicName}</strong>.
              </p>
            </div>

            {/* Score & Gap Status Transition Card */}
            <div className="rounded-2xl bg-slate-950/80 p-5 border border-slate-800 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="rounded-xl bg-slate-900 p-3 border border-slate-800/80">
                  <span className="text-[11px] text-slate-500 block uppercase font-semibold">Diagnostic Score</span>
                  <div className="text-xl font-bold text-slate-100 mt-0.5">
                    {completionModalData.correctCount} / {completionModalData.totalQuestions}
                    <span className="text-xs text-slate-400 font-normal ml-1.5">
                      ({Math.round((completionModalData.correctCount / completionModalData.totalQuestions) * 100)}%)
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-900 p-3 border border-slate-800/80">
                  <span className="text-[11px] text-slate-500 block uppercase font-semibold">Mastery Evaluated</span>
                  <div className="text-xl font-bold text-white mt-0.5">
                    {formatPercent(completionModalData.newMastery)}
                  </div>
                </div>
              </div>

              {/* Status Transition Badge */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400 font-medium">Topic Gap Status:</span>
                <span className={`px-3 py-1 rounded-full font-bold uppercase text-xs ${getMasteryBadgeClass(completionModalData.newCategory)}`}>
                  {completionModalData.newCategory}
                </span>
              </div>
            </div>

            {/* Prominent Action Button: View Updated Revision Plan */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={onViewRevisionPlan}
                className="w-full flex items-center justify-center space-x-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3.5 text-sm font-bold text-white shadow-glow hover:from-indigo-500 hover:to-violet-500 transition duration-150"
              >
                <span>View Updated Revision Plan</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={handleRestartQuiz}
                className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition"
              >
                Retake Diagnostic Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
