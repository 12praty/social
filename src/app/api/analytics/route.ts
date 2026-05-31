import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authedRoute, ok } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  return authedRoute(req, async (user) => {
    const tz = req.headers.get("x-timezone") || "UTC";
    const [total, draft, scheduled, published, failed, byPlatform, last30] = await Promise.all([
      prisma.post.count({ where: { userId: user.id } }),
      prisma.post.count({ where: { userId: user.id, status: "DRAFT" } }),
      prisma.post.count({ where: { userId: user.id, status: "SCHEDULED" } }),
      prisma.post.count({ where: { userId: user.id, status: "PUBLISHED" } }),
      prisma.post.count({ where: { userId: user.id, status: "FAILED" } }),
      prisma.post.groupBy({
        by: ["platform"],
        where: { userId: user.id },
        _count: { _all: true },
      }),
      prisma.post.findMany({
        where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        select: { createdAt: true, tone: true, platform: true },
      }),
    ]);

    function localDateKey(d: Date) {
      const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
      return f.format(d);
    }

    const perDay = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      perDay.set(localDateKey(d), 0);
    }
    for (const p of last30) {
      const k = localDateKey(new Date(p.createdAt));
      if (perDay.has(k)) perDay.set(k, (perDay.get(k) || 0) + 1);
    }

    const tones = new Map<string, number>();
    for (const p of last30) tones.set(p.tone, (tones.get(p.tone) || 0) + 1);

    const days = new Set(last30.map((p) => localDateKey(new Date(p.createdAt))));
    let streak = 0;
    const cursor = new Date();
    while (days.has(localDateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return ok({
      totals: { total, draft, scheduled, published, failed },
      byPlatform: byPlatform.map((b) => ({ platform: b.platform, count: b._count._all })),
      perDay: Array.from(perDay.entries()).map(([date, count]) => ({ date, count })),
      tones: Array.from(tones.entries()).map(([tone, count]) => ({ tone, count })),
      streak,
    });
  });
}
