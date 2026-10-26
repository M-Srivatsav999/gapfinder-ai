"use client";

import React, { useState } from "react";
import { 
  Send, 
  ShieldAlert, 
  ShieldCheck, 
  FileText, 
  AlertTriangle,
  Bot,
  User,
  Sparkles
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  isRefusal?: boolean;
  citedChunks?: {
    chunkId: string;
    docTitle: string;
    section: string;
    quote: string;
    verified: boolean;
  }[];
}

interface TabAssistantProps {
  initialQuery?: string;
}

export const TabAssistant: React.FC<TabAssistantProps> = ({ initialQuery = "" }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-welcome",
      sender: "assistant",
      text:
        "Hello! I am your **GapFinder AI Academic Assistant**. I am strictly grounded in your local course materials.\n\n" +
        "Unlike standard chatbots, I refuse to answer questions outside your syllabus and verify every factual statement against local document chunks via our Deterministic Quote Gate.\n\n" +
        "Ask me about your course topics or test our hallucination refusal gate below!",
    },
  ]);
  const [inputQuery, setInputQuery] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (queryToSend?: string, forceRefusal: boolean = false) => {
    const q = queryToSend || inputQuery;
    if (!q.trim() || isLoading) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      sender: "user",
      text: q,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, forceRefusal }),
      });

      const data = await res.json();

      const assistantMsg: Message = {
        id: `msg-${Date.now()}-assistant`,
        sender: "assistant",
        text: data.response,
        isRefusal: data.isOutOfSyllabusRefusal,
        citedChunks: data.citedChunks,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-err`,
          sender: "assistant",
          text: `Error processing query: ${err.message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestRefusal = () => {
    const refusalQuery = "What is the capital of France and how do I make a chocolate cake?";
    handleSend(refusalQuery, true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Top Banner with Refusal Demo Button */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center space-x-2.5 text-xs text-slate-300">
          <ShieldAlert className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <span>Strict Local Grounding Active: Zero hallucination policy enforced.</span>
        </div>

        {/* Demo Button: Test Hallucination / Out-of-Syllabus Refusal */}
        <button
          onClick={handleTestRefusal}
          disabled={isLoading}
          className="flex items-center justify-center space-x-2 rounded-xl bg-rose-500/20 px-3.5 py-2 text-xs text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 hover:border-rose-500/70 transition font-semibold shadow-glow-rose flex-shrink-0"
        >
          <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
          <span>Test Refusal / Out-of-Syllabus Refusal</span>
        </button>
      </div>

      {/* Quick In-Syllabus Suggestions */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-500 font-medium whitespace-nowrap">Suggested Questions:</span>
        <button
          onClick={() => handleSend("In Raft, how does the leader maintain authority?", false)}
          className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 whitespace-nowrap transition"
        >
          Raft Leader Authority
        </button>
        <button
          onClick={() => handleSend("How do Vector Clocks detect concurrent events?", false)}
          className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 whitespace-nowrap transition"
        >
          Vector Clocks Concurrency
        </button>
        <button
          onClick={() => handleSend("Why are virtual nodes used in Consistent Hashing rings?", false)}
          className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 whitespace-nowrap transition"
        >
          Consistent Hashing Virtual Nodes
        </button>
      </div>

      {/* Chat Messages Container */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 min-h-[440px] max-h-[580px] overflow-y-auto space-y-4 shadow-xl backdrop-blur-sm">
        {messages.map((m) => {
          const isUser = m.sender === "user";

          return (
            <div
              key={m.id}
              className={`flex space-x-3 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs md:text-sm leading-relaxed ${
                  isUser
                    ? "bg-indigo-600 text-white rounded-tr-none shadow-glow"
                    : m.isRefusal
                    ? "bg-rose-500/10 border border-rose-500/30 text-rose-200 rounded-tl-none shadow-glow-rose"
                    : "bg-slate-850 border border-slate-800 text-slate-200 rounded-tl-none"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>

                {/* Grounded Inline Citations (Quote Gate Verified) */}
                {m.citedChunks && m.citedChunks.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Verified Citations (Quote Gate Passed):
                    </span>
                    {m.citedChunks.map((cite, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg bg-slate-950 p-2.5 border border-slate-800 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-slate-400 text-[10px]">
                          <span className="font-semibold text-indigo-300">
                            {cite.docTitle} · {cite.section}
                          </span>
                          <span className="flex items-center gap-1 text-emerald-400">
                            <ShieldCheck className="h-3 w-3" />
                            Exact Substring Verified
                          </span>
                        </div>
                        <p className="italic text-slate-300 text-[11px]">"{cite.quote}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center space-x-2 text-xs text-slate-400 pl-11">
            <div className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" />
            <div className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
            <div className="h-2 w-2 rounded-full bg-indigo-300 animate-bounce [animation-delay:0.4s]" />
            <span className="font-mono text-slate-500 text-[11px]">
              Retrieving grounded chunks & enforcing Quote Gate...
            </span>
          </div>
        )}
      </div>

      {/* Input Field */}
      <div className="flex items-center space-x-2 bg-slate-900/90 p-2 rounded-2xl border border-slate-800 shadow-xl">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask a question grounded in your course materials..."
          className="flex-1 bg-transparent px-3 py-2 text-xs md:text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
        />
        <button
          onClick={() => handleSend()}
          disabled={!inputQuery.trim() || isLoading}
          className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-glow hover:bg-indigo-500 disabled:opacity-40 transition"
        >
          <span>Send</span>
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
