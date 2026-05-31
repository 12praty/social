import { processDuePosts } from "./scheduler";

let started = false;
let intervalId: ReturnType<typeof setInterval> | null = null;

const INTERVAL_MS = 60_000; // Check every 60 seconds

/**
 * Starts an in-process scheduler that runs `processDuePosts()` every minute.
 * This replaces the need for the standalone worker process (`npm run worker`)
 * when deployed on platforms like Render or self-hosted environments.
 *
 * Safe to call multiple times — it will only start once.
 */
export function startInProcessScheduler() {
  if (started) return;
  started = true;

  console.log("[in-process-scheduler] Starting — checking for due posts every 60s");

  // Run immediately on startup to catch any overdue posts
  runTick();

  // Then run every 60 seconds
  intervalId = setInterval(runTick, INTERVAL_MS);

  // Ensure clean shutdown
  const cleanup = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
  process.on("SIGTERM", cleanup);
  process.on("SIGINT", cleanup);
}

let running = false;

async function runTick() {
  if (running) return; // Prevent overlapping runs
  running = true;
  try {
    const result = await processDuePosts();
    if (result.processed > 0) {
      console.log(`[in-process-scheduler] Processed ${result.processed} due post(s)`);
    }
    if (result.error) {
      console.error(`[in-process-scheduler] Error:`, result.error);
    }
  } catch (err) {
    console.error("[in-process-scheduler] Unexpected error:", err);
  } finally {
    running = false;
  }
}
