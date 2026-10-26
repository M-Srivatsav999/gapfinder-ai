import { NextResponse } from "next/server";
import { prisma, ensureDatabaseSeeded } from "@/lib/db";
import { checkOllamaStatus } from "@/lib/ollama";
import { getCurrentUser, setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDatabaseSeeded();

    const user = await getCurrentUser();

    const course = await prisma.course.findFirst({
      include: {
        documents: true,
      },
    });

    const ollama = await checkOllamaStatus();

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        course: null,
        ollama,
        scope: "full",
      });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      course: course || {
        id: "course-cs301",
        code: "CS301",
        title: "Distributed Systems & Cloud Architecture",
        scope: "full",
        documents: [],
      },
      ollama,
      scope: course?.scope || "full",
    });
  } catch (error: any) {
    console.error("Session GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() {
  // 1-Click Judge Demo Login
  try {
    await ensureDatabaseSeeded();

    const judgeEmail = "judge.demo@gapfinder.ai";
    const user = await prisma.user.findUnique({
      where: { email: judgeEmail },
    });

    setSessionCookie(judgeEmail);

    return NextResponse.json({
      success: true,
      authenticated: true,
      message: "Logged in as Judge Demo (judge.demo@gapfinder.ai)",
      user: {
        id: user?.id || "user-judge-demo",
        name: user?.name || "Honorable Judge / Evaluator",
        email: judgeEmail,
        role: "evaluator",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
