import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authedRoute, bad, ok } from "@/lib/api-helpers";

const schema = z.object({
  businessName: z.string().max(120).default(""),
  industry: z.string().max(80).default(""),
  targetAudience: z.string().max(400).default(""),
  toneKeywords: z.array(z.string()).max(8).default([]),
  examplePost: z.string().max(4000).optional().nullable(),
  avoidWords: z.array(z.string()).max(40).default([]),
});

export async function GET(req: NextRequest) {
  return authedRoute(req, async (user) => {
    let brand = await prisma.brandVoice.findUnique({ where: { userId: user.id } });
    if (!brand) {
      brand = await prisma.brandVoice.create({ data: { userId: user.id } });
    }
    return ok({ brand });
  });
}

export async function PUT(req: NextRequest) {
  return authedRoute(req, async (user, r) => {
    const body = await r.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return bad(parsed.error.errors[0].message);
    const data = parsed.data;
    const brand = await prisma.brandVoice.upsert({
      where: { userId: user.id },
      update: {
        businessName: data.businessName,
        industry: data.industry,
        targetAudience: data.targetAudience,
        toneKeywords: data.toneKeywords,
        examplePost: data.examplePost ?? null,
        avoidWords: data.avoidWords,
      },
      create: { userId: user.id, ...data, examplePost: data.examplePost ?? null },
    });
    return ok({ brand });
  });
}
