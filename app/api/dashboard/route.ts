import { NextResponse } from "next/server";
import { prisma, ensureDatabaseSeeded } from "@/lib/db";
import { calculateMastery, BayesianMasteryState } from "@/lib/bayesian";
import { calculateDeterministicRevisionSchedule, MaterialScope } from "@/lib/revision-formula";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDatabaseSeeded();

    const course = await prisma.course.findFirst({
      include: {
        documents: true,
      },
    });

    const topics = await prisma.topic.findMany({
      include: {
        attempts: true,
        chunks: true,
      },
    });

    const scope = (course?.scope as MaterialScope) || "full";

    // Enrich topics with Bayesian statistics and category tags
    const enrichedTopics = topics.map((t) => {
      const parsedPrereqs = JSON.parse(t.prerequisiteIds || "[]");
      const masteryStats: BayesianMasteryState = calculateMastery(
        t.alpha,
        t.beta,
        t.attempts.length
      );

      const isUncovered = t.syllabusRequired && !t.inNotes;

      return {
        id: t.id,
        courseId: t.courseId,
        unitName: t.unitName,
        topicName: t.topicName,
        subtopicName: t.subtopicName,
        syllabusRequired: t.syllabusRequired,
        inNotes: t.inNotes,
        isUncovered,
        examFrequency: t.examFrequency,
        examMarksAvg: t.examMarksAvg,
        prerequisiteIds: parsedPrereqs,
        alpha: t.alpha,
        beta: t.beta,
        estimatedMastery: masteryStats.expectedMastery,
        masteryStats,
        attemptsCount: t.attempts.length,
        chunkCount: t.chunks.length,
      };
    });

    // Group into Units -> Topics -> Subtopics hierarchy
    const unitsMap: Record<string, typeof enrichedTopics> = {};
    enrichedTopics.forEach((t) => {
      if (!unitsMap[t.unitName]) {
        unitsMap[t.unitName] = [];
      }
      unitsMap[t.unitName].push(t);
    });

    const unitTree = Object.entries(unitsMap).map(([unitName, unitTopics]) => {
      const avgMastery =
        unitTopics.reduce((acc, curr) => acc + curr.estimatedMastery, 0) /
        (unitTopics.length || 1);
      const uncoveredCount = unitTopics.filter((t) => t.isUncovered).length;
      const weakCount = unitTopics.filter((t) => t.masteryStats.category === "weak").length;

      return {
        unitName,
        averageMastery: avgMastery,
        uncoveredCount,
        weakCount,
        topics: unitTopics,
      };
    });

    // Calculate overall stats
    const totalTopics = enrichedTopics.length;
    const weakTopicsCount = enrichedTopics.filter(
      (t) => t.masteryStats.category === "weak"
    ).length;
    const mediumTopicsCount = enrichedTopics.filter(
      (t) => t.masteryStats.category === "medium"
    ).length;
    const strongTopicsCount = enrichedTopics.filter(
      (t) => t.masteryStats.category === "strong"
    ).length;
    const uncoveredTopicsCount = enrichedTopics.filter((t) => t.isUncovered).length;

    const overallMastery =
      enrichedTopics.reduce((sum, t) => sum + t.estimatedMastery, 0) / (totalTopics || 1);

    // Compute revision schedule preview
    const mappedForSchedule = enrichedTopics.map((t) => ({
      id: t.id,
      topicName: t.topicName,
      subtopicName: t.subtopicName,
      unitName: t.unitName,
      mastery: t.estimatedMastery,
      alpha: t.alpha,
      beta: t.beta,
      examFrequency: t.examFrequency,
      examMarksAvg: t.examMarksAvg,
      prerequisiteIds: t.prerequisiteIds,
      inNotes: t.inNotes,
      syllabusRequired: t.syllabusRequired,
    }));
    const schedule = calculateDeterministicRevisionSchedule(mappedForSchedule, scope);

    return NextResponse.json({
      course,
      scope,
      metrics: {
        overallMastery,
        totalTopics,
        weakTopicsCount,
        mediumTopicsCount,
        strongTopicsCount,
        uncoveredTopicsCount,
        assessedCount: enrichedTopics.filter((t) => t.attemptsCount > 0 || t.alpha !== 1 || t.beta !== 1).length,
      },
      unitTree,
      topics: enrichedTopics,
      schedule,
    });
  } catch (error: any) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
