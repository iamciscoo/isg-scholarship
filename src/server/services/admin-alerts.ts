import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { adminAlertTemplate } from "@/lib/email/admin-template";
import type { NotificationDetails } from "@/lib/email/templates";
import {
  deliveryBatch,
  greenApiConfig,
  resendConfigured,
  sendEmail,
  type SendResult,
} from "./delivery-provider";
import { sendReceiptAttachment, ReceiptDeliveryError } from "./whatsapp-receipt";

type Event = {
  id: string;
  lease_id: string;
  channel: "email" | "whatsapp";
  event: string;
  entity_id: string;
  recipient: string;
  payload?: NotificationDetails;
};

async function sendWhatsApp(
  db: ReturnType<typeof adminClient>,
  provider: ReturnType<typeof greenApiConfig>,
  item: Event,
  message: string,
): Promise<SendResult> {
  if (!provider || !/^\d+(?:-\d+)?@g\.us$/.test(item.recipient))
    return { state: "failed", id: null, error: "whatsapp_invalid_destination" };

  try {
    const signal = AbortSignal.timeout(item.event === "payment.receipt_received" ? 20000 : 9000);
    const attachment =
      item.event === "payment.receipt_received"
        ? await sendReceiptAttachment(db, item.entity_id, item.recipient, message, signal, provider)
        : null;
    const response =
      attachment ??
      (await fetch(provider("sendMessage"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: item.recipient, message, linkPreview: false }),
        signal,
        redirect: "error",
      }));
    if (response.ok) {
      const body = await response.json();
      if (typeof body.idMessage === "string" && body.idMessage)
        return { state: "sent", id: body.idMessage, error: null };
    } else {
      return {
        state: [401, 403, 429].includes(response.status)
          ? "pending"
          : response.status < 500
            ? "failed"
            : "uncertain",
        id: null,
        error: `whatsapp_http_${response.status}`,
      };
    }
  } catch (error) {
    if (error instanceof ReceiptDeliveryError) return { state: error.state, id: null, error: error.message };
    // Without provider idempotency, retrying an unconfirmed request can deliver twice.
  }
  return { state: "uncertain", id: null, error: "whatsapp_unconfirmed" };
}

export async function dispatchAdminAlerts(baseUrl: string) {
  const email = process.env.ADMIN_EMAIL_ENABLED === "true" && resendConfigured();
  const whatsapp = greenApiConfig();
  if (!email && !whatsapp) return { sent: 0, failed: 0, configured: false };
  const db = adminClient();
  const { data, error } = await db.rpc("claim_integration_events", {
    p_email: email,
    p_whatsapp: Boolean(whatsapp),
  });
  if (error) throw new Error("admin_alert_claim_failed");

  // Ten claimed events take at most two waves of the 20-second receipt send budget.
  return deliveryBatch(
    (data || []) as Event[],
    async (item) => {
      const content = adminAlertTemplate(item.event, item.entity_id, item.payload || {}, baseUrl);
      const result =
        item.channel === "email"
          ? await sendEmail(item.id, item.recipient, content)
          : await sendWhatsApp(db, whatsapp, item, content.text);
      const complete = await db.rpc("finish_integration_event", {
        p_id: item.id,
        p_lease: item.lease_id,
        p_provider: result.id,
        p_state: result.state,
        p_error: result.error,
      });
      if (complete.error) console.error("admin_alert_completion_failed", { code: complete.error.code });
      return result.state === "sent";
    },
    5,
  );
}
