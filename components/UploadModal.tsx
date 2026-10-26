"use client";

import React, { useState, useRef } from "react";
import { 
  X, 
  Upload, 
  FileText, 
  BookOpen, 
  GraduationCap, 
  CheckCircle2, 
  Sparkles, 
  FileUp, 
  AlertCircle,
  FileCheck
} from "lucide-react";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<"notes" | "syllabus" | "past_paper">("notes");
  const [topicName, setTopicName] = useState("");
  const [unitName, setUnitName] = useState("Unit 3: Fault Tolerance & Networks");
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMessage("");
      // Auto-populate topic name from filename
      if (!topicName) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setTopicName(cleanName);
      }
    }
  };

  // Sample pre-load test: resolves the Byzantine Fault Tolerance uncovered gap!
  const handlePreloadMissingTopic = () => {
    const sampleContent =
      "In Byzantine Fault Tolerant distributed systems, nodes may fail arbitrarily or act maliciously. Lamport, Shostak, and Pease proved mathematically that consensus is impossible in an asynchronous network unless at least 3f + 1 nodes are present, where f is the maximum number of Byzantine faulty nodes. Practical Byzantine Fault Tolerance (PBFT) operates through three phases: Pre-Prepare, Prepare, and Commit, ensuring linearizable state machine replication across hostile peers.";

    const blob = new Blob([sampleContent], { type: "text/plain" });
    const file = new File([blob], "Lecture14_Byzantine_Fault_Tolerance_PBFT.txt", { type: "text/plain" });
    setSelectedFile(file);
    setDocType("notes");
    setTopicName("Byzantine Fault Tolerance (BFT)");
    setUnitName("Unit 3: Fault Tolerance & Networks");
    setErrorMessage("");
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage("Please select a file to upload (.pdf, .txt, .md).");
      return;
    }

    setIsUploading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("type", docType);
      formData.append("topicName", topicName);
      formData.append("unitName", unitName);
      formData.append("title", selectedFile.name);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(data.message || "File uploaded and indexed successfully!");
        setTimeout(() => {
          onUploadSuccess();
          onClose();
          setSelectedFile(null);
          setSuccessMessage("");
        }, 1200);
      } else {
        setErrorMessage(data.error || "Upload failed.");
      }
    } catch (e: any) {
      setErrorMessage(e.message || "An error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Upload Study Materials</h3>
              <p className="text-xs text-slate-400">
                Extracts semantic chunks locally into SQLite dev.db
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 1-Click Preload Missing Gap Button */}
        <button
          type="button"
          onClick={handlePreloadMissingTopic}
          className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-indigo-950/80 to-slate-900 border border-indigo-500/30 text-indigo-300 text-xs flex items-center justify-between hover:border-indigo-500/60 transition shadow-glow"
        >
          <span className="flex items-center gap-2 font-medium">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <span>1-Click Test: Attach Notes for "Byzantine Fault Tolerance"</span>
          </span>
          <span className="text-[10px] bg-indigo-500/20 px-2 py-0.5 rounded font-mono border border-indigo-500/30">
            Resolves Gap
          </span>
        </button>

        {/* Real File Input Zone */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.txt,.md"
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
              selectedFile
                ? "border-emerald-500/60 bg-emerald-500/5"
                : "border-slate-700 bg-slate-950/60 hover:border-indigo-500/60 hover:bg-slate-950"
            }`}
          >
            {selectedFile ? (
              <div className="space-y-1.5">
                <FileCheck className="h-8 w-8 text-emerald-400 mx-auto" />
                <p className="text-xs font-semibold text-emerald-300">{selectedFile.name}</p>
                <p className="text-[11px] text-slate-400 font-mono">
                  {(selectedFile.size / 1024).toFixed(1)} KB · Ready to index
                </p>
                <span className="text-[10px] text-indigo-400 underline block pt-1">
                  Click to select a different file
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <FileUp className="h-8 w-8 text-slate-500 mx-auto" />
                <p className="text-xs font-medium text-slate-200">
                  Click to select a file from your system
                </p>
                <p className="text-[11px] text-slate-400">
                  Supports <strong>.pdf</strong>, <strong>.txt</strong>, and <strong>.md</strong>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Document Classification & Target Topic */}
        <div className="space-y-3.5 text-xs">
          <div>
            <label className="text-slate-300 font-medium block mb-1.5">
              Material Classification (calibrates revision weights):
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDocType("notes")}
                className={`p-2.5 rounded-lg border text-center transition ${
                  docType === "notes"
                    ? "bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-glow"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileText className="h-4 w-4 mx-auto mb-1 text-indigo-400" />
                <span className="font-semibold block">Lecture Notes</span>
                <span className="text-[10px] text-slate-400">Fills topic gaps</span>
              </button>
              <button
                type="button"
                onClick={() => setDocType("syllabus")}
                className={`p-2.5 rounded-lg border text-center transition ${
                  docType === "syllabus"
                    ? "bg-amber-500/20 border-amber-500 text-amber-200 shadow-glow-amber"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <BookOpen className="h-4 w-4 mx-auto mb-1 text-amber-400" />
                <span className="font-semibold block">Syllabus</span>
                <span className="text-[10px] text-slate-400">Required learning</span>
              </button>
              <button
                type="button"
                onClick={() => setDocType("past_paper")}
                className={`p-2.5 rounded-lg border text-center transition ${
                  docType === "past_paper"
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-200 shadow-glow-emerald"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <GraduationCap className="h-4 w-4 mx-auto mb-1 text-emerald-400" />
                <span className="font-semibold block">Past Exam Paper</span>
                <span className="text-[10px] text-slate-400">Freq × Marks ROI</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-medium block mb-1">Target Topic Name:</label>
            <input
              type="text"
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              placeholder="e.g. Byzantine Fault Tolerance (BFT)"
              className="w-full rounded-lg bg-slate-950 px-3 py-2 text-slate-200 border border-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Error or Success feedback */}
        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex justify-end space-x-2.5 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="px-5 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white shadow-glow hover:bg-indigo-500 disabled:opacity-40 transition flex items-center space-x-1.5"
          >
            {isUploading ? (
              <span>Chunking & Indexing...</span>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                <span>Upload & Recalibrate</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
