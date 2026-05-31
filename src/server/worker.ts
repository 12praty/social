import "dotenv/config";
import cron from "node-cron";
import http from "http";
import { processDuePosts } from "../lib/scheduler";

let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    const { processed } = await processDuePosts();
    if (processed > 0) console.log(`[worker] processed ${processed} due post(s)`);
  } catch (err) {
    console.error("[worker] tick error", err);
  } finally {
    running = false;
  }
}

console.log("[worker] starting — checking for due posts every minute");
cron.schedule("* * * * *", tick);
tick();

// Start a lightweight HTTP server to satisfy Render Free Web Service port-binding requirements
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "healthy", service: "social-studio-worker" }));
}).listen(port, () => {
  console.log(`[worker] Health check server listening on port ${port}`);
});
