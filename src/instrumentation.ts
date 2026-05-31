/**
 * Next.js instrumentation hook — runs once when the server starts.
 * We use it to start the in-process scheduler so emails for scheduled
 * posts are sent without requiring a separate worker service.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Only run the scheduler on the Node.js server runtime, not on Edge or
  // during the build step.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startInProcessScheduler } = await import("./lib/in-process-scheduler");
    startInProcessScheduler();
  }
}
