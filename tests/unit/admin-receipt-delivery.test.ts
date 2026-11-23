import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ rpc: vi.fn(), attachment: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ adminClient: () => ({ rpc: mock.rpc }) }));
vi.mock("@/server/services/whatsapp-receipt", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/services/whatsapp-receipt")>()),
  sendReceiptAttachment: mock.attachment,
}));
import { dispatchAdminAlerts } from "@/server/services/admin-alerts";
import { ReceiptDeliveryError } from "@/server/services/whatsapp-receipt";
beforeEach(() => {
  vi.stubEnv("ADMIN_EMAIL_ENABLED", "false");
  vi.stubEnv("GREEN_API_URL", "https://7107.api.greenapi.com");
  vi.stubEnv("GREEN_API_INSTANCE_ID", "123456");
  vi.stubEnv("GREEN_API_TOKEN", "test-only");
  mock.rpc
    .mockResolvedValueOnce({
      data: [
        {
          id: "event",
          lease_id: "lease",
          channel: "whatsapp",
          event: "payment.receipt_received",
          entity_id: "80000000-0000-4000-8000-000000000001",
          recipient: "123456789@g.us",
          payload: { applicantName: "Test Scholar", documentName: "receipt.pdf" },
        },
      ],
    })
    .mockResolvedValue({ error: null });
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("keeps a receipt pending when its attachment cannot be read instead of sending only text", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  mock.attachment.mockRejectedValue(new ReceiptDeliveryError("pending", "receipt_storage_unavailable"));
  expect(await dispatchAdminAlerts("https://isg.example")).toMatchObject({ sent: 0, failed: 1 });
  expect(fetcher).not.toHaveBeenCalled();
  expect(mock.rpc).toHaveBeenLastCalledWith(
    "finish_integration_event",
    expect.objectContaining({ p_state: "pending", p_error: "receipt_storage_unavailable" }),
  );
});
it("records the provider identifier from the file message without sending a duplicate text", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  mock.attachment.mockResolvedValue(Response.json({ idMessage: "file-message" }));
  expect(await dispatchAdminAlerts("https://isg.example")).toMatchObject({ sent: 1, failed: 0 });
  expect(fetcher).not.toHaveBeenCalled();
  expect(mock.rpc).toHaveBeenLastCalledWith(
    "finish_integration_event",
    expect.objectContaining({ p_state: "sent", p_provider: "file-message" }),
  );
});
