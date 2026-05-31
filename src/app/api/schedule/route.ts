import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authedRoute, bad, ok } from "@/lib/api-helpers";

const scheduleSchema = z.object({
  postId: z.string().min(1),
  scheduledAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
});

export async function POST(req: NextRequest) {
  return authedRoute(req, async (user, r) => {
    const body = await r.json().catch(() => null);
    const parsed = scheduleSchema.safeParse(body);
    if (!parsed.success) return bad(parsed.error.errors[0].message);
    const post = await prisma.post.findFirst({ where: { id: parsed.data.postId, userId: user.id } });
    if (!post) return bad("Post not found", 404);

    const scheduledAt = new Date(parsed.data.scheduledAt);
    if (scheduledAt.getTime() < Date.now() + 60 * 1000) return bad("Schedule time must be in the future");

    const updated = await prisma.post.update({
      where: { id: post.id },
      data: {
        status: "SCHEDULED",
        scheduledAt,
        scheduledJob: {
          upsert: {
            create: { scheduledAt },
            update: { scheduledAt, processedAt: null, lastError: null, attempts: 0 },
          },
        },
      },
      include: { scheduledJob: true },
    });
    return ok({ post: updated });
  });
}
