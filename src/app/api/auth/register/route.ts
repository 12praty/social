import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, signSession } from "@/lib/auth";
import { friendlyDbError } from "@/lib/db-errors";
import { rateLimit } from "@/lib/api-helpers";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).max(80).optional(),
});

export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV !== "development") {
      const ip = req.headers.get("x-forwarded-for") ?? "unknown";
      const limit = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
      if (!limit.allowed) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }

    const body = await req.json();
    const data = schema.parse(body);
    const email = data.email.toLowerCase();
    const hashed = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name: data.name?.trim() || null,
        brandVoice: { create: {} },
      },
    });
    const token = await signSession({ userId: user.id, email: user.email });
    await setSessionCookie(token);
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    const mapped = friendlyDbError(err);
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    const msg = err instanceof Error ? err.message : "Server error";
    console.error("[auth/register]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
