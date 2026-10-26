import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { DEMO_DATA } from "./seed-data";

export { DEMO_DATA } from "./seed-data";

// Global singleton interface for Prisma and concurrency locks
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  dbInitialized: boolean | undefined;
  initializationPromise: Promise<void> | undefined;
};

// Detect Vercel or AWS Lambda serverless execution environment
const isVercel =
  process.env.VERCEL === "1" ||
  Boolean(process.env.VERCEL) ||
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

/**
 * Resolves the appropriate writable SQLite file path and connection URL.
 * - On Vercel (Linux Serverless): strictly "file:///tmp/dev.db" (three-slash absolute path).
 * - On Local Development: "prisma/dev.db".
 */
function getDatabaseConfig(): { dbPath: string; dbUrl: string } {
  if (isVercel) {
    const dbPath = "/tmp/dev.db";
    return {
      dbPath,
      dbUrl: "file:///tmp/dev.db",
    };
  }

  const localPath = path.join(process.cwd(), "prisma", "dev.db");
  const localUrl = process.env.DATABASE_URL || `file:${localPath.replace(/\\/g, "/")}`;
  return {
    dbPath: localPath,
    dbUrl: localUrl,
  };
}

const { dbPath, dbUrl } = getDatabaseConfig();

// Ensure process.env.DATABASE_URL is set before PrismaClient initialization
process.env.DATABASE_URL = dbUrl;

/**
 * Prepares the SQLite database directory and touches the file if needed.
 * Safe for serverless cold starts.
 */
function prepareDatabaseFile(): void {
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (isVercel && !fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, "");
    }
  } catch (err) {
    console.error("Error preparing SQLite database file on disk:", err);
  }
}

// Initial filesystem check
prepareDatabaseFile();

/**
 * Singleton PrismaClient instance
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Programmatic SQLite DDL Statements.
 * Safely provisions all 8 relational tables and indexes without CLI dependencies.
 */
const DDL_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL DEFAULT 'demo1234',
    "role" TEXT NOT NULL DEFAULT 'student',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");`,

  `CREATE TABLE IF NOT EXISTS "Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'full',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Course_code_key" ON "Course"("code");`,

  `CREATE TABLE IF NOT EXISTS "Topic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,
    "topicName" TEXT NOT NULL,
    "subtopicName" TEXT NOT NULL,
    "syllabusRequired" BOOLEAN NOT NULL DEFAULT 1,
    "inNotes" BOOLEAN NOT NULL DEFAULT 1,
    "examFrequency" INTEGER NOT NULL DEFAULT 1,
    "examMarksAvg" REAL NOT NULL DEFAULT 10.0,
    "prerequisiteIds" TEXT NOT NULL DEFAULT '[]',
    "alpha" REAL NOT NULL DEFAULT 1.0,
    "beta" REAL NOT NULL DEFAULT 1.0,
    "estimatedMastery" REAL NOT NULL DEFAULT 0.5,
    "revisionPriority" REAL NOT NULL DEFAULT 0.5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Topic_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS "Topic_courseId_idx" ON "Topic"("courseId");`,

  `CREATE TABLE IF NOT EXISTS "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS "Document_courseId_idx" ON "Document"("courseId");`,

  `CREATE TABLE IF NOT EXISTS "DocumentChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "topicId" TEXT,
    "section" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" TEXT,
    "tokenCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentChunk_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS "DocumentChunk_documentId_idx" ON "DocumentChunk"("documentId");`,
  `CREATE INDEX IF NOT EXISTS "DocumentChunk_topicId_idx" ON "DocumentChunk"("topicId");`,

  `CREATE TABLE IF NOT EXISTS "QuizQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topicId" TEXT NOT NULL,
    "chunkId" TEXT,
    "question" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "correctAnswerIndex" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,
    "quoteCitation" TEXT NOT NULL,
    "quoteVerified" BOOLEAN NOT NULL DEFAULT 1,
    "quoteMatchOffset" INTEGER NOT NULL DEFAULT 0,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuizQuestion_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuizQuestion_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "DocumentChunk" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS "QuizQuestion_topicId_idx" ON "QuizQuestion"("topicId");`,
  `CREATE INDEX IF NOT EXISTS "QuizQuestion_chunkId_idx" ON "QuizQuestion"("chunkId");`,

  `CREATE TABLE IF NOT EXISTS "QuizAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedAnswerIndex" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "oldAlpha" REAL NOT NULL,
    "oldBeta" REAL NOT NULL,
    "newAlpha" REAL NOT NULL,
    "newBeta" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuizAttempt_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuizAttempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS "QuizAttempt_userId_idx" ON "QuizAttempt"("userId");`,
  `CREATE INDEX IF NOT EXISTS "QuizAttempt_topicId_idx" ON "QuizAttempt"("topicId");`,

  `CREATE TABLE IF NOT EXISTS "RevisionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "priorityScore" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 45,
    "order" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RevisionItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RevisionItem_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS "RevisionItem_userId_idx" ON "RevisionItem"("userId");`,
  `CREATE INDEX IF NOT EXISTS "RevisionItem_topicId_idx" ON "RevisionItem"("topicId");`,
];

/**
 * Creates all SQLite tables programmatically via raw DDL statements.
 * Completely avoids npx/CLI execution which fails in serverless environments.
 */
async function ensureSchemaTables(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe("PRAGMA foreign_keys = ON;");
    await prisma.$executeRawUnsafe("PRAGMA busy_timeout = 5000;");
  } catch (err) {
    // Non-fatal pragma setup
  }

  for (const statement of DDL_STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(statement);
    } catch (err) {
      // Table or index may already exist; safe to continue
    }
  }
}

/**
 * Topic Revision Data Structure
 */
export interface TopicRevisionData {
  id: string;
  topicName: string;
  subtopicName: string;
  unitName: string;
  mastery: number;
  alpha: number;
  beta: number;
  examFrequency: number;
  examMarksAvg: number;
  prerequisiteIds: string[];
  isPrerequisiteFor?: string[];
  inNotes: boolean;
  syllabusRequired: boolean;
  totalAttempts?: number;
  chunkLengthMinutes?: number;
}

export type MaterialScope = "notes_only" | "notes_syllabus" | "full";

export interface RevisionScheduleItem {
  topicId: string;
  topicName: string;
  subtopicName: string;
  unitName: string;
  mastery: number;
  gapDeficit: number;
  examWeight: number;
  prerequisiteBoost: number;
  priorityScore: number;
  recommendedMinutes: number;
  rationale: string;
  isUncovered: boolean;
  category: "weak" | "medium" | "strong" | "unassessed";
  rank: number;
  status?: string;
  isBaselinePlan: boolean;
}

/**
 * Deterministic Revision Schedule Helper Function.
 * Implements the mathematical formula:
 * Priority = (1 - Mastery) * Exam Weight * Prerequisite Boost
 */
export function calculateDeterministicRevisionSchedule(
  topics: TopicRevisionData[],
  scope: MaterialScope = "full"
): RevisionScheduleItem[] {
  // 1. Build Dependency Map
  const dependentCountMap: Record<string, string[]> = {};
  topics.forEach((t) => {
    t.prerequisiteIds.forEach((prereqId) => {
      if (!dependentCountMap[prereqId]) {
        dependentCountMap[prereqId] = [];
      }
      dependentCountMap[prereqId].push(t.id);
    });
  });

  // 2. Compute Raw Exam Weights based on material scope
  const rawWeights: Record<string, number> = {};
  let maxRawWeight = 1.0;

  topics.forEach((t) => {
    if (scope === "notes_only") {
      rawWeights[t.id] = 1.0;
    } else if (scope === "notes_syllabus") {
      rawWeights[t.id] = t.syllabusRequired ? 1.5 : 1.0;
    } else {
      const score = Math.max(1, t.examFrequency * t.examMarksAvg);
      rawWeights[t.id] = score;
      if (score > maxRawWeight) maxRawWeight = score;
    }
  });

  // 3. Compute Schedule Items
  const results: RevisionScheduleItem[] = topics.map((t) => {
    const isTopicAssessed =
      (t.totalAttempts && t.totalAttempts > 0) || t.alpha !== 1 || t.beta !== 1;
    const gapDeficit = Math.max(0.05, 1.0 - t.mastery);

    let normalizedExamWeight = 1.0;
    if (scope === "full") {
      normalizedExamWeight = 0.8 + (rawWeights[t.id] / maxRawWeight) * 1.7;
    } else if (scope === "notes_syllabus") {
      normalizedExamWeight = rawWeights[t.id];
    }

    const downstreamTopicIds = dependentCountMap[t.id] || [];
    let prereqBoost = 1.0;

    if (downstreamTopicIds.length > 0) {
      let downstreamWeaknessSum = 0;
      downstreamTopicIds.forEach((downId) => {
        const downTopic = topics.find((dt) => dt.id === downId);
        if (downTopic) {
          downstreamWeaknessSum += Math.max(0, 1.0 - downTopic.mastery);
        }
      });
      prereqBoost = 1.0 + Math.min(0.7, 0.25 * downstreamWeaknessSum);
    }

    const priorityScore = gapDeficit * normalizedExamWeight * prereqBoost;
    const baseMinutes = t.chunkLengthMinutes || 25;
    const recommendedMinutes = isTopicAssessed
      ? Math.min(120, Math.round(20 + priorityScore * 35))
      : baseMinutes;

    const isUncovered = t.syllabusRequired && !t.inNotes;

    let category: "weak" | "medium" | "strong" | "unassessed" = "unassessed";
    if (!isTopicAssessed) {
      category = "unassessed";
    } else if (t.mastery < 0.5) {
      category = "weak";
    } else if (t.mastery <= 0.75) {
      category = "medium";
    } else {
      category = "strong";
    }

    let rationale = "";
    if (isUncovered) {
      rationale = "CRITICAL SYLLABUS GAP: Required on exam but completely absent from your uploaded notes!";
    } else if (!isTopicAssessed) {
      rationale = `Baseline Reading Step: Estimated ~${recommendedMinutes} min reading sequence. Diagnostic quiz pending.`;
    } else if (category === "weak") {
      rationale = `DIAGNOSED WEAK GAP (${Math.round(t.mastery * 100)}% mastery). Prioritized by formula: high gap × exam weight.`;
    } else if (downstreamTopicIds.length > 0 && prereqBoost > 1.1) {
      rationale = `Prerequisite Foundation for ${downstreamTopicIds.length} downstream topics. Prereq boost: ${prereqBoost.toFixed(2)}x.`;
    } else {
      rationale = `Reinforcement review (${Math.round(t.mastery * 100)}% mastery). Calibrated for retention.`;
    }

    return {
      topicId: t.id,
      topicName: t.topicName,
      subtopicName: t.subtopicName,
      unitName: t.unitName,
      mastery: t.mastery,
      gapDeficit,
      examWeight: normalizedExamWeight,
      prerequisiteBoost: prereqBoost,
      priorityScore,
      recommendedMinutes,
      rationale,
      isUncovered,
      category,
      rank: 0,
      isBaselinePlan: !isTopicAssessed,
    };
  });

  // Sort schedule items
  results.sort((a, b) => {
    // 1. Critical uncovered syllabus gaps always lead
    if (a.isUncovered && !b.isUncovered) return -1;
    if (!a.isUncovered && b.isUncovered) return 1;

    // 2. Diagnosed weak topics jump ahead of unassessed topics
    const aAssessed = a.category !== "unassessed";
    const bAssessed = b.category !== "unassessed";

    if (aAssessed && !bAssessed) {
      return a.category === "weak" ? -1 : 1;
    }
    if (!aAssessed && bAssessed) {
      return b.category === "weak" ? 1 : -1;
    }

    // 3. If both assessed, sort descending by Priority Score
    if (aAssessed && bAssessed) {
      return b.priorityScore - a.priorityScore;
    }

    // 4. Baseline Mode: Curriculum unit order
    return a.unitName.localeCompare(b.unitName) || a.topicName.localeCompare(b.topicName);
  });

  // Assign 1-indexed ranks
  results.forEach((item, index) => {
    item.rank = index + 1;
  });

  return results;
}

/**
 * Gracefully ensures the database schema exists and auto-seeds the CS301 curriculum.
 * Safe for concurrent cold starts.
 */
export async function ensureDatabaseSeeded(): Promise<void> {
  if (globalForPrisma.dbInitialized) {
    return;
  }
  if (globalForPrisma.initializationPromise) {
    return globalForPrisma.initializationPromise;
  }

  globalForPrisma.initializationPromise = (async () => {
    try {
      prepareDatabaseFile();
      await ensureSchemaTables();

      const existingUser = await prisma.user.findUnique({
        where: { email: "judge.demo@gapfinder.ai" },
      });

      if (existingUser) {
        const qCount = await prisma.quizQuestion.count();
        if (qCount < DEMO_DATA.sampleQuestions.length) {
          await prisma.quizQuestion.deleteMany({});
          for (const q of DEMO_DATA.sampleQuestions) {
            await prisma.quizQuestion.create({
              data: {
                topicId: q.topicId,
                chunkId: q.chunkId,
                question: q.question,
                options: JSON.stringify(q.options),
                correctAnswerIndex: q.correctAnswerIndex,
                explanation: q.explanation,
                quoteCitation: q.quoteCitation,
                quoteVerified: true,
                quoteMatchOffset: 0,
                difficulty: q.difficulty,
              },
            });
          }
        }
        globalForPrisma.dbInitialized = true;
        return;
      }

      console.log("⚡ Auto-seeding GapFinder AI database with CS301 curriculum...");

      // 1. Create Judge Demo User
      const user = await prisma.user.create({
        data: {
          id: "user-judge-demo",
          email: "judge.demo@gapfinder.ai",
          name: "Honorable Judge / Evaluator",
          password: "demo1234",
          role: "evaluator",
        },
      });

      // 2. Create Course
      const course = await prisma.course.create({
        data: {
          id: DEMO_DATA.course.id,
          code: DEMO_DATA.course.code,
          title: DEMO_DATA.course.title,
          description: DEMO_DATA.course.description,
          scope: "full",
        },
      });

      // 3. Create Documents
      await prisma.document.create({
        data: {
          id: "doc-notes-cs301",
          courseId: course.id,
          title: "CS301 Lecture Notes & Architecture Guide",
          type: "notes",
          fileName: "CS301_Notes_Distributed_Systems.pdf",
          fileSize: 412000,
        },
      });

      await prisma.document.create({
        data: {
          id: "doc-syllabus-cs301",
          courseId: course.id,
          title: "Official CS301 Course Syllabus & Learning Outcomes",
          type: "syllabus",
          fileName: "CS301_Syllabus_Fall2026.pdf",
          fileSize: 184000,
        },
      });

      await prisma.document.create({
        data: {
          id: "doc-pastpaper-cs301",
          courseId: course.id,
          title: "CS301 Past Exam Papers (2022-2025 Compilation)",
          type: "past_paper",
          fileName: "CS301_Past_Papers_Cumulative.pdf",
          fileSize: 520000,
        },
      });

      // 4. Create Topics (Initialized as Unassessed / Pending Diagnostic: alpha=1.0, beta=1.0)
      for (const t of DEMO_DATA.topics) {
        await prisma.topic.create({
          data: {
            id: t.id,
            courseId: course.id,
            unitName: t.unitName,
            topicName: t.topicName,
            subtopicName: t.subtopicName,
            syllabusRequired: t.syllabusRequired,
            inNotes: t.inNotes,
            examFrequency: t.examFrequency,
            examMarksAvg: t.examMarksAvg,
            prerequisiteIds: JSON.stringify(t.prerequisiteIds),
            alpha: 1.0,
            beta: 1.0,
            estimatedMastery: 0.5,
            revisionPriority: 0.5,
          },
        });
      }

      // 5. Create Document Chunks
      for (const chunk of DEMO_DATA.chunks) {
        await prisma.documentChunk.create({
          data: {
            id: chunk.id,
            documentId: chunk.documentId,
            topicId: chunk.topicId,
            section: chunk.section,
            content: chunk.content,
            tokenCount: chunk.tokenCount,
          },
        });
      }

      // 6. Create Questions
      for (const q of DEMO_DATA.sampleQuestions) {
        await prisma.quizQuestion.create({
          data: {
            topicId: q.topicId,
            chunkId: q.chunkId,
            question: q.question,
            options: JSON.stringify(q.options),
            correctAnswerIndex: q.correctAnswerIndex,
            explanation: q.explanation,
            quoteCitation: q.quoteCitation,
            quoteVerified: true,
            quoteMatchOffset: 0,
            difficulty: q.difficulty,
          },
        });
      }

      // 7. Calculate and insert baseline revision schedule
      const schedule = calculateDeterministicRevisionSchedule(DEMO_DATA.topics, "full");
      for (let i = 0; i < schedule.length; i++) {
        const item = schedule[i];
        await prisma.revisionItem.create({
          data: {
            userId: user.id,
            topicId: item.topicId,
            priorityScore: item.priorityScore,
            status: "todo",
            estimatedMinutes: item.recommendedMinutes,
            order: item.rank,
          },
        });
      }

      globalForPrisma.dbInitialized = true;
      console.log("✅ Auto-seeding completed with baseline unassessed state!");
    } catch (error) {
      console.error("Database initialization / seeding error:", error);
      globalForPrisma.initializationPromise = undefined;
      throw error;
    }
  })();

  return globalForPrisma.initializationPromise;
}

/**
 * Resets the demo course state to baseline unassessed state.
 * Allows judges to experience the diagnostic flow repeatedly.
 */
export async function resetDemoCourseState(userId: string = "user-judge-demo"): Promise<void> {
  try {
    await ensureDatabaseSeeded();

    await prisma.quizAttempt.deleteMany({
      where: { userId },
    });

    for (const t of DEMO_DATA.topics) {
      const existing = await prisma.topic.findUnique({ where: { id: t.id } });
      if (existing) {
        await prisma.topic.update({
          where: { id: t.id },
          data: {
            alpha: 1.0,
            beta: 1.0,
            estimatedMastery: 0.5,
            inNotes: t.inNotes,
            syllabusRequired: t.syllabusRequired,
          },
        });
      }
    }

    const schedule = calculateDeterministicRevisionSchedule(DEMO_DATA.topics, "full");
    for (const item of schedule) {
      const existingRev = await prisma.revisionItem.findFirst({
        where: { userId, topicId: item.topicId },
      });

      if (existingRev) {
        await prisma.revisionItem.update({
          where: { id: existingRev.id },
          data: {
            priorityScore: item.priorityScore,
            status: "todo",
            estimatedMinutes: item.recommendedMinutes,
            order: item.rank,
          },
        });
      } else {
        await prisma.revisionItem.create({
          data: {
            userId,
            topicId: item.topicId,
            priorityScore: item.priorityScore,
            status: "todo",
            estimatedMinutes: item.recommendedMinutes,
            order: item.rank,
          },
        });
      }
    }
  } catch (err) {
    console.error("Error resetting demo course state:", err);
  }
}
