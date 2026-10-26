import { NextResponse } from "next/server";
import { checkOllamaStatus } from "@/lib/ollama";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await checkOllamaStatus();
  return NextResponse.json(status);
}
