import { NextResponse } from "next/server";
import { prisma, ensureDatabaseSeeded } from "@/lib/db";
import { calculateMastery, updatePosterior } from "@/lib/bayesian";
import { calculateDeterministicRevisionSchedule, MaterialScope } from "@/lib/revision-formula";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await ensureDatabaseSeeded();
    const body = await req.json();

    // Supports single question answer or full session completion
    const { questionId, selectedAnswerIndex, sessionAnswers, topicId } = body;

    const user = await prisma.user.findFirst();
    if (!user) return NextResponse.json({ error: "User session not found" }, { status: 404 });

    // Handle Full 5-Question Session Completion
    if (sessionAnswers && Array.isArray(sessionAnswers) && topicId) {
      const topic = await prisma.topic.findUnique({
        where: { id: topicId },
      });

      if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });

      let correctCount = 0;
      const questionRecords = await prisma.quizQuestion.findMany({
        where: { id: { in: sessionAnswers.map((a: any) => a.questionId) } },
      });

      const questionMap = new Map(questionRecords.map((q) => [q.id, q]));

      // Evaluate all 5 answers
      for (const ans of sessionAnswers) {
        const q = questionMap.get(ans.questionId);
        const isCorrect = q ? ans.selectedAnswerIndex === q.correctAnswerIndex : false;
        if (isCorrect) correctCount++;

        // Store attempt record
        if (q) {
          await prisma.quizAttempt.create({
            data: {
              userId: user.id,
              topicId: topic.id,
              questionId: q.id,
              selectedAnswerIndex: ans.selectedAnswerIndex,
              isCorrect,
              oldAlpha: topic.alpha,
              oldBeta: topic.beta,
              newAlpha: topic.alpha + (isCorrect ? 1 : 0),
              newBeta: topic.beta + (isCorrect ? 0 : 1),
            },
          });
        }
      }

      const totalQuestions = sessionAnswers.length;
      const incorrectCount = totalQuestions - correctCount;

      // Bayesian Beta-Binomial Update for the 5-question trial
      // Prior: alpha, beta -> Posterior: alpha + correctCount, beta + incorrectCount
      const oldAlpha = topic.alpha;
      const oldBeta = topic.beta;
      const newAlpha = oldAlpha + correctCount;
      const newBeta = oldBeta + incorrectCount;

      const masteryStats = calculateMastery(newAlpha, newBeta, totalQuestions);

      // Update topic in SQLite
      await prisma.topic.update({
        where: { id: topic.id },
        data: {
          alpha: newAlpha,
          beta: newBeta,
          estimatedMastery: masteryStats.expectedMastery,
        },
      });

      // Recalculate revision schedule in SQLite
      const course = await prisma.course.findFirst();
      const scope = (course?.scope as MaterialScope) || "full";
      const allTopics = await prisma.topic.findMany();

      const mappedTopics = allTopics.map((t) => ({
        id: t.id,
        topicName: t.topicName,
        subtopicName: t.subtopicName,
        unitName: t.unitName,
        mastery: t.id === topic.id ? masteryStats.expectedMastery : t.estimatedMastery,
        alpha: t.id === topic.id ? newAlpha : t.alpha,
        beta: t.id === topic.id ? newBeta : t.beta,
        examFrequency: t.examFrequency,
        examMarksAvg: t.examMarksAvg,
        prerequisiteIds: JSON.parse(t.prerequisiteIds || "[]"),
        inNotes: t.inNotes,
        syllabusRequired: t.syllabusRequired,
        totalAttempts: t.id === topic.id ? totalQuestions : 0,
      }));

      const updatedSchedule = calculateDeterministicRevisionSchedule(mappedTopics, scope);

      for (const item of updatedSchedule) {
        const existingRev = await prisma.revisionItem.findFirst({
          where: { userId: user.id, topicId: item.topicId },
        });

        if (existingRev) {
          await prisma.revisionItem.update({
            where: { id: existingRev.id },
            data: {
              priorityScore: item.priorityScore,
              order: item.rank,
              estimatedMinutes: item.recommendedMinutes,
              status: item.mastery > 0.75 ? "mastered" : existingRev.status,
            },
          });
        }
      }

      const rankInSchedule = updatedSchedule.find((s) => s.topicId === topic.id)?.rank || 1;

      return NextResponse.json({
        success: true,
        sessionComplete: true,
        totalQuestions,
        correctCount,
        incorrectCount,
        oldAlpha,
        oldBeta,
        newAlpha,
        newBeta,
        oldMastery: topic.estimatedMastery,
        newMastery: masteryStats.expectedMastery,
        newCategory: masteryStats.category,
        topicName: topic.topicName,
        updatedRank: rankInSchedule,
        message: `Diagnostic complete! Mastery evaluated at ${Math.round(masteryStats.expectedMastery * 100)}% (${masteryStats.category.toUpperCase()}).`,
      });
    }

    // Single Question Fallback
    if (!questionId || selectedAnswerIndex === undefined) {
      return NextResponse.json({ error: "Missing questionId or selectedAnswerIndex" }, { status: 400 });
    }

    const question = await prisma.quizQuestion.findUnique({
      where: { id: questionId },
      include: { topic: true },
    });

    if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

    const isCorrect = selectedAnswerIndex === question.correctAnswerIndex;
    const { newAlpha, newBeta, mastery: newMasteryStats } = updatePosterior(
      question.topic.alpha,
      question.topic.beta,
      isCorrect,
      1.0
    );

    return NextResponse.json({
      success: true,
      isCorrect,
      correctAnswerIndex: question.correctAnswerIndex,
      explanation: question.explanation,
      quoteCitation: question.quoteCitation,
      quoteVerified: question.quoteVerified,
      newAlpha,
      newBeta,
      newMastery: newMasteryStats.expectedMastery,
      newCategory: newMasteryStats.category,
    });
  } catch (error: any) {
    console.error("Quiz submit error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
