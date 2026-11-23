import "server-only";
import { setTimeout as delay } from "node:timers/promises";
import { site } from "@/config/site";

export type SendResult =
  | { state: "sent"; id: string; error: null }
  | { state: "pending" | "failed" | "uncertain"; id: null; error: string };

export function resendConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

// Keep bursts from both outboxes within the provider's team rate limit.
let nextEmailRequest = 0;
export async function sendEmail(
  id: string,
  to: string,
  content: { subject: string; text: string; html?: string },
): Promise<SendResult> {
  const start = Math.max(Date.now(), nextEmailRequest);
  nextEmailRequest = start + 250;
  if (start > Date.now()) await delay(start - Date.now());
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": id,
      },
      body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to, reply_to: site.email, ...content }),
      signal: AbortSignal.timeout(7000),
      redirect: "error",
    });
    if (response.ok) {
      const body = await response.json();
      if (typeof body.id === "string" && body.id) return { state: "sent", id: body.id, error: null };
      return { state: "pending", id: null, error: "resend_unconfirmed" };
    }
    return {
      state: response.status === 400 || response.status === 422 ? "failed" : "pending",
      id: null,
      error: `resend_http_${response.status}`,
    };
  } catch {
    return { state: "pending", id: null, error: "resend_unconfirmed" };
  }
}

export function greenApiConfig() {
  const api = process.env.GREEN_API_URL?.trim().replace(/\/$/, "");
  const media = process.env.GREEN_API_MEDIA_URL?.trim().replace(/\/$/, "") || api || "";
  const instance = process.env.GREEN_API_INSTANCE_ID;
  const token = process.env.GREEN_API_TOKEN;
  const validApi = /^https:\/\/(?:[0-9]+\.)?api\.green-?api\.com$/;
  const validMedia = /^https:\/\/media\.green-?api\.com$/;
  if (!api || !validApi.test(api) || !(validApi.test(media) || validMedia.test(media))) return null;
  if (!instance || !/^\d+$/.test(instance) || !token) return null;
  const path = `/waInstance${instance}`;
  const credential = encodeURIComponent(token);
  return (method: "sendMessage" | "sendFileByUpload" | "sendFileByUrl") =>
    `${method === "sendFileByUpload" ? media : api}${path}/${method}/${credential}`;
}

export async function deliveryBatch<T>(items: T[], deliver: (item: T) => Promise<boolean>, concurrency = 4) {
  let sent = 0;
  for (let index = 0; index < items.length; index += concurrency) {
    const results = await Promise.allSettled(items.slice(index, index + concurrency).map(deliver));
    sent += results.filter((result) => result.status === "fulfilled" && result.value).length;
  }
  return { configured: true, sent, failed: items.length - sent };
}
