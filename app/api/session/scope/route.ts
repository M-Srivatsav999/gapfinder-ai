import { NextResponse } from "next/server";
import { prisma, ensureDatabaseSeeded } from "@/lib/db";
import { calculateDeterministicRevisionSchedule, MaterialScope } from "@/lib/revision-formula";

export async function POST(req: Request) {
  try {
    await ensureDatabaseSeeded();
    const body = await req.json();
    const scope: MaterialScope = body.scope || "full";

    const course = await prisma.course.findFirst();
    if (course) {
      await prisma.course.update({
        where: { id: course.id },
        data: { scope },
      });
    }

    const topics = await prisma.topic.findMany();
    const mappedTopics = topics.map((t) => ({
      id: t.id,
      topicName: t.topicName,
      subtopicName: t.subtopicName,
      unitName: t.unitName,
      mastery: t.estimatedMastery,
      alpha: t.alpha,
      beta: t.beta,
      examFrequency: t.examFrequency,
      examMarksAvg: t.examMarksAvg,
      prerequisiteIds: JSON.parse(t.prerequisiteIds || "[]"),
      inNotes: t.inNotes,
      syllabusRequired: t.syllabusRequired,
    }));

    const newSchedule = calculateDeterministicRevisionSchedule(mappedTopics, scope);

    // Update revision items
    const user = await prisma.user.findFirst();
    if (user) {
      for (const item of newSchedule) {
        const existing = await prisma.revisionItem.findFirst({
          where: { userId: user.id, topicId: item.topicId },
        });

        if (existing) {
          await prisma.revisionItem.update({
            where: { id: existing.id },
            data: {
              priorityScore: item.priorityScore,
              order: item.rank,
              estimatedMinutes: item.recommendedMinutes,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      scope,
      message: `Material Scope successfully updated to: ${scope}`,
      scheduleCount: newSchedule.length,
    });
  } catch (error: any) {
    console.error("Scope update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
