import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { rateLimit } from "@/lib/api-helpers";
import { streamPlatformPost } from "@/lib/gemini";
import type { BrandVoice } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  topic: z.string().min(3).max(4000),
  platforms: z.array(z.enum(["LINKEDIN", "TWITTER", "INSTAGRAM"])).min(1),
  tone: z.string().min(1).max(40).default("professional"),
});

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = rateLimit(`gen:${session.userId}`, 20, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Rate limit reached. Try again in an hour." }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  let brand: BrandVoice | null = null;
  try {
    brand = await prisma.brandVoice.findUnique({ where: { userId: session.userId } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "DB error";
    console.error("[generate] brand query failed", msg);
  }
  const { topic, platforms, tone } = parsed.data;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      const abortHandler = () => {
        try { controller.close(); } catch { /* ignore */ }
      };
      req.signal.addEventListener("abort", abortHandler, { once: true });

      const timeout = setTimeout(() => {
        send("error", { message: "Generation timed out" });
        try { controller.close(); } catch { /* ignore */ }
      }, 120_000);

      try {
        send("meta", { topic, platforms, tone });
        for (const platform of platforms) {
          if (req.signal.aborted) break;
          send("start", { platform });
          let full = "";
          try {
            for await (const chunk of streamPlatformPost(platform, topic, tone, brand)) {
              if (req.signal.aborted) break;
              full += chunk;
              send("chunk", { platform, text: chunk });
            }
          } catch (err) {
            if (req.signal.aborted) break;
            const msg = err instanceof Error ? err.message : "AI error";
            console.error("[generate]", platform, msg);
            send("error", { platform, message: msg });
            continue;
          }
          send("done", { platform, content: full.trim() });
        }
        send("complete", { ok: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        send("error", { message: msg });
      } finally {
        clearTimeout(timeout);
        req.signal.removeEventListener("abort", abortHandler);
        try { controller.close(); } catch { /* ignore */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
