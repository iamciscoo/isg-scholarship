import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { sendReceiptAttachment, receiptCaption } from "@/server/services/whatsapp-receipt";

const id = "80000000-0000-4000-8000-000000000001";
const group = "123456789@g.us";
function fixture(allowed: boolean) {
  const download = vi
    .fn()
    .mockResolvedValue({ data: new Blob(["%PDF-test-only"], { type: "application/pdf" }) });
  const createSignedUrl = vi.fn().mockResolvedValue({
    data: { signedUrl: "https://signed.example/receipt" },
  });
  const db = {
    rpc: vi.fn().mockReturnValue({
      maybeSingle: async () => ({
        data: allowed ? { storage_path: "approved.pdf", mime: "application/pdf" } : null,
      }),
    }),
    storage: { from: vi.fn().mockReturnValue({ download, createSignedUrl }) },
  };
  return { db: db as unknown as Parameters<typeof sendReceiptAttachment>[0], download, createSignedUrl };
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.stubEnv("GREEN_API_URL", "https://7107.api.greenapi.com");
  vi.stubEnv("GREEN_API_INSTANCE_ID", "123456");
  vi.stubEnv("GREEN_API_TOKEN", "fixture-token");
});

it("uploads the approved receipt as multipart media for the authorized group", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ idMessage: "fixture-message" }));
  vi.stubGlobal("fetch", fetcher);
  const { db, download } = fixture(true);
  expect((await sendReceiptAttachment(db, id, group, "Open ISG to verify."))?.ok).toBe(true);
  expect(db.rpc).toHaveBeenCalledWith("whatsapp_receipt", { p_file: id, p_group: group });
  expect(download).toHaveBeenCalledWith("approved.pdf");
  const [url, { body }] = fetcher.mock.calls[0];
  expect(url).toBe("https://7107.api.greenapi.com/waInstance123456/sendFileByUpload/fixture-token");
  expect(body.get("chatId")).toBe(group);
  expect(body.get("file").name).toBe("ISG-payment-receipt.pdf");
});

it("skips the attachment when the receipt is not shared with the group", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const denied = fixture(false);
  expect(await sendReceiptAttachment(denied.db, id, group, "")).toBeNull();
  expect(denied.download).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});

it("falls back to a five-minute signed link when the media upload is refused", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 415 }))
    .mockResolvedValueOnce(Response.json({ idMessage: "link-message" }));
  vi.stubGlobal("fetch", fetcher);
  const { db, createSignedUrl } = fixture(true);
  expect((await sendReceiptAttachment(db, id, group, "Open ISG to verify."))?.ok).toBe(true);
  expect(createSignedUrl).toHaveBeenCalledWith("approved.pdf", 300);
  const [url, { body }] = fetcher.mock.calls[1];
  expect(url).toBe("https://7107.api.greenapi.com/waInstance123456/sendFileByUrl/fixture-token");
  expect(JSON.parse(body).urlFile).toBe("https://signed.example/receipt");
});

it("does not send another copy after an unconfirmed upload", async () => {
  const fetcher = vi.fn().mockRejectedValue(new Error("connection closed after request"));
  vi.stubGlobal("fetch", fetcher);
  const { db, createSignedUrl } = fixture(true);
  await expect(sendReceiptAttachment(db, id, group, "Open ISG to verify.")).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(createSignedUrl).not.toHaveBeenCalled();
});

it("keeps the receipt pending when private storage is unavailable", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const { db, download } = fixture(true);
  download.mockResolvedValue({ data: null, error: { message: "Unavailable" } });
  await expect(sendReceiptAttachment(db, id, group, "")).rejects.toMatchObject({
    state: "pending",
    message: "receipt_storage_unavailable",
  });
  expect(fetcher).not.toHaveBeenCalled();
});

it("reports definite media rejection without falling back to a text-only success", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 415 })));
  const { db } = fixture(true);
  await expect(sendReceiptAttachment(db, id, group, "")).rejects.toMatchObject({
    state: "failed",
    message: "receipt_media_rejected_415",
  });
});

it("fits captions to Green API limits and preserves the applicant and review link", () => {
  const link = "\nOpen ISG: https://isg.example/admin/receipts/" + id;
  const caption = receiptCaption("Applicant: Test Scholar\n" + "Details ".repeat(400) + link);
  expect(caption.length).toBeLessThanOrEqual(1024);
  expect(caption).toContain("Applicant: Test Scholar");
  expect(caption.endsWith(link)).toBe(true);
});
