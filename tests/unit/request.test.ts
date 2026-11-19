import { afterEach, expect, it, vi } from "vitest";
import { readJson, sameOrigin } from "@/lib/security/request";
import { verifyTurnstile } from "@/lib/security/turnstile";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("rejects cross-origin mutations", () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://isg.example");
  expect(sameOrigin("https://evil.invalid")).toBe(false);
  expect(sameOrigin("https://isg.example")).toBe(true);
  expect(sameOrigin(null)).toBe(false);
});
it("accepts the actual ngrok or LAN request host without changing the configured site URL", () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3002");
  vi.stubEnv("TRUST_PROXY", "false");
  expect(sameOrigin("https://demo.ngrok-free.dev", new Headers({ host: "demo.ngrok-free.dev" }))).toBe(true);
  expect(sameOrigin("http://192.168.1.5:3002", new Headers({ host: "192.168.1.5:3002" }))).toBe(true);
  expect(sameOrigin("https://evil.invalid", new Headers({ host: "demo.ngrok-free.dev" }))).toBe(false);
  expect(sameOrigin("https://demo.ngrok-free.dev/path", new Headers({ host: "demo.ngrok-free.dev" }))).toBe(
    false,
  );
  expect(sameOrigin("null", new Headers({ host: "demo.ngrok-free.dev" }))).toBe(false);
});
it("trusts forwarded hosts only when proxy trust is enabled", () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3002");
  const h = new Headers({ host: "web:3000", "x-forwarded-host": "demo.ngrok-free.dev" });
  vi.stubEnv("TRUST_PROXY", "false");
  expect(sameOrigin("https://demo.ngrok-free.dev", h)).toBe(false);
  vi.stubEnv("TRUST_PROXY", "true");
  expect(sameOrigin("https://demo.ngrok-free.dev", h)).toBe(true);
  expect(sameOrigin("https://other.ngrok-free.dev", h)).toBe(false);
});
it("caps chunked request size without trusting content-length", async () => {
  const request = new Request("http://localhost", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "x".repeat(100) }),
  });
  await expect(readJson(request, 32)).rejects.toThrow("too large");
});
it("rejects a non-JSON request", async () => {
  await expect(readJson(new Request("http://localhost", { method: "POST", body: "abc" }))).rejects.toThrow(
    "JSON",
  );
});
it.each([
  { success: false, hostname: "isg.example", action: "assessment" },
  { success: true, hostname: "evil.invalid", action: "assessment" },
  { success: true, hostname: "isg.example", action: "contact" },
])("rejects an invalid challenge result %j", async (response) => {
  vi.stubEnv("TURNSTILE_SECRET_KEY", "test-only");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://isg.example");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(response)));
  expect(await verifyTurnstile("test-token", "assessment")).toBe(false);
});
