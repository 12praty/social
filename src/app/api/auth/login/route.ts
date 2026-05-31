import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, signSession } from "@/lib/auth";
import { friendlyDbError } from "@/lib/db-errors";
import { rateLimit } from "@/lib/api-helpers";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV !== "development") {
      const ip = req.headers.get("x-forwarded-for") ?? "unknown";
      const limit = rateLimit(`login:${ip}`, 10, 60 * 60 * 1000);
      if (!limit.allowed) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }

    const body = await req.json();
    const data = schema.parse(body);
    const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (!user) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    const ok = await bcrypt.compare(data.password, user.password);
    if (!ok) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    const token = await signSession({ userId: user.id, email: user.email });
    await setSessionCookie(token);
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    const mapped = friendlyDbError(err);
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    const msg = err instanceof Error ? err.message : "Server error";
    console.error("[auth/login]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
