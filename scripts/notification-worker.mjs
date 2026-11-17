// Local Docker scheduler. Hosting platforms can call the same authenticated endpoint.
const base = process.env.NOTIFICATION_JOB_URL || "http://web:3000";
async function tick() {
  try {
    const response = await fetch(`${base}/api/jobs/notifications`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      signal: AbortSignal.timeout(170000),
    });
    if (!response.ok) console.error("Notification worker request failed", response.status);
  } catch {
    console.error("Notification worker unavailable");
  }
  setTimeout(tick, 60000);
}
await tick();
