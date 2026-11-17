import "server-only";
export async function verifyTurnstile(token: string, action: string) {
  if (!process.env.TURNSTILE_SECRET_KEY || !token) return false;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY, response: token }),
      signal: AbortSignal.timeout(8000),
    });
    const result = (await response.json()) as { success: boolean; hostname?: string; action?: string };
    const hostname = new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").hostname;
    return response.ok && result.success && result.hostname === hostname && result.action === action;
  } catch {
    return false;
  }
}
