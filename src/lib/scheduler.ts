import { prisma } from "./prisma";
import { sendPublishedEmail } from "./email";

export async function processDuePosts() {
  const now = new Date();
  let due;
  try {
    due = await prisma.scheduledJob.findMany({
      where: { processedAt: null, scheduledAt: { lte: now } },
      include: { post: { include: { user: true } } },
      take: 25,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[scheduler] query failed", msg);
    return { processed: 0, error: msg };
  }

  for (const job of due) {
    const claimed = await prisma.scheduledJob.updateMany({
      where: { id: job.id, processedAt: null },
      data: { processedAt: now },
    });
    if (claimed.count === 0) continue;

    try {
      if (!job.post || job.post.status !== "SCHEDULED") continue;
      const emailResult = await sendPublishedEmail({
        to: job.post.user.email,
        platform: job.post.platform,
        topic: job.post.topic,
        content: job.post.content,
      });
      if (emailResult.error) {
        console.warn(`[scheduler] email delivery failed for post ${job.post.id} (recipient: ${job.post.user.email}), but proceeding to mark as PUBLISHED. Error:`, emailResult.error);
      }
      await prisma.post.update({
        where: { id: job.post.id },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });
      await prisma.scheduledJob.update({
        where: { id: job.id },
        data: { attempts: { increment: 1 } },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[scheduler] job failed", job.id, msg);
      await prisma.scheduledJob.update({
        where: { id: job.id },
        data: { attempts: { increment: 1 }, lastError: msg, processedAt: null },
      });
      if (job.attempts >= 2) {
        await prisma.post.update({ where: { id: job.postId }, data: { status: "FAILED" } });
        await prisma.scheduledJob.update({ where: { id: job.id }, data: { processedAt: new Date() } });
      }
    }
  }
  return { processed: due.length };
}
