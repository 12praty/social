import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

if (process.env.NODE_ENV === "development") {
  const g = globalThis as unknown as { schedulerStarted?: boolean };
  if (!g.schedulerStarted) {
    g.schedulerStarted = true;
    import("./scheduler").then(({ processDuePosts }) => {
      console.log("[dev-scheduler] Starting background scheduling runner (10s intervals)...");
      const interval = setInterval(async () => {
        try {
          const { processed } = await processDuePosts();
          if (processed > 0) {
            console.log(`[dev-scheduler] successfully processed ${processed} due post(s)`);
          }
        } catch (err) {
          console.error("[dev-scheduler] execution error", err);
        }
      }, 10000);
      interval.unref();
    });
  }
}
