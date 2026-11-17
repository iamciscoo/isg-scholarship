import "server-only";
import { createHash } from "node:crypto";
import { adminClient } from "@/lib/supabase/admin";
import { clientIdentity } from "@/lib/security/request";
import { verifyTurnstile } from "@/lib/security/turnstile";
export async function guardIntake(headers: Headers, token: string, action: string) {
  const db = adminClient();
  const { data, error } = await db.rpc("consume_rate_limit", {
    p_key: `${action}:${clientIdentity(headers)}`,
    p_limit: 5,
    p_seconds: 900,
  });
  if (error) throw new Error("The service is temporarily unavailable. Please try again later.");
  if (!data) throw new Error("Too many attempts. Please try again in 15 minutes.");
  if (!(await verifyTurnstile(token, action)))
    throw new Error("The security check expired. Please try again.");
}
export function payloadHash(data: unknown) {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}
