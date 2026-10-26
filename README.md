# GapFinder AI 🧠⚡
> **"Code and Math make decisions; the local Ollama LLM only writes text."**
> A 100% self-contained, production-grade Next.js 14 diagnostic education platform running completely locally with zero cloud dashboard setup.

---

## 🌟 Overview & Philosophy

Traditional educational AI tools rely on passive, chat-centric LLM prompts that suffer from hallucinations, arbitrary grading, and lack of mathematical rigor. 

**GapFinder AI** reverses this paradigm:
1. **Mathematical Decision Core:** Student knowledge mastery is modeled probabilistically using a **Bayesian Beta-Binomial distribution** $(\alpha, \beta)$ with exact uncertainty bounds.
2. **Deterministic Priority Ranking:** Study schedules are computed strictly via:
   $$\text{Priority} = (1 - \text{Mastery}) \times \text{Exam Weight} \times \text{Prerequisite Boost}$$
3. **Deterministic Quote Gate:** Verifies that every quote cited by the generative model exists as an **exact verbatim substring** in the local source text chunk. Any hallucinated citation is deterministically rejected.
4. **100% Local & Zero Cloud Setup:** Built on Next.js 14 (App Router), local SQLite (`dev.db`), local hybrid vector retrieval (BM25 + Cosine similarity), and local Ollama (`llama3.1:8b`) with an automatic high-fidelity fallback generator.

---

## 🎨 Mastery Color Palette (Strictly Enforced)

| Status | Mastery Range | Badge & Border Styling | Semantics |
| :--- | :--- | :--- | :--- |
| **Weak Gap** | $< 50\%$ | `bg-rose-500/10 text-rose-400 border-rose-500/30` | Critical knowledge deficit; elevated revision priority |
| **Medium** | $50\% - 75\%$ | `bg-amber-500/10 text-amber-400 border-amber-500/30` | Reinforcement required before exam |
| **Strong** | $> 75\%$ | `bg-emerald-500/10 text-emerald-400 border-emerald-500/30` | Verified retention with high posterior confidence |
| **Uncovered** | Missing Notes | `bg-slate-700/50 text-slate-400` + Red warning badge | Syllabus required topic absent from uploaded notes |

---

## 🚀 5 Core Feature Tabs

### 1. Gap Dashboard (Tab 1)
- **Hierarchical Unit $\to$ Topic $\to$ Subtopic Tree View:** Displays the complete curriculum structure.
- **Bayesian Beta-Binomial Heatmap:** Visualizes live mastery state, parameter pairs $(\alpha, \beta)$, and 95% credible intervals.
- **Uncovered Material Warnings:** Identifies topics mandatory in the syllabus (e.g., *Byzantine Fault Tolerance*) that have zero notes uploaded.
- **Scope Selector Integration:** Real-time calibration between Notes Only, Notes + Syllabus, and Full Exam Mode.

### 2. Adaptive Diagnostic Quiz (Tab 2)
- **Grounded Question Synthesis:** Generates targeted questions using retrieved local text chunks.
- **Deterministic Quote Gate:** Displays live verification badges (`Quote Gate: PASSED`) with exact character offsets from the source text chunk.
- **Live Bayesian Posterior Updates:** Immediately increments $\alpha \leftarrow \alpha + 1$ on correct answers or $\beta \leftarrow \beta + 1$ on mistakes, recalculating mastery in real time.

### 3. Revision Schedule (Tab 3)
- **Strictly Formula-Driven:**
  $$\text{Priority} = (1 - \text{Mastery}) \times \text{Exam Weight} \times \text{Prerequisite Boost}$$
- **Full Transparency:** Each card displays the explicit factors: Gap Deficit, Exam Weight, and Prerequisite Multiplier.
- **Dynamic Reordering:** Changes rank dynamically as students complete diagnostic quizzes.
- **Time Allocation:** Recommends focused study durations (minutes) based on priority score.

### 4. Explain-This-Topic Assistant (Tab 4)
- **Strict Grounded RAG:** Queries local chunks via hybrid BM25 + Cosine search and quotes verbatim chunks with bracketed citations.
- **"Test Hallucination / Out-of-Syllabus Refusal" Demo Button:** One-click evaluation demonstrating how queries outside the uploaded course boundaries are rejected by the strict grounding policy.

### 5. Tech Architecture & Evaluation (Tab 5)
- **Mermaid Architecture Diagram:** Visual and source dataflow documentation.
- **Division of Labor Matrix:** Side-by-side contrast between deterministic code/math and the generative layer.
- **Interactive Quote Gate Inspector:** Test any custom string against sample chunks to observe substring offset matching live.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS (Dark/Slate-950 theme, Indigo glow accents)
- **Icons:** Lucide React
- **Database & Storage:** Local SQLite via Prisma ORM (`prisma/schema.prisma`, `dev.db`)
- **Vector Search:** 100% Local Hybrid Retrieval (BM25 Keyword Frequency + 64-dim Cosine Similarity in pure TypeScript)
- **AI Engine:** Local Ollama (`llama3.1:8b` at `http://localhost:11434`) + Built-in Grounded Fallback Engine

---

## ⚡ Quick Start & Local Setup

### Prerequisites
- Node.js 18+ (tested on Node 20 & 24)
- npm or pnpm
- *(Optional)* [Ollama](https://ollama.com) running `ollama run llama3.1:8b`

### 1. Clone & Install Dependencies
```bash
cd lucid-hawking
npm install
```

### 2. Initialize Local SQLite Database
The SQLite database file (`dev.db`) and schema initialize automatically on first boot, or can be pushed manually:
```bash
npx prisma db push
```

### 3. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎯 The 4-Step Diagnostic Lifecycle (Judge Demo Guide)

1. **STEP 1: Initial Ingestion & Baseline Reading Plan:**
   - Click the prominent **"🚀 1-Click Judge Demo Login"** on `/login`.
   - Topics initialize in their genuine **"Unassessed / Pending Diagnostic"** state (0 quiz attempts, $\alpha=1.0, \beta=1.0$) rather than pre-baked scores.
   - The initial **Baseline Reading Plan** appears in Tab 3, organized by document section order with estimated reading durations.
   - Topics missing from notes (*Byzantine Fault Tolerance*, *Distributed Tracing*) display the red **"Missing in Notes!"** warning badge.
2. **STEP 2: 5-Question Diagnostic Quiz Session:**
   - From Tab 1 (Dashboard) or Tab 3 (Revision), click **"Start Diagnostic Quiz"** on any topic (e.g., *CAP Theorem & PACELC* or *Paxos & Raft*).
   - Tab 2 launches a session limited to **exactly 5 questions** with a visual `"Question X of 5"` progress tracker.
   - Each question displays its **`Quote Gate Verified`** badge, exact character offset, and source citation.
3. **STEP 3: Gap Analysis & Completion Modal:**
   - Answer the 5 questions.
   - Upon submitting the 5th question, the system computes the Bayesian Beta-Binomial posterior update:
     $$\alpha \leftarrow 1 + \text{correct}, \quad \beta \leftarrow 1 + \text{incorrect}$$
   - The topic transitions to its evaluated category (**Weak <50%**, **Medium 50-75%**, or **Strong >75%**).
   - The **"🎉 Diagnostic Quiz Complete!"** modal displays your score, evaluated mastery, and new gap status.
4. **STEP 4: Real-Time Revision Plan Recalculation:**
   - Click **"View Updated Revision Plan"** in the modal.
   - The view transitions to Tab 3 (Revision Schedule), which recalculates in real time using:
     $$\text{Priority} = (1 - \text{Mastery}) \times \text{Exam Weight} \times \text{Prerequisite Boost}$$
   - Diagnosed weak topics automatically jump to the top of the queue with allocated study times!

---

## ⚖️ Division of Labor: Code & Math vs. LLM

| Responsibility | Deterministic Code & Math | Local Ollama LLM |
| :--- | :--- | :--- |
| **Knowledge Gap Tracking** | $\text{Beta}(\alpha, \beta)$ distribution update | Forbidden from modifying scores |
| **Study Prioritization** | $\text{Priority} = (1-M) \times W \times B$ | Forbidden from altering ranks |
| **Fact Verification** | Deterministic Quote Gate substring match | Provides candidate citations |
| **Document Retrieval** | Hybrid BM25 + Cosine similarity in SQLite | None (pure local algorithmic search) |
| **Out-of-Syllabus Refusal** | Deterministic boundary gate | Displays formatted refusal |
| **Text Generation** | Structured prompt assembly | Synthesizes conversational explanation |

---

## 📄 License
MIT License. GapFinder AI is open-source and 100% self-contained.
