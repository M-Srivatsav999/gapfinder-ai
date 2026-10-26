"use client";

import React, { useState } from "react";
import { 
  Cpu, 
  Code2, 
  ShieldCheck, 
  Database, 
  Terminal, 
  Binary, 
  Workflow, 
  Sparkles,
  Search,
  CheckCircle2,
  XCircle,
  FileText
} from "lucide-react";
import { verifyQuoteInChunk } from "@/lib/quote-gate";

export const TabArchitecture: React.FC = () => {
  const [sandboxChunk, setSandboxChunk] = useState(
    "In the Raft consensus algorithm, leader nodes transmit periodic AppendEntries heartbeats to prevent follower election timeouts. When a follower node does not receive a heartbeat within its randomized election timeout window (typically 150ms to 300ms), it transitions to the candidate state, increments the term counter, and requests votes across the cluster."
  );
  const [sandboxQuote, setSandboxQuote] = useState(
    "leader nodes transmit periodic AppendEntries heartbeats to prevent follower election timeouts"
  );
  const [sandboxResult, setSandboxResult] = useState<any>(null);

  const testSandboxQuote = () => {
    const res = verifyQuoteInChunk(sandboxQuote, sandboxChunk, "sandbox-test-chunk", "Sandbox Document", "Section 1");
    setSandboxResult(res);
  };

  const mermaidSource = `flowchart TD
    User([Student / Evaluator]) --> UI[Next.js 14 Web Interface]
    UI --> ScopeSelector[Material Scope Selector: Notes / Syllabus / Past Papers]
    
    subgraph StorageLayer [Local Deterministic Storage]
        SQLite[(Local dev.db: SQLite via Prisma)]
        DocChunks[Document Chunks & TF-IDF Vectors]
    end

    subgraph DeterministicEngine [Code & Math Decision Core]
        BM25[BM25 Keyword Matcher]
        Cosine[Cosine Similarity Vector Ranker]
        Hybrid[Hybrid Ranker: 0.5 BM25 + 0.5 Cosine]
        Bayesian[Bayesian Beta-Binomial: Alpha, Beta Posterior]
        QuoteGate{Deterministic Quote Gate: Verbatim Substring Checker}
        RevisionFormula[Priority Formula: 1-Mastery * Exam Weight * Prereq Boost]
    end

    subgraph LLMLayer [Local Ollama LLM: Text Only]
        Ollama[Ollama llama3.1:8b / Local Fallback Generator]
    end

    ScopeSelector --> RevisionFormula
    UI -->|Quiz Attempt| Bayesian
    Bayesian -->|Update Alpha/Beta| SQLite
    Bayesian -->|Updated Mastery| RevisionFormula
    RevisionFormula -->|Re-rank Queue| UI

    UI -->|Search / Assistant Query| Hybrid
    DocChunks --> Hybrid
    Hybrid -->|Top Chunks| QuoteGate
    Hybrid -->|Top Chunks| Ollama
    Ollama -->|Candidate Text & Quotes| QuoteGate
    QuoteGate -->|PASSED: Verbatim Substring| UI
    QuoteGate -->|FAILED: Halts Hallucination| UI`;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div className="rounded-xl border border-indigo-500/30 bg-slate-900/90 p-6 shadow-glow">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">System Architecture & Technical Specs</h2>
            <p className="text-xs text-slate-400">
              Complete evaluation guide, division of labor, and deterministic quote gate specification.
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-indigo-300 font-mono">
          <strong>Fundamental Architectural Law:</strong> "Code and Math make decisions; the local Ollama LLM only writes text."
        </div>
      </div>

      {/* Division of Labor Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-md">
        <div className="flex items-center space-x-2 mb-4">
          <Binary className="h-5 w-5 text-indigo-400" />
          <h3 className="text-base font-bold text-slate-100">
            Division of Labor: Code & Math vs. Local Ollama LLM
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                <th className="p-3 font-semibold uppercase tracking-wider">Responsibility</th>
                <th className="p-3 font-semibold uppercase tracking-wider text-indigo-400">
                  Code & Math (Deterministic Engine)
                </th>
                <th className="p-3 font-semibold uppercase tracking-wider text-amber-400">
                  Local Ollama LLM (Generative Layer)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans text-slate-300">
              <tr>
                <td className="p-3 font-medium text-slate-200">Knowledge Gap State</td>
                <td className="p-3 text-emerald-300 bg-emerald-500/[0.02]">
                  Beta-Binomial distribution: updates α, β mathematically on every trial. Zero LLM hallucinations.
                </td>
                <td className="p-3 text-slate-500">None (Forbidden from estimating scores)</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-slate-200">Revision Order</td>
                <td className="p-3 text-emerald-300 bg-emerald-500/[0.02]">
                  <code>Priority = (1 - Mastery) × Exam Weight × Prereq Boost</code>. Strict descending rank.
                </td>
                <td className="p-3 text-slate-500">None (Forbidden from ordering study plans)</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-slate-200">Fact Grounding & Citations</td>
                <td className="p-3 text-emerald-300 bg-emerald-500/[0.02]">
                  Deterministic Quote Gate: verifies quoted strings exist verbatim in source chunk before rendering.
                </td>
                <td className="p-3 text-amber-300">Extracts relevant excerpts from retrieved chunks.</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-slate-200">Chunk Retrieval</td>
                <td className="p-3 text-emerald-300 bg-emerald-500/[0.02]">
                  Local Hybrid search: BM25 keyword matching + Cosine similarity in SQLite / TypeScript.
                </td>
                <td className="p-3 text-slate-500">None (Retrieval is 100% local deterministic math)</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-slate-200">Out-of-Syllabus Refusal</td>
                <td className="p-3 text-emerald-300 bg-emerald-500/[0.02]">
                  Keyword & vector threshold filter rejects questions outside syllabus before reaching LLM.
                </td>
                <td className="p-3 text-amber-300">Formats refusal notice politely if triggered.</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-slate-200">Natural Language Synthesis</td>
                <td className="p-3 text-slate-500">Provides raw verified chunks and structured prompt bounds.</td>
                <td className="p-3 text-amber-300">Synthesizes fluent conversational explanations and options.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Mermaid Architecture Visualizer */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-md">
        <div className="flex items-center space-x-2 mb-4">
          <Workflow className="h-5 w-5 text-indigo-400" />
          <h3 className="text-base font-bold text-slate-100">
            Mermaid Architecture Diagram (Dataflow & Gates)
          </h3>
        </div>

        {/* Visual Flow Representation */}
        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
            {/* Step 1 */}
            <div className="rounded-lg p-3 bg-slate-900 border border-slate-800">
              <span className="text-indigo-400 block font-bold mb-1">1. INGESTION & SCOPE</span>
              <p className="text-slate-400">Notes, Syllabus, Past Papers parsed into chunks & TF-IDF vectors in SQLite.</p>
            </div>
            {/* Step 2 */}
            <div className="rounded-lg p-3 bg-slate-900 border border-slate-800">
              <span className="text-indigo-400 block font-bold mb-1">2. HYBRID RETRIEVAL</span>
              <p className="text-slate-400">Score = 0.5 × BM25 + 0.5 × Cosine. Runs 100% locally with zero cloud delay.</p>
            </div>
            {/* Step 3 */}
            <div className="rounded-lg p-3 bg-slate-900 border border-emerald-500/40">
              <span className="text-emerald-400 block font-bold mb-1">3. QUOTE GATE</span>
              <p className="text-slate-400">Verifies verbatim substring match. Discards any ungrounded LLM hallucination.</p>
            </div>
            {/* Step 4 */}
            <div className="rounded-lg p-3 bg-slate-900 border border-indigo-500/40">
              <span className="text-indigo-400 block font-bold mb-1">4. BAYESIAN PLAN</span>
              <p className="text-slate-400">Beta-Binomial updates (α, β) feed Priority = (1-M) × Weight × Boost.</p>
            </div>
          </div>

          {/* Raw Mermaid Code */}
          <div className="rounded-lg bg-slate-900/80 p-3.5 border border-slate-800">
            <div className="flex justify-between items-center text-[11px] text-slate-400 mb-2 font-mono">
              <span>Mermaid.js Source</span>
              <span className="text-indigo-400">Renderable in Mermaid CLI / Live Editors</span>
            </div>
            <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre leading-relaxed">
              {mermaidSource}
            </pre>
          </div>
        </div>
      </div>

      {/* Interactive Deterministic Quote Gate Sandbox */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-md">
        <div className="flex items-center space-x-2 mb-2">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <h3 className="text-base font-bold text-slate-100">
            Interactive Deterministic Quote Gate Inspector
          </h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Test how the Quote Gate algorithm validates candidate quotations against source chunks in real-time.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Source Chunk Text (from SQLite Vector Store):
            </label>
            <textarea
              rows={3}
              value={sandboxChunk}
              onChange={(e) => setSandboxChunk(e.target.value)}
              className="w-full rounded-lg bg-slate-950 p-3 text-xs font-mono text-slate-300 border border-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Candidate Quotation (Extracted by Ollama LLM):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={sandboxQuote}
                onChange={(e) => setSandboxQuote(e.target.value)}
                className="flex-1 rounded-lg bg-slate-950 px-3 py-2 text-xs font-mono text-slate-300 border border-slate-800 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={testSandboxQuote}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-glow hover:bg-indigo-500 transition"
              >
                Execute Quote Gate
              </button>
            </div>
          </div>

          {/* Test Buttons */}
          <div className="flex gap-2 text-xs">
            <span className="text-slate-500">Quick Test Cases:</span>
            <button
              onClick={() => {
                setSandboxQuote("leader nodes transmit periodic AppendEntries heartbeats");
                testSandboxQuote();
              }}
              className="text-emerald-400 hover:underline"
            >
              Valid Substring
            </button>
            <span className="text-slate-600">·</span>
            <button
              onClick={() => {
                setSandboxQuote("quantum entanglement synchronizes Raft state instantaneously");
                testSandboxQuote();
              }}
              className="text-rose-400 hover:underline"
            >
              Hallucinated Substring (Fails)
            </button>
          </div>

          {/* Verification Result */}
          {sandboxResult && (
            <div
              className={`p-4 rounded-lg border font-mono text-xs ${
                sandboxResult.verified
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-glow-emerald"
                  : "bg-rose-500/10 border-rose-500/40 text-rose-300 shadow-glow-rose"
              }`}
            >
              <div className="flex items-center space-x-2 font-bold mb-2">
                {sandboxResult.verified ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>STATUS: QUOTE GATE PASSED (MATCH TYPE: {sandboxResult.matchType.toUpperCase()})</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-rose-400" />
                    <span>STATUS: QUOTE GATE REJECTED (HALLUCINATION HALTED)</span>
                  </>
                )}
              </div>
              <div className="space-y-1 text-[11px]">
                <div>Match Offset: #{sandboxResult.matchOffset}</div>
                <div>Match Length: {sandboxResult.matchLength} chars</div>
                <div>Confidence: {(sandboxResult.confidence * 100).toFixed(0)}%</div>
                {sandboxResult.rejectionReason && (
                  <div className="text-rose-400 mt-1">Reason: {sandboxResult.rejectionReason}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
