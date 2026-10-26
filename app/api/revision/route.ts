import { NextResponse } from "next/server";
import { prisma, ensureDatabaseSeeded } from "@/lib/db";
import { calculateDeterministicRevisionSchedule, MaterialScope } from "@/lib/revision-formula";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDatabaseSeeded();

    const course = await prisma.course.findFirst();
    const scope = (course?.scope as MaterialScope) || "full";

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

    const schedule = calculateDeterministicRevisionSchedule(mappedTopics, scope);

    // Fetch user status for revision items
    const user = await prisma.user.findFirst();
    const userRevisionItems = user
      ? await prisma.revisionItem.findMany({ where: { userId: user.id } })
      : [];

    const statusMap = new Map(userRevisionItems.map((r) => [r.topicId, r.status]));

    const enrichedSchedule = schedule.map((item) => ({
      ...item,
      status: statusMap.get(item.topicId) || (item.mastery > 0.75 ? "mastered" : "todo"),
    }));

    // Calculate aggregated metrics
    const totalStudyHours = (
      enrichedSchedule.reduce((acc, curr) => acc + curr.recommendedMinutes, 0) / 60
    ).toFixed(1);
    const criticalGapsCount = enrichedSchedule.filter((item) => item.category === "weak" || item.isUncovered).length;
    const masteredCount = enrichedSchedule.filter((item) => item.status === "mastered" || item.mastery > 0.75).length;

    return NextResponse.json({
      scope,
      schedule: enrichedSchedule,
      metrics: {
        totalStudyHours,
        criticalGapsCount,
        masteredCount,
        totalItems: enrichedSchedule.length,
      },
    });
  } catch (error: any) {
    console.error("Revision GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Toggle status of a revision item
  try {
    await ensureDatabaseSeeded();
    const { topicId, status } = await req.json();

    const user = await prisma.user.findFirst();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const item = await prisma.revisionItem.findFirst({
      where: { userId: user.id, topicId },
    });

    if (item) {
      const updated = await prisma.revisionItem.update({
        where: { id: item.id },
        data: { status },
      });
      return NextResponse.json({ success: true, item: updated });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
