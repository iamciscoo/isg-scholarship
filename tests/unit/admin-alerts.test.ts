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
          payload: { applicantName: "Test Applicant", status: "Submitted", applicationName: "Engineering" },
        },
      ],
      error: null,
    })
    .mockResolvedValue({ error: null });
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: "test-provider-id" }));
  vi.stubGlobal("fetch", fetchMock);

  expect(await dispatchAdminAlerts("https://isg.example")).toEqual({ sent: 1, failed: 0, configured: true });
  const message = JSON.parse(fetchMock.mock.calls[0][1].body).text;
  expect(message).toContain(`https://isg.example/admin/declarations/${declarationId}`);
  expect(message).not.toContain("/admin/applications");
  expect(message).not.toContain("legacy@example.invalid");
  expect(message).toContain("Applicant: Test Applicant");
  expect(message).toContain("Status: Submitted");
  expect(message).toContain("Application: Engineering");
  expect(rpc).toHaveBeenLastCalledWith(
    "finish_integration_event",
    expect.objectContaining({ p_state: "sent" }),
  );
});

it("queues a throttled WhatsApp alert for retry and uses the configured instance", async () => {
  vi.stubEnv("ADMIN_EMAIL_ENABLED", "false");
  vi.stubEnv("GREEN_API_URL", "https://7107.api.greenapi.com/");
  vi.stubEnv("GREEN_API_INSTANCE_ID", "123456");
  vi.stubEnv("GREEN_API_TOKEN", "test-token");
  rpc
    .mockResolvedValueOnce({
      data: [
        {
          id: "event",
          lease_id: "lease",
          channel: "whatsapp",
          event: "whatsapp_call.requested",
          entity_id: "80000000-0000-4000-8000-000000000001",
          recipient: "123456-222333@g.us",
          payload: { applicantName: "Test Applicant", status: "Requested" },
        },
      ],
    })
    .mockResolvedValue({ error: null });
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 429 }));
  vi.stubGlobal("fetch", fetchMock);

  expect(await dispatchAdminAlerts("https://isg.example")).toEqual({ sent: 0, failed: 1, configured: true });
  expect(fetchMock.mock.calls[0][0]).toBe(
    "https://7107.api.greenapi.com/waInstance123456/sendMessage/test-token",
  );
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
    chatId: "123456-222333@g.us",
    message: expect.stringContaining("WhatsApp consultation requested"),
  });
  expect(rpc).toHaveBeenLastCalledWith(
    "finish_integration_event",
    expect.objectContaining({
      p_state: "pending",
      p_error: "whatsapp_http_429",
    }),
  );
});
