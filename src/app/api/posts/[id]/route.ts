import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authedRoute, bad, ok } from "@/lib/api-helpers";
import { platformLimit } from "@/lib/utils";

const updateSchema = z.object({
  content: z.string().min(1).optional(),
  topic: z.string().min(1).optional(),
  tone: z.string().optional(),
  imagePrompts: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return authedRoute(req, async (user) => {
    const post = await prisma.post.findFirst({
      where: { id, userId: user.id },
      include: { scheduledJob: true },
    });
    if (!post) return bad("Not found", 404);
    return ok({ post });
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return authedRoute(req, async (user, r) => {
    const body = await r.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return bad(parsed.error.errors[0].message);
    const existing = await prisma.post.findFirst({ where: { id, userId: user.id } });
    if (!existing) return bad("Not found", 404);
    if (parsed.data.content) {
      const limit = platformLimit(existing.platform);
      if (parsed.data.content.length > limit) {
        return bad(`Content exceeds ${limit} character limit`);
      }
    }
    const post = await prisma.post.update({ where: { id: existing.id }, data: parsed.data });
    return ok({ post });
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return authedRoute(req, async (user) => {
    const existing = await prisma.post.findFirst({ where: { id, userId: user.id } });
    if (!existing) return bad("Not found", 404);
    await prisma.post.delete({ where: { id: existing.id } });
    return ok({ ok: true });
  });
}
