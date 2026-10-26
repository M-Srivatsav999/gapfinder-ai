import { NextResponse } from "next/server";
import { prisma, ensureDatabaseSeeded, resetDemoCourseState } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await ensureDatabaseSeeded();

    const judgeEmail = "judge.demo@gapfinder.ai";
    const user = await prisma.user.findUnique({
      where: { email: judgeEmail },
    });

    // Reset to baseline unassessed state so judges experience the clean 4-step diagnostic flow
    if (user) {
      await resetDemoCourseState(user.id);
    }

    setSessionCookie(judgeEmail);

    return NextResponse.json({
      success: true,
      user: {
        id: user?.id || "user-judge-demo",
        name: user?.name || "Honorable Judge / Evaluator",
        email: judgeEmail,
        role: "evaluator",
      },
      message: "Authenticated as Judge Demo. Initialized in Step 1: Baseline Reading State.",
    });
  } catch (error: any) {
    console.error("Judge login error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
