import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(randomUUID()).toString("base64");
  const development = process.env.NODE_ENV !== "production";
  const csp = `default-src 'self'; script-src 'self' 'nonce-${nonce}' ${development ? "'unsafe-eval'" : ""} https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' ${development ? "ws: http://localhost:* http://127.0.0.1:*" : ""} https://*.supabase.co https://challenges.cloudflare.com; frame-src 'self' https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';`;
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("x-isg-pathname", request.nextUrl.pathname);
  headers.set("Content-Security-Policy", csp);
  let response = NextResponse.next({ request: { headers } });
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookieOptions: {
          httpOnly: true,
          sameSite: "lax",
          secure:
            request.nextUrl.protocol === "https:" ||
            (process.env.TRUST_PROXY === "true" &&
              request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https"),
          path: "/",
        },
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (values) => {
            values.forEach(({ name, value }) => request.cookies.set(name, value));
            headers.set("cookie", request.cookies.toString());
            response = NextResponse.next({ request: { headers } });
            values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      },
    );
    await supabase.auth.getClaims();
  }
  const receiptPreview =
    /^\/api\/case-files\/[0-9a-f-]{36}$/.test(request.nextUrl.pathname) &&
    request.nextUrl.searchParams.get("preview") === "1";
  if (!receiptPreview) response.headers.set("Content-Security-Policy", csp);
  if (/^\/(admin|advisor|dashboard|auth|mfa|api)(\/|$)/.test(request.nextUrl.pathname)) {
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.svg|images/|fonts/|flags/|brand/|apple-touch-icon.png).*)",
  ],
};
