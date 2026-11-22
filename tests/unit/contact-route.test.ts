import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("@/server/services/notification-delivery", () => ({ wakeNotifications: vi.fn() }));
const mock = vi.hoisted(() => ({ rpc: vi.fn(), guard: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ adminClient: () => ({ rpc: mock.rpc }) }));
vi.mock("@/server/services/intake", () => ({ guardIntake: mock.guard, payloadHash: () => "test-hash" }));
import { POST } from "@/app/api/contact/route";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3002");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only");
  vi.stubEnv("TURNSTILE_SECRET_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
  vi.stubEnv("INTAKE_ENABLED", "false");
  vi.stubEnv("CONTACT_ENABLED", "true");
  vi.stubEnv("TRUST_PROXY", "true");
  mock.rpc.mockResolvedValue({ data: "test-record", error: null });
  mock.guard.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());
function request(overrides: Record<string, unknown> = {}, origin = "https://preview.ngrok-free.dev") {
  return new Request("http://web:3000/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin,
      host: "web:3000",
      "x-forwarded-host": "preview.ngrok-free.dev",
    },
    body: JSON.stringify({
      data: {
        name: "Test enquirer",
        email: "fixture@example.invalid",
        topic: "Consultation",
        message: "Test request in the isolated unit suite.",
        consent: true,
      },
      idempotencyKey: "90000000-0000-4000-8000-000000000001",
      turnstileToken: "",
      website: "",
      ...overrides,
    }),
  });
}
it("saves an advisor enquiry from a trusted tunnel while consultation intake is disabled", async () => {
  const result = await POST(request());
  expect(result.status).toBe(201);
  expect(mock.guard).toHaveBeenCalledWith(expect.any(Headers), "", "contact", false);
  expect(mock.rpc).toHaveBeenCalledWith("submit_enquiry", expect.objectContaining({ p_team_email: "" }));
});
it("rejects a foreign origin without saving", async () => {
  expect((await POST(request({}, "https://evil.invalid"))).status).toBe(403);
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("rejects a filled honeypot without saving", async () => {
  expect((await POST(request({ website: "spam.invalid" }))).status).toBe(422);
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("requires challenge verification whenever either Turnstile key is configured", async () => {
  vi.stubEnv("TURNSTILE_SECRET_KEY", "test-only");
  mock.guard.mockRejectedValue(Error("Security check required"));
  expect((await POST(request())).status).toBe(429);
  expect(mock.guard).toHaveBeenCalledWith(expect.any(Headers), "", "contact", true);
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("does not report success after a storage failure", async () => {
  mock.rpc.mockResolvedValue({ error: { code: "test_failure" } });
  expect((await POST(request())).status).toBe(500);
});
