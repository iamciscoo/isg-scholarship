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
