import { NextResponse } from "next/server";
import { prisma, ensureDatabaseSeeded } from "@/lib/db";
import { generateDiagnosticQuestion } from "@/lib/ollama";
import { verifyQuoteInChunk } from "@/lib/quote-gate";
import { IndexedChunk } from "@/lib/rag-search";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await ensureDatabaseSeeded();
    const { searchParams } = new URL(req.url);
    const requestedTopicId = searchParams.get("topicId");

    // 1. Fetch target topic
    let targetTopic;
    if (requestedTopicId) {
      targetTopic = await prisma.topic.findUnique({
        where: { id: requestedTopicId },
        include: { chunks: { include: { document: true } } },
      });
    } else {
      // Pick unassessed topic with chunks, or topic with lowest mastery
      targetTopic = await prisma.topic.findFirst({
        where: {
          inNotes: true,
          chunks: { some: {} },
        },
        orderBy: [{ alpha: "asc" }, { estimatedMastery: "asc" }],
        include: { chunks: { include: { document: true } } },
      });
    }

    if (!targetTopic || targetTopic.chunks.length === 0) {
      targetTopic = await prisma.topic.findFirst({
        where: { chunks: { some: {} } },
        include: { chunks: { include: { document: true } } },
      });
    }

    if (!targetTopic || targetTopic.chunks.length === 0) {
      return NextResponse.json(
        { error: "No document chunks available to ground questions." },
        { status: 404 }
      );
    }

    const chunk = targetTopic.chunks[0];
    const indexedChunk: IndexedChunk = {
      id: chunk.id,
      documentId: chunk.documentId,
      documentTitle: chunk.document?.title || "Course Material",
      sourceType: (chunk.document?.type as any) || "notes",
      unitName: targetTopic.unitName,
      topicId: targetTopic.id,
      topicName: targetTopic.topicName,
      section: chunk.section,
      content: chunk.content,
      tokenCount: chunk.tokenCount,
    };

    // 2. Fetch existing questions for this topic (up to 5)
    let questions = await prisma.quizQuestion.findMany({
      where: { topicId: targetTopic.id },
      include: { chunk: { include: { document: true } } },
      take: 5,
    });

    // If fewer than 5, generate additional grounded questions
    while (questions.length < 5) {
      const generated = await generateDiagnosticQuestion(targetTopic.topicName, indexedChunk);
      const createdQ = await prisma.quizQuestion.create({
        data: {
          topicId: targetTopic.id,
          chunkId: chunk.id,
          question: generated.question,
          options: JSON.stringify(generated.options),
          correctAnswerIndex: generated.correctAnswerIndex,
          explanation: generated.explanation,
          quoteCitation: generated.quoteCitation,
          quoteVerified: generated.quoteVerification.verified,
          quoteMatchOffset: generated.quoteVerification.matchOffset,
          difficulty: generated.difficulty,
        },
        include: { chunk: { include: { document: true } } },
      });
      questions.push(createdQ);
    }

    // 3. Map questions with Quote Gate verification
    const mappedQuestions = questions.slice(0, 5).map((q) => {
      const options = JSON.parse(q.options);
      const currentChunkContent = q.chunk?.content || chunk.content;
      const verification = verifyQuoteInChunk(
        q.quoteCitation,
        currentChunkContent,
        q.chunkId || chunk.id,
        q.chunk?.document?.title || chunk.document?.title,
        q.chunk?.section || chunk.section
      );

      return {
        id: q.id,
        question: q.question,
        options,
        quoteCitation: q.quoteCitation,
        quoteVerification: verification,
        sourceDocTitle: q.chunk?.document?.title || chunk.document?.title || "CS301 Notes",
        sourceSection: q.chunk?.section || chunk.section,
        chunkContent: currentChunkContent,
        difficulty: q.difficulty,
      };
    });

    return NextResponse.json({
      topicId: targetTopic.id,
      topicName: targetTopic.topicName,
      unitName: targetTopic.unitName,
      currentAlpha: targetTopic.alpha,
      currentBeta: targetTopic.beta,
      currentMastery: targetTopic.estimatedMastery,
      totalSessionQuestions: 5,
      questions: mappedQuestions,
    });
  } catch (error: any) {
    console.error("Quiz GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
