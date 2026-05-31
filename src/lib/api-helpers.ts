import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "./auth";
import { prisma } from "./prisma";
import type { User } from "@prisma/client";
import { friendlyDbError } from "./db-errors";

export async function authedRoute(
  req: NextRequest,
  handler: (user: User, req: NextRequest) => Promise<Response> | Response
): Promise<Response> {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return await handler(user, req);
  } catch (err: unknown) {
    const mapped = friendlyDbError(err);
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[api]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

const inMemoryRate = new Map<string, { count: number; resetAt: number }>();
let lastCleanup = 0;

export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();

  if (now - lastCleanup > 60_000) {
    lastCleanup = now;
    for (const [k, v] of inMemoryRate) {
      if (v.resetAt < now) inMemoryRate.delete(k);
    }
  }

  const entry = inMemoryRate.get(key);
  if (!entry || entry.resetAt < now) {
    inMemoryRate.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }
  entry.count += 1;
  if (entry.count > max) return { allowed: false, remaining: 0 };
  return { allowed: true, remaining: max - entry.count };
}
