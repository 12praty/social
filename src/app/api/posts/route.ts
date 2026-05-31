import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authedRoute, bad, ok } from "@/lib/api-helpers";
import { processDuePosts } from "@/lib/scheduler";

import { platformLimit } from "@/lib/utils";

const createSchema = z.object({
  topic: z.string().min(1).max(4000),
  platform: z.enum(["LINKEDIN", "TWITTER", "INSTAGRAM"]),
  content: z.string().min(1),
  tone: z.string().default("professional"),
  imagePrompts: z.array(z.string()).max(10).default([]),
});

const VALID_STATUSES = ["DRAFT", "SCHEDULED", "PUBLISHED", "FAILED"] as const;
const VALID_PLATFORMS = ["LINKEDIN", "TWITTER", "INSTAGRAM"] as const;

export async function GET(req: NextRequest) {
  return authedRoute(req, async (user, r) => {
    // Opportunistically process any overdue scheduled posts before returning
    // the list. This ensures status updates even without a persistent worker.
    try {
      await processDuePosts();
    } catch (e) {
      console.error("[posts/GET] opportunistic processDuePosts failed", e);
    }
    const { searchParams } = new URL(r.url);
    const status = searchParams.get("status");
    const platform = searchParams.get("platform");
    if (status && !VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) return bad("Invalid status filter");
    if (platform && !VALID_PLATFORMS.includes(platform as typeof VALID_PLATFORMS[number])) return bad("Invalid platform filter");
    const where: Record<string, unknown> = { userId: user.id };
    if (status) where.status = status;
    if (platform) where.platform = platform;
    const posts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { scheduledJob: true },
    });
    return ok({ posts });
  });
}

export async function POST(req: NextRequest) {
  return authedRoute(req, async (user, r) => {
    const body = await r.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return bad(parsed.error.errors[0].message);
    const limit = platformLimit(parsed.data.platform);
    if (parsed.data.content.length > limit) {
      return bad(`Content exceeds ${limit} character limit for ${parsed.data.platform}`);
    }
    const post = await prisma.post.create({
      data: { ...parsed.data, userId: user.id, status: "DRAFT" },
    });
    return ok({ post });
  });
}
