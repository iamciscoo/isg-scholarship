import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { dispatchNotifications } from "@/server/services/notifications";
export const maxDuration = 180;
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const received = request.headers.get("authorization") || "";
  if (
    !expected ||
    Buffer.byteLength(received) !== Buffer.byteLength(`Bearer ${expected}`) ||
    !timingSafeEqual(Buffer.from(received), Buffer.from(`Bearer ${expected}`))
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await dispatchNotifications();
    return NextResponse.json(result, { status: result.configured ? 200 : 503 });
  } catch {
    console.error("notification_job_failed");
    return NextResponse.json({ error: "Delivery job unavailable" }, { status: 503 });
  }
}
