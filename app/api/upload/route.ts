import { NextResponse } from "next/server";
import { prisma, ensureDatabaseSeeded } from "@/lib/db";
import { calculateDeterministicRevisionSchedule, MaterialScope } from "@/lib/revision-formula";
import { generateLocalEmbedding } from "@/lib/rag-search";

export const dynamic = "force-dynamic";

/**
 * Splits text into semantic chunks (~400 tokens / ~1600 characters)
 */
function createSemanticChunks(rawText: string, defaultSection: string) {
  const paragraphs = rawText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20);

  const chunks: { section: string; content: string; tokenCount: number }[] = [];
  let currentContent = "";
  let currentSection = defaultSection;

  for (const para of paragraphs) {
    // Detect markdown headings
    if (para.startsWith("#")) {
      const headingText = para.replace(/^#+\s*/, "").split("\n")[0];
      if (headingText.length > 2) {
        currentSection = headingText.slice(0, 80);
      }
    }

    if ((currentContent + "\n\n" + para).length > 1600 && currentContent.length > 0) {
      chunks.push({
        section: currentSection,
        content: currentContent.trim(),
        tokenCount: Math.round(currentContent.length / 4),
      });
      currentContent = para;
    } else {
      currentContent = currentContent ? `${currentContent}\n\n${para}` : para;
    }
  }

  if (currentContent.trim().length > 0) {
    chunks.push({
      section: currentSection,
      content: currentContent.trim(),
      tokenCount: Math.round(currentContent.length / 4),
    });
  }

  return chunks;
}

export async function POST(req: Request) {
  try {
    await ensureDatabaseSeeded();

    let title = "";
    let type: "notes" | "syllabus" | "past_paper" = "notes";
    let fileContent = "";
    let fileName = "";
    let fileSize = 0;
    let explicitTopicName = "";
    let unitName = "Uploaded Material";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      type = (formData.get("type") as any) || "notes";
      explicitTopicName = (formData.get("topicName") as string) || "";
      unitName = (formData.get("unitName") as string) || "Uploaded Material";
      title = (formData.get("title") as string) || (file ? file.name : "Uploaded Document");

      if (!file) {
        return NextResponse.json({ error: "No file provided in form data." }, { status: 400 });
      }

      fileName = file.name;
      fileSize = file.size;

      // Extract text based on file format
      if (fileName.toLowerCase().endsWith(".pdf")) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const pdfParse = require("pdf-parse");
          const pdfData = await pdfParse(buffer);
          fileContent = pdfData.text || "";
        } catch (pdfErr) {
          console.warn("pdf-parse error, falling back to text stream reader:", pdfErr);
          fileContent = await file.text();
        }
      } else {
        fileContent = await file.text();
      }
    } else {
      // JSON body support
      const body = await req.json();
      title = body.title || "Uploaded Document";
      type = body.type || "notes";
      fileContent = body.content || "";
      fileName = `${title.replace(/\s+/g, "_")}.txt`;
      fileSize = fileContent.length;
      explicitTopicName = body.topicName || "";
      unitName = body.unitName || "Uploaded Material";
    }

    if (!fileContent || fileContent.trim().length === 0) {
      return NextResponse.json(
        { error: "Uploaded file is empty or contains unreadable text." },
        { status: 400 }
      );
    }

    const course = await prisma.course.findFirst();
    if (!course) return NextResponse.json({ error: "No active course found" }, { status: 404 });

    // 1. Create Document record in SQLite
    const doc = await prisma.document.create({
      data: {
        courseId: course.id,
        title,
        type,
        fileName,
        fileSize,
      },
    });

    // 2. Chunk text semantically (~400 tokens / 1600 chars)
    const rawChunks = createSemanticChunks(fileContent, `Section: ${title}`);

    // 3. Resolve or create Topic
    let topic = null;
    const resolvedTopicName = explicitTopicName || title.replace(/\.[^/.]+$/, "");

    topic = await prisma.topic.findFirst({
      where: { courseId: course.id, topicName: resolvedTopicName },
    });

    if (!topic) {
      topic = await prisma.topic.create({
        data: {
          courseId: course.id,
          unitName,
          topicName: resolvedTopicName,
          subtopicName: `Concepts extracted from ${fileName}`,
          syllabusRequired: type === "syllabus",
          inNotes: type === "notes",
          examFrequency: type === "past_paper" ? 3 : 1,
          examMarksAvg: type === "past_paper" ? 14 : 10,
          alpha: 1.0,
          beta: 1.0,
          estimatedMastery: 0.5,
          revisionPriority: 0.5,
        },
      });
    } else {
      // Update topic status based on incoming document type
      if (type === "notes") {
        await prisma.topic.update({
          where: { id: topic.id },
          data: { inNotes: true },
        });
      } else if (type === "syllabus") {
        await prisma.topic.update({
          where: { id: topic.id },
          data: { syllabusRequired: true },
        });
      } else if (type === "past_paper") {
        await prisma.topic.update({
          where: { id: topic.id },
          data: {
            examFrequency: topic.examFrequency + 2,
            examMarksAvg: 12.0,
          },
        });
      }
    }

    // 4. Save Chunks with local dense vectors into SQLite
    for (const chunk of rawChunks) {
      const vector = generateLocalEmbedding(chunk.content, 64);
      await prisma.documentChunk.create({
        data: {
          documentId: doc.id,
          topicId: topic.id,
          section: chunk.section,
          content: chunk.content,
          embedding: JSON.stringify(vector),
          tokenCount: chunk.tokenCount,
        },
      });
    }

    // 5. Recalibrate revision schedule
    const allTopics = await prisma.topic.findMany();
    const mappedTopics = allTopics.map((t) => ({
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

    const newSchedule = calculateDeterministicRevisionSchedule(
      mappedTopics,
      (course.scope as MaterialScope) || "full"
    );

    return NextResponse.json({
      success: true,
      message: `Successfully processed "${fileName}" into ${rawChunks.length} semantic chunks.`,
      documentId: doc.id,
      topicId: topic.id,
      topicName: topic.topicName,
      chunksIndexed: rawChunks.length,
      scopeApplied: course.scope,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
