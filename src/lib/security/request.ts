import "server-only";
import { createHmac } from "node:crypto";
export function sameOrigin(origin: string | null) {
  return Boolean(
    origin && origin === new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").origin,
  );
}
export function clientIdentity(headers: Headers) {
  // Trust forwarded addresses only behind an explicitly configured trusted proxy.
  const address =
    process.env.TRUST_PROXY === "true"
      ? headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
      : "direct";
  return createHmac(
    "sha256",
    process.env.RATE_LIMIT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "unconfigured",
  )
    .update(address)
    .digest("hex");
}
export async function readJson(request: Request, maxBytes = 16_384): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new Error("Use a JSON request.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing request body.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("Request is too large.");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
