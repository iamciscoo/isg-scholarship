import { afterEach, expect, it, vi } from "vitest";
import { sendReceiptAttachment } from "@/server/services/whatsapp-receipt";

const id = "80000000-0000-4000-8000-000000000001";
const group = "123456789@g.us";
function fixture(allowed: boolean) {
  const download = vi
    .fn()
    .mockResolvedValue({ data: new Blob(["%PDF-test-only"], { type: "application/pdf" }) });
  const db = {
    rpc: vi.fn().mockReturnValue({
      maybeSingle: async () => ({
        data: allowed ? { storage_path: "approved.pdf", mime: "application/pdf" } : null,
      }),
    }),
    storage: { from: vi.fn().mockReturnValue({ download }) },
  };
  return { db: db as unknown as Parameters<typeof sendReceiptAttachment>[0], download };
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("uploads the approved receipt as multipart media for the authorized group", async () => {
  vi.stubEnv("GREEN_API_INSTANCE_ID", "123456");
  vi.stubEnv("GREEN_API_TOKEN", "fixture-token");
  const fetcher = vi.fn().mockResolvedValue(Response.json({ idMessage: "fixture-message" }));
  vi.stubGlobal("fetch", fetcher);
  const { db, download } = fixture(true);
  expect((await sendReceiptAttachment(db, id, group, "Open ISG to verify."))?.ok).toBe(true);
  expect(db.rpc).toHaveBeenCalledWith("whatsapp_receipt", { p_file: id, p_group: group });
  expect(download).toHaveBeenCalledWith("approved.pdf");
  const [url, { body }] = fetcher.mock.calls[0];
  expect(url).toBe("https://media.green-api.com/waInstance123456/sendFileByUpload/fixture-token");
  expect(body.get("chatId")).toBe(group);
  expect(body.get("file").name).toBe("ISG-payment-receipt.pdf");
});

it("falls back to the secure link when attachment permission is absent or the provider refuses the file", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 415 }));
  vi.stubGlobal("fetch", fetcher);
  const denied = fixture(false);
  expect(await sendReceiptAttachment(denied.db, id, group, "")).toBeNull();
  expect(denied.download).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
  expect(await sendReceiptAttachment(fixture(true).db, id, group, "")).toBeNull();
});
