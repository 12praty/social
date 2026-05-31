import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { friendlyDbError } from "@/lib/db-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // A lightweight DB check
    await prisma.user.count({ take: 1 });
    return NextResponse.json({ ok: true, db: "connected" });
  } catch (err: unknown) {
    const mapped = friendlyDbError(err);
    return NextResponse.json(
      { ok: false, db: "disconnected", error: mapped?.message ?? (err instanceof Error ? err.message : String(err)) },
      { status: mapped?.status ?? 503 }
    );
  }
}

