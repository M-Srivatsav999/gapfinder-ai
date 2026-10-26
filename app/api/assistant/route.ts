import { NextResponse } from "next/server";
import { prisma, ensureDatabaseSeeded } from "@/lib/db";
import { hybridSearch, IndexedChunk } from "@/lib/rag-search";
import { generateGroundedChatAnswer } from "@/lib/ollama";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await ensureDatabaseSeeded();
    const body = await req.json();
    const { query, forceRefusal } = body;

    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    // Load chunks from SQLite
    const chunks = await prisma.documentChunk.findMany({
      include: {
        document: true,
        topic: true,
      },
    });

    const indexedChunks: IndexedChunk[] = chunks.map((c) => ({
      id: c.id,
      documentId: c.documentId,
      documentTitle: c.document?.title || "Course Material",
      sourceType: (c.document?.type as any) || "notes",
      unitName: c.topic?.unitName || "Unit",
      topicId: c.topicId || "general",
      topicName: c.topic?.topicName || "Topic",
      section: c.section,
      content: c.content,
      tokenCount: c.tokenCount,
    }));

    // Perform Hybrid RAG Search (BM25 + Cosine Similarity)
    const searchResults = hybridSearch(query, indexedChunks, 3);
    const candidateChunks = searchResults.map((r) => r.chunk);

    // Generate Grounded Response with Deterministic Quote Gate
    const chatResult = await generateGroundedChatAnswer(
      query,
      candidateChunks,
      Boolean(forceRefusal)
    );

    return NextResponse.json({
      query,
      response: chatResult.answer,
      isOutOfSyllabusRefusal: chatResult.isOutOfSyllabusRefusal,
      citedChunks: chatResult.citedChunks,
      retrievedChunksCount: candidateChunks.length,
      topSearchResults: searchResults.map((r) => ({
        docTitle: r.chunk.documentTitle,
        section: r.chunk.section,
        hybridScore: Number(r.hybridScore.toFixed(3)),
        bm25Score: Number(r.bm25Score.toFixed(2)),
        cosineScore: Number(r.cosineScore.toFixed(3)),
        snippet: r.snippet,
      })),
    });
  } catch (error: any) {
    console.error("Assistant API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
