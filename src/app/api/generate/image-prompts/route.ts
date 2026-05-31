import { NextRequest } from "next/server";
import { z } from "zod";
import { authedRoute, bad, ok, rateLimit } from "@/lib/api-helpers";
import { generateImagePrompts } from "@/lib/gemini";

const schema = z.object({
  topic: z.string().min(1),
  content: z.string().min(1),
  platform: z.enum(["LINKEDIN", "TWITTER", "INSTAGRAM"]),
});

export async function POST(req: NextRequest) {
  return authedRoute(req, async (user, r) => {
    const limit = rateLimit(`imgprompt:${user.id}`, 30, 60 * 60 * 1000);
    if (!limit.allowed) return bad("Rate limit reached. Try again later.", 429);
    const body = await r.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return bad(parsed.error.errors[0].message);
    const prompts = await generateImagePrompts(parsed.data.topic, parsed.data.content, parsed.data.platform);
    return ok({ prompts });
  });
}
