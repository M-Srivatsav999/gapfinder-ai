import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma, ensureDatabaseSeeded } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const diagnostics: Record<string, any> = {
    env: {
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME,
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL,
      platform: process.platform,
      cwd: process.cwd(),
    },
    files: {},
    dbTest: {},
  };

  // Check candidate database locations
  const candidatePaths = [
    "/tmp/dev.db",
    path.join(process.cwd(), "prisma", "dev.db"),
    path.join(process.cwd(), "dev.db"),
    path.join(__dirname, "..", "prisma", "dev.db"),
  ];

  for (const p of candidatePaths) {
    try {
      const exists = fs.existsSync(p);
      const size = exists ? fs.statSync(p).size : null;
      diagnostics.files[p] = { exists, size };
    } catch (e: any) {
      diagnostics.files[p] = { error: e.message };
    }
  }

  // Test ensureDatabaseSeeded and user query
  try {
    await ensureDatabaseSeeded();
    diagnostics.dbTest.seeded = true;

    const userCount = await prisma.user.count();
    const demoUser = await prisma.user.findUnique({
      where: { email: "judge.demo@gapfinder.ai" },
    });

    diagnostics.dbTest.userCount = userCount;
    diagnostics.dbTest.demoUser = demoUser ? demoUser.email : null;
    diagnostics.dbTest.success = true;
  } catch (err: any) {
    diagnostics.dbTest.error = {
      message: err.message,
      code: err.code,
      stack: err.stack,
    };
  }

  return NextResponse.json(diagnostics, { status: 200 });
}
