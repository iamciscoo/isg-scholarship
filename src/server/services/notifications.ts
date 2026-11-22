import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { notificationTemplate, type NotificationDetails } from "@/lib/email/templates";
import { deliveryBatch, resendConfigured, sendEmail } from "./delivery-provider";

type Notification = {
  id: string;
  lease_id: string;
  recipient: string;
  event: string;
  payload: NotificationDetails;
};

export async function dispatchNotifications(baseUrl: string) {
  if (!resendConfigured()) return { configured: false, sent: 0, failed: 0 };
  const db = adminClient();
  const claim = await db.rpc("claim_notifications", { p_limit: 10 });
  if (claim.error) throw new Error("notification_claim_failed");

  return deliveryBatch((claim.data || []) as Notification[], async (notification) => {
    const content = notificationTemplate(notification.event, notification.payload, baseUrl);
    const result = await sendEmail(notification.id, notification.recipient, content);
    const complete = await db.rpc("finish_notification", {
      p_id: notification.id,
      p_lease: notification.lease_id,
      p_provider_id: result.id,
      p_error: result.error,
    });
    if (complete.error) console.error("notification_completion_failed", { code: complete.error.code });
    return result.state === "sent";
  });
}
