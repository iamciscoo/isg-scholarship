import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("@/server/services/notification-delivery", () => ({ wakeNotifications: vi.fn() }));
import { assessment } from "../fixtures/assessment";
const mock = vi.hoisted(() => ({ rpc: vi.fn(), guard: vi.fn(), user: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ adminClient: () => ({ rpc: mock.rpc }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mock.user } }) }));
vi.mock("@/server/services/intake", () => ({ guardIntake: mock.guard, payloadHash: () => "test-hash" }));
import { POST } from "@/app/api/assessments/route";
beforeEach(() => {
  vi.clearAllMocks();
  for (const [key, value] of Object.entries({
    NEXT_PUBLIC_SITE_URL: "https://preview.ngrok-free.dev",
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-key",
    SUPABASE_SERVICE_ROLE_KEY: "test-only",
    INTAKE_ENABLED: "true",
    TURNSTILE_SECRET_KEY: "",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
  }))
    vi.stubEnv(key, value);
  mock.user.mockResolvedValue({
    data: { user: { id: "90000000-0000-4000-8000-000000000020", email: assessment.email } },
  });
  mock.guard.mockResolvedValue(undefined);
  mock.rpc.mockResolvedValue({ data: "ISG-test-reference", error: null });
});
afterEach(() => vi.unstubAllEnvs());
function request(data: unknown = assessment) {
  return new Request("https://preview.ngrok-free.dev/api/assessments", {
    method: "POST",
    headers: { origin: "https://preview.ngrok-free.dev", "Content-Type": "application/json" },
    body: JSON.stringify({
      data,
      idempotencyKey: "90000000-0000-4000-8000-000000000001",
      turnstileToken: "",
      website: "",
    }),
  });
}
it("accepts authenticated consented submissions without unconfigured Turnstile", async () => {
  expect((await POST(request())).status).toBe(201);
  expect(mock.guard).toHaveBeenCalledWith(expect.any(Headers), "", "assessment", false);
  expect(mock.rpc).toHaveBeenCalledWith(
    "submit_my_consultation",
    expect.objectContaining({ p_user: "90000000-0000-4000-8000-000000000020", p_data: assessment }),
  );
});
it("requires a signed-in account", async () => {
  mock.user.mockResolvedValue({ data: { user: null } });
  expect((await POST(request())).status).toBe(401);
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("rejects a different account email", async () => {
  expect((await POST(request({ ...assessment, email: "someone@example.invalid" }))).status).toBe(422);
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("requires processing consent", async () => {
  expect((await POST(request({ ...assessment, processingConsent: false }))).status).toBe(422);
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("fails closed when configured challenge verification fails", async () => {
  vi.stubEnv("TURNSTILE_SECRET_KEY", "test-only");
  mock.guard.mockRejectedValue(Error("Security check required"));
  expect((await POST(request())).status).toBe(429);
  expect(mock.guard).toHaveBeenCalledWith(expect.any(Headers), "", "assessment", true);
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("also requires verification when only the public challenge key is configured", async () => {
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "test-only");
  mock.guard.mockRejectedValue(Error("Security check required"));
  expect((await POST(request())).status).toBe(429);
  expect(mock.guard).toHaveBeenCalledWith(expect.any(Headers), "", "assessment", true);
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("honours the consultation pause flag", async () => {
  vi.stubEnv("INTAKE_ENABLED", "false");
  expect((await POST(request())).status).toBe(503);
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("does not claim a saved consultation after database failure", async () => {
  mock.rpc.mockResolvedValue({ error: { code: "test-error" } });
  expect((await POST(request())).status).toBe(500);
});
