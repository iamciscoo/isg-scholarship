import "server-only";
import { adminClient } from "@/lib/supabase/admin";
type Event = {
  id: string;
  lease_id: string;
  channel: string;
  event: string;
  entity_id: string;
  recipient: string;
};
export async function dispatchAdminAlerts() {
  const email =
    process.env.ADMIN_EMAIL_ENABLED === "true" &&
    Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
  const whatsapp = Boolean(
    process.env.GREEN_API_TOKEN && process.env.GREEN_API_INSTANCE_ID && process.env.GREEN_API_URL,
  );
  if (!email && !whatsapp) return { sent: 0, failed: 0, configured: false };
  const db = adminClient();
  const { data, error } = await db.rpc("claim_integration_events", { p_email: email, p_whatsapp: whatsapp });
  if (error) throw new Error("admin_alert_claim_failed");
  let sent = 0,
    failed = 0;
  for (const item of (data || []) as Event[]) {
    const labels: Record<string, string> = {
      "account.verified": "An ISG account update is available.",
      "account.created": "A new student account has been created.",
      "consultation.received": "A new consultation request has arrived.",
      "lead.updated": "An ISG lead has been updated.",
      "payment.receipt_received":
        "A consultation payment receipt needs verification. Financial details remain in the private workspace.",
      "payment.reviewed": "A consultation payment review has been recorded.",
      "meeting.requested": "An applicant requested another advisor meeting.",
      "meeting.scheduled": "An advisor meeting has been scheduled.",
      "consultation.follow_up": "A consultation follow-up question needs a reply.",
      "application.form_received": "An applicant submitted a full application declaration.",
      "application.updated": "An application workflow update is available.",
      "package.accepted":"An applicant accepted an ISG service-package quote. Payment balances remain subject to verification.",
    };
    const path =
      item.event === "payment.receipt_received"
        ? `/admin/receipts/${item.entity_id}`
        : item.event === "payment.reviewed"
          ? "/admin/payments"
          : item.event === "application.form_received"
            ? `/admin/declarations/${item.entity_id}`
            : item.event.startsWith("application.")
              ? "/admin/applications"
              : "/admin/consultations";
    const message = `${labels[item.event] || "An ISG account event occurred."}\nReview securely: ${process.env.NEXT_PUBLIC_SITE_URL}${path}\nEvent: ${item.id}`;
    let state = "uncertain",
      provider: string | null = null;
    try {
      let response: Response;
      if (item.channel === "email")
        response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
            "Idempotency-Key": item.id,
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL,
            to: item.recipient,
            subject: "ISG administrator update",
            text: message,
          }),
          signal: AbortSignal.timeout(12000),
        });
      else {
        const base = process.env.GREEN_API_URL;
        if (base !== "https://7107.api.greenapi.com" || !/^\d+@g\.us$/.test(item.recipient))
          throw new Error("invalid_destination");
        response = await fetch(
          `${base}/waInstance${process.env.GREEN_API_INSTANCE_ID}/sendMessage/${process.env.GREEN_API_TOKEN}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chatId: item.recipient, message, linkPreview: false }),
            signal: AbortSignal.timeout(12000),
          },
        );
      }
      if (!response.ok) state = "failed";
      else {
        const result = await response.json();
        provider = result.id || result.idMessage || null;
        if (provider) state = "sent";
      }
    } catch {
      /* Avoid provider URL/token and payload logging. Ambiguous requests are not resent automatically. */
    }
    if (state === "sent") sent++;
    else failed++;
    const complete = await db.rpc("finish_integration_event", {
      p_id: item.id,
      p_lease: item.lease_id,
      p_provider: provider,
      p_state: state,
      p_error: state === "sent" ? null : "provider_rejected_or_unconfirmed",
    });
    if (complete.error) console.error("admin_alert_completion_failed", { code: complete.error.code });
  }
  return { sent, failed, configured: true };
}
