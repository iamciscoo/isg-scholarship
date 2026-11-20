import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { dispatchNotifications } from "@/server/services/notifications";
import { dispatchAdminAlerts } from "@/server/services/admin-alerts";
import { publicUrl } from "@/config/site";
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
    const [email, admin] = await Promise.all([dispatchNotifications(publicUrl), dispatchAdminAlerts(publicUrl)]);
    return NextResponse.json({ email, admin }, { status: email.configured || admin.configured ? 200 : 503 });
  } catch (error) {
    console.error("notification_job_failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Delivery job unavailable" }, { status: 503 });
  }
}
