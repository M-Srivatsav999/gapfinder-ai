import { PrismaClient } from "@prisma/client";
import { DEMO_DATA } from "./seed-data";
import { calculateDeterministicRevisionSchedule } from "./revision-formula";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Resets the demo course state to baseline unassessed state
 * for the 1-Click Judge Demo evaluation.
 */
export async function resetDemoCourseState(userId: string = "user-judge-demo"): Promise<void> {
  try {
    // 1. Delete previous attempts for demo user
    await prisma.quizAttempt.deleteMany({
      where: { userId },
    });

    // 2. Reset topics to baseline unassessed parameters (alpha=1.0, beta=1.0, mastery=0.5)
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

    // 3. Recalculate baseline reading plan items
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

    // 4. Ensure all sample questions are populated in SQLite
    const questionCount = await prisma.quizQuestion.count();
    if (questionCount < DEMO_DATA.sampleQuestions.length) {
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
  } catch (err) {
    console.error("Error resetting demo course state:", err);
  }
}

/**
 * Automatically seeds the local SQLite database if empty.
 */
export async function ensureDatabaseSeeded(): Promise<void> {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: "judge.demo@gapfinder.ai" },
    });

    if (existingUser) {
      // If questions are missing or incomplete, ensure they are seeded
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

    console.log("⚡ Auto-seeding GapFinder AI local SQLite database...");

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

    // 4. Create Topics (initialized as Unassessed / Pending Diagnostic: alpha=1.0, beta=1.0)
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

    console.log("✅ Auto-seeding completed with baseline unassessed state!");
  } catch (error) {
    console.error("Error during auto-seeding:", error);
  }
}
