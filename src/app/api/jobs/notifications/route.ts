import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { dispatchDelivery } from "@/server/services/notification-delivery";
export const maxDuration = 60;
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const received = request.headers.get("authorization") || "";
  if (
    !expected ||
    Buffer.byteLength(received) !== Buffer.byteLength(`Bearer ${expected}`) ||
    !timingSafeEqual(Buffer.from(received), Buffer.from(`Bearer ${expected}`))
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [email, admin] = await dispatchDelivery();
  const available = email.status === "fulfilled" && admin.status === "fulfilled";
  if (!available) console.error("notification_job_failed");
  return NextResponse.json(
    {
      email: email.status === "fulfilled" ? email.value : null,
      admin: admin.status === "fulfilled" ? admin.value : null,
    },
    { status: available && (email.value.configured || admin.value.configured) ? 200 : 503 },
  );
}
