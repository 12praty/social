import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authedRoute, bad, ok, rateLimit } from "@/lib/api-helpers";
import { generatePlatformPost } from "@/lib/gemini";

const schema = z.object({
  topic: z.string().min(1),
  platform: z.enum(["LINKEDIN", "TWITTER", "INSTAGRAM"]),
  tone: z.string().default("professional"),
});

export async function POST(req: NextRequest) {
  return authedRoute(req, async (user, r) => {
    const limit = rateLimit(`regen:${user.id}`, 30, 60 * 60 * 1000);
    if (!limit.allowed) return bad("Rate limit reached. Try again in an hour.", 429);
    const body = await r.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return bad(parsed.error.errors[0].message);
    const brand = await prisma.brandVoice.findUnique({ where: { userId: user.id } });
    const content = await generatePlatformPost(parsed.data.platform, parsed.data.topic, parsed.data.tone, brand);
    return ok({ content: content.trim() });
  });
}
