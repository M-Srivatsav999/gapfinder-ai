import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { DEMO_DATA } from "./seed-data";
import { calculateDeterministicRevisionSchedule } from "./revision-formula";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Check if running on Vercel serverless environment
const isVercel =
  process.env.VERCEL === "1" ||
  Boolean(process.env.VERCEL) ||
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

/**
 * Resolves the appropriate writable SQLite file path and connection URL.
 * On Vercel: strictly file:/tmp/dev.db (the only writable directory).
 * On Local: prisma/dev.db.
 */
function getDatabaseConfig(): { dbPath: string; dbUrl: string } {
  if (isVercel) {
    const dbPath = "/tmp/dev.db";
    return {
      dbPath,
      dbUrl: "file:/tmp/dev.db",
    };
  }

  // Local development
  const localPath = path.join(process.cwd(), "prisma", "dev.db");
  const localUrl = process.env.DATABASE_URL || `file:${localPath.replace(/\\/g, "/")}`;
  return {
    dbPath: localPath,
    dbUrl: localUrl,
  };
}

const { dbPath, dbUrl } = getDatabaseConfig();

// Ensure process.env.DATABASE_URL matches the resolved URL
process.env.DATABASE_URL = dbUrl;

/**
 * Prepares the directory without creating invalid 0-byte files.
 */
function prepareDatabaseFile(): void {
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // If a 0-byte or invalid file exists, remove it so SQLite can recreate it cleanly
    if (fs.existsSync(dbPath) && fs.statSync(dbPath).size === 0) {
      fs.unlinkSync(dbPath);
    }
  } catch (err) {
    console.error("Error preparing database directory:", err);
  }
}

prepareDatabaseFile();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Programmatic DDL statements to create all tables inside /tmp/dev.db
 */
const DDL_STATEMENTS = [
  `PRAGMA journal_mode = WAL;`,
  `PRAGMA foreign_keys = ON;`,
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
    "syllabusRequired" BOOLEAN NOT NULL DEFAULT true,
    "inNotes" BOOLEAN NOT NULL DEFAULT true,
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
  `CREATE TABLE IF NOT EXISTS "QuizQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topicId" TEXT NOT NULL,
    "chunkId" TEXT,
    "question" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "correctAnswerIndex" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,
    "quoteCitation" TEXT NOT NULL,
    "quoteVerified" BOOLEAN NOT NULL DEFAULT true,
    "quoteMatchOffset" INTEGER NOT NULL DEFAULT 0,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuizQuestion_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuizQuestion_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "DocumentChunk" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  );`,
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
];

/**
 * Creates all SQLite tables programmatically via DDL statements.
 */
async function ensureSchemaTables(): Promise<void> {
  for (const sql of DDL_STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e) {
      // Ignore if table/index already exists
    }
  }
}

// Global promise to prevent concurrent initialization race conditions
let initializationPromise: Promise<void> | null = null;

/**
 * Automatically seeds the SQLite database if empty.
 */
export async function ensureDatabaseSeeded(): Promise<void> {
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    try {
      // Ensure all tables exist in SQLite
      await ensureSchemaTables();

      const existingUser = await prisma.user.findUnique({
        where: { email: "judge.demo@gapfinder.ai" },
      });

      if (existingUser) {
        // Ensure all sample questions are populated
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
        return;
      }

      console.log("⚡ Auto-seeding GapFinder AI database...");

      // 1. Create Judge Demo User
      const user = await prisma.user.create({
        data: {
          id: "user-judge-demo",
          email: "judge.demo@gapfinder.ai",
          name: "Honorable Judge / Evaluator",
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

      // 4. Create Topics
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

      console.log("✅ Auto-seeding completed successfully!");
    } catch (error) {
      console.error("Error during auto-seeding:", error);
    }
  })();

  return initializationPromise;
}

/**
 * Resets the demo course state to baseline unassessed state.
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