import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { authConfigured } from "./config";
export async function createClient() {
  if (!authConfigured()) throw new Error("Authentication is not configured.");
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const secure =
    process.env.TRUST_PROXY === "true"
      ? requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https"
      : (process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://") ?? false);
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: {
        httpOnly: true,
        sameSite: "lax",
        secure,
        path: "/",
      },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (values) => {
          try {
            values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            /* Server component cookies are refreshed by proxy. */
          }
        },
      },
    },
  );
}
