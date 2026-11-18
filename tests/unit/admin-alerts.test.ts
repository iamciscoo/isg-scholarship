import { afterEach, expect, it, vi } from "vitest";
import { dispatchAdminAlerts } from "@/server/services/admin-alerts";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ adminClient: () => ({ rpc }) }));

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("routes full-form alerts to the specific immutable declaration acceptance", async () => {
  const declarationId = "80000000-0000-4000-8000-000000000001";
  vi.stubEnv("ADMIN_EMAIL_ENABLED", "true");
  vi.stubEnv("RESEND_API_KEY", "test-only");
  vi.stubEnv("RESEND_FROM_EMAIL", "ISG <test@example.invalid>");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://isg.example");
  rpc
    .mockResolvedValueOnce({
      data: [
        {
          id: "test-event",
          lease_id: "test-lease",
          channel: "email",
          event: "application.form_received",
          entity_id: declarationId,
          recipient: "admin@example.invalid",
        },
      ],
      error: null,
    })
    .mockResolvedValue({ error: null });
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: "test-provider-id" }));
  vi.stubGlobal("fetch", fetchMock);

  expect(await dispatchAdminAlerts()).toEqual({ sent: 1, failed: 0, configured: true });
  const message = JSON.parse(fetchMock.mock.calls[0][1].body).text;
  expect(message).toContain(`https://isg.example/admin/declarations/${declarationId}`);
  expect(message).not.toContain("/admin/applications");
  expect(message).not.toContain("legacy@example.invalid");
  expect(rpc).toHaveBeenLastCalledWith(
    "finish_integration_event",
    expect.objectContaining({ p_state: "sent" }),
  );
});
