"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ScopeSelector } from "@/components/ScopeSelector";
import { TabDashboard } from "@/components/TabDashboard";
import { TabQuiz } from "@/components/TabQuiz";
import { TabRevision } from "@/components/TabRevision";
import { TabAssistant } from "@/components/TabAssistant";
import { TabArchitecture } from "@/components/TabArchitecture";
import { UploadModal } from "@/components/UploadModal";
import { MaterialScope, RevisionScheduleItem } from "@/lib/revision-formula";
import { Sparkles, BrainCircuit } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [currentScope, setCurrentScope] = useState<MaterialScope>("full");
  const [ollamaStatus, setOllamaStatus] = useState<any>(null);
  const [isCheckingOllama, setIsCheckingOllama] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Dashboard Data
  const [metrics, setMetrics] = useState({
    overallMastery: 0.50,
    totalTopics: 9,
    weakTopicsCount: 0,
    mediumTopicsCount: 0,
    strongTopicsCount: 0,
    uncoveredTopicsCount: 2,
    assessedCount: 0,
  });
  const [unitTree, setUnitTree] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);

  // Revision Schedule Data
  const [schedule, setSchedule] = useState<RevisionScheduleItem[]>([]);
  const [revisionMetrics, setRevisionMetrics] = useState({
    totalStudyHours: "4.2",
    criticalGapsCount: 2,
    masteredCount: 0,
    totalItems: 9,
  });

  // Quiz Session Data
  const [quizSessionData, setQuizSessionData] = useState<any | null>(null);
  const [selectedQuizTopicId, setSelectedQuizTopicId] = useState<string | null>(null);
  const [isQuizLoading, setIsQuizLoading] = useState(false);

  // Assistant Query
  const [assistantInitialQuery, setAssistantInitialQuery] = useState("");

  // Modals & Notifications
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Check Session Authentication
  const checkSession = async () => {
    setIsAuthChecking(true);
    try {
      const res = await fetch("/api/session");
      const data = await res.json();

      if (!data.authenticated) {
        router.push("/login");
        return;
      }

      setCurrentUser(data.user);
      if (data.scope) setCurrentScope(data.scope);
      if (data.ollama) setOllamaStatus(data.ollama);
    } catch (e) {
      console.error("Auth check failed:", e);
      router.push("/login");
    } finally {
      setIsAuthChecking(false);
    }
  };

  // 2. Load Dashboard & Schedule
  const loadDashboardData = async () => {
    try {
      const res = await fetch("/api/dashboard");
      const data = await res.json();
      if (data.metrics) setMetrics(data.metrics);
      if (data.unitTree) setUnitTree(data.unitTree);
      if (data.topics) setTopics(data.topics);
      if (data.scope) setCurrentScope(data.scope);
    } catch (e) {
      console.error("Failed to load dashboard data:", e);
    }
  };

  const loadRevisionSchedule = async () => {
    try {
      const res = await fetch("/api/revision");
      const data = await res.json();
      if (data.schedule) setSchedule(data.schedule);
      if (data.metrics) setRevisionMetrics(data.metrics);
    } catch (e) {
      console.error("Failed to load revision schedule:", e);
    }
  };

  const loadOllamaStatus = async () => {
    setIsCheckingOllama(true);
    try {
      const res = await fetch("/api/ollama/status");
      const data = await res.json();
      setOllamaStatus(data);
    } catch (e) {
      setOllamaStatus({
        online: false,
        model: "llama3.1:8b",
        usingFallback: true,
      });
    } finally {
      setIsCheckingOllama(false);
    }
  };

  // 3. Load 5-Question Quiz Session for a Topic
  const loadQuizSession = async (topicId?: string) => {
    setIsQuizLoading(true);
    try {
      const url = topicId ? `/api/quiz?topicId=${topicId}` : "/api/quiz";
      const res = await fetch(url);
      const data = await res.json();
      setQuizSessionData(data);
      if (topicId) setSelectedQuizTopicId(topicId);
      else if (data.topicId) setSelectedQuizTopicId(data.topicId);
    } catch (e) {
      console.error("Failed to load quiz session:", e);
    } finally {
      setIsQuizLoading(false);
    }
  };

  useEffect(() => {
    checkSession().then(() => {
      loadDashboardData();
      loadRevisionSchedule();
      loadQuizSession();
    });
  }, []);

  // Logout Handler
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  // Scope Selection Handler
  const handleSelectScope = async (newScope: MaterialScope) => {
    setCurrentScope(newScope);
    try {
      const res = await fetch("/api/session/scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: newScope }),
      });
      const data = await res.json();
      showToast(`🎯 Material Scope updated to: ${newScope.toUpperCase()} (Weights recalculated)`);
      loadDashboardData();
      loadRevisionSchedule();
    } catch (e) {
      console.error(e);
    }
  };

  // Jump from Dashboard to Quiz
  const handleTakeQuizForTopic = (topicId: string) => {
    setSelectedQuizTopicId(topicId);
    setActiveTab("quiz");
    loadQuizSession(topicId);
  };

  // Jump from Dashboard to Assistant
  const handleExplainTopic = (topicName: string) => {
    setAssistantInitialQuery(`Explain the key concepts of ${topicName} based on my course notes.`);
    setActiveTab("assistant");
  };

  // STEP 3: Complete 5-Question Diagnostic Session
  const handleFinishQuizSession = async (
    topicId: string,
    answers: { questionId: string; selectedAnswerIndex: number }[]
  ) => {
    const res = await fetch("/api/quiz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topicId,
        sessionAnswers: answers,
      }),
    });
    const result = await res.json();

    // Silently refresh dashboard & revision schedule in background to compute updated Bayesian order
    loadDashboardData();
    loadRevisionSchedule();

    return result;
  };

  // STEP 4: Transition to Revision Schedule after Quiz Completion
  const handleViewRevisionPlan = () => {
    setActiveTab("revision");
    loadRevisionSchedule();
    showToast("⚡ Revision Plan recalculated in real time! Weak topics prioritized.");
  };

  // Revision Item Status Toggle
  const handleToggleRevisionStatus = async (topicId: string, nextStatus: string) => {
    try {
      await fetch("/api/revision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, status: nextStatus }),
      });
      loadRevisionSchedule();
    } catch (e) {
      console.error(e);
    }
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 animate-pulse">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <p className="text-xs font-mono text-slate-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        ollamaStatus={ollamaStatus}
        currentUser={currentUser}
        currentScope={currentScope}
        onLogout={handleLogout}
        onOpenUpload={() => setIsUploadOpen(true)}
        onRefreshOllama={loadOllamaStatus}
        isCheckingOllama={isCheckingOllama}
      />

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 space-y-6">
        {/* Toast Alert Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-indigo-600 px-4 py-3 text-white shadow-2xl border border-indigo-400 flex items-center space-x-2 animate-bounce">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-semibold">{toastMessage}</span>
          </div>
        )}

        {/* Global Scope Selector Bar */}
        {(activeTab === "dashboard" || activeTab === "revision") && (
          <ScopeSelector
            currentScope={currentScope}
            onSelectScope={handleSelectScope}
          />
        )}

        {/* Tab 1: Gap Dashboard (Step 1 Baseline / Heatmap) */}
        {activeTab === "dashboard" && (
          <TabDashboard
            metrics={metrics}
            unitTree={unitTree}
            onTakeQuizForTopic={handleTakeQuizForTopic}
            onExplainTopic={handleExplainTopic}
          />
        )}

        {/* Tab 2: Diagnostic Quiz (Step 2: 5-Question Session & Step 3: Completion Modal) */}
        {activeTab === "quiz" && (
          <TabQuiz
            sessionData={quizSessionData}
            isLoading={isQuizLoading}
            onFinishSession={handleFinishQuizSession}
            onSelectTopic={(tId) => {
              setSelectedQuizTopicId(tId);
              loadQuizSession(tId);
            }}
            availableTopics={topics}
            selectedTopicId={selectedQuizTopicId}
            onViewRevisionPlan={handleViewRevisionPlan}
          />
        )}

        {/* Tab 3: Revision Schedule (Step 1 Baseline Reading / Step 4 Recalculated Plan) */}
        {activeTab === "revision" && (
          <TabRevision
            schedule={schedule}
            metrics={revisionMetrics}
            currentScope={currentScope}
            onToggleStatus={handleToggleRevisionStatus}
            onStartQuiz={handleTakeQuizForTopic}
          />
        )}

        {/* Tab 4: Assistant */}
        {activeTab === "assistant" && (
          <TabAssistant initialQuery={assistantInitialQuery} />
        )}

        {/* Tab 5: Tech Architecture & Evaluation */}
        {activeTab === "architecture" && <TabArchitecture />}
      </main>

      {/* Upload Materials Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          showToast("Course material uploaded and indexed in local SQLite!");
          loadDashboardData();
          loadRevisionSchedule();
          loadQuizSession();
        }}
      />

      {/* Clean Production Footer */}
      <footer className="border-t border-slate-850/80 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-400">GapFinder AI</span>
            <span>·</span>
            <span>4-Step Bayesian Diagnostic Lifecycle</span>
          </div>
          <div className="flex items-center space-x-3 text-slate-400 font-mono text-[11px]">
            <span>Local SQLite: dev.db</span>
            <span>·</span>
            <span>5-Question Adaptive Quizzes</span>
            <span>·</span>
            <span>Deterministic Quote Gate</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
