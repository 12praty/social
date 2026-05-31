import { NextRequest, NextResponse } from "next/server";
import { processDuePosts } from "@/lib/scheduler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verifySecret(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured on server" }, { status: 500 });
  }
  const header = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  if (header !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const forbidden = verifySecret(req);
    if (forbidden) return forbidden;
    const result = await processDuePosts();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[schedule/tick]", msg);
    return NextResponse.json({ error: "Tick failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
