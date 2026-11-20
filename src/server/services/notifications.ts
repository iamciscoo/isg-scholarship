import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { notificationTemplate } from "@/lib/email/templates";
type Notification = {
  id: string;
  lease_id: string;
  recipient: string;
  event: string;
  payload: { firstName?: string; reference: string };
};
export async function dispatchNotifications(baseUrl: string) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL)
    return { configured: false, sent: 0, failed: 0 };
  const db = adminClient();
  const claim = await db.rpc("claim_notifications", { p_limit: 10 });
  if (claim.error) throw new Error("notification_claim_failed");
  let sent = 0;
  let failed = 0;
  for (const notification of (claim.data || []) as Notification[]) {
    let providerId: string | null = null;
    let failure: string | null = null;
    try {
      const content = notificationTemplate(notification.event, notification.payload, baseUrl);
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": notification.id,
        },
        body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to: notification.recipient, ...content }),
        signal: AbortSignal.timeout(10000),
      });
      const body = await response.json();
      if (!response.ok || typeof body.id !== "string") throw new Error("provider_rejected");
      providerId = body.id;
      sent++;
    } catch {
      failure = "provider_unavailable_or_rejected";
      failed++;
    }
    const complete = await db.rpc("finish_notification", {
      p_id: notification.id,
      p_lease: notification.lease_id,
      p_provider_id: providerId,
      p_error: failure,
    });
    if (complete.error) console.error("notification_completion_failed", { code: complete.error.code });
  }
  return { configured: true, sent, failed };
}
