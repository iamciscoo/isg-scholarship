import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { dispatchNotifications } from "@/server/services/notifications";
import { dispatchAdminAlerts } from "@/server/services/admin-alerts";
import { requestOrigin } from "@/config/site";
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
    const base = requestOrigin(request.headers);
    const [email, admin] = await Promise.all([dispatchNotifications(base), dispatchAdminAlerts(base)]);
    return NextResponse.json({ email, admin }, { status: email.configured || admin.configured ? 200 : 503 });
  } catch {
    console.error("notification_job_failed");
    return NextResponse.json({ error: "Delivery job unavailable" }, { status: 503 });
  }
}
