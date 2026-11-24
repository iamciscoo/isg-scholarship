import "server-only";
import { headers } from "next/headers";

/**
 * Public origin for links we send the user back to. Prefer the configured site URL so previews and
 * tunnels cannot hijack it, but fall back to the request's own host instead of a hardcoded localhost.
 */
export async function requestOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host")?.split(",")[0]?.trim() || incoming.get("host");
  const protocol = incoming.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http";
  return host ? `${protocol}://${host}` : "http://localhost:3000";
}