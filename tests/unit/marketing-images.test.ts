import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  requireStaff: vi.fn(),
  rpc: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ requireStaff: mocks.requireStaff }));
vi.mock("@/lib/supabase/admin", () => ({
  adminClient: () => ({
    rpc: mocks.rpc,
    storage: {
      from: (bucket: string) => {
        expect(bucket).toBe("marketing-images");
        return { upload: mocks.upload, remove: mocks.remove };
      },
    },
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import sharp from "sharp";
import { uploadMarketingImage, saveHomepageImage } from "@/features/admin/marketing-actions";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireStaff.mockResolvedValue({ user: { id: "admin" }, db: { rpc: mocks.rpc } });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.upload.mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: null });
});
async function imageForm() {
  const fd = new FormData();
  fd.set("label", "Approved study photo");
  const bytes = await sharp({ create: { width: 8, height: 8, channels: 3, background: "white" } })
    .png()
    .toBuffer();
  fd.set("file", new File([new Uint8Array(bytes)], "original-name.png", { type: "image/png" }));
  return fd;
}
it("publishes sanitized pixels only to the marketing bucket after admin and rate checks", async () => {
  const result = await uploadMarketingImage({}, await imageForm());
  expect(mocks.requireStaff).toHaveBeenCalledWith(true);
  expect(result.image?.path).toMatch(/^\/api\/marketing-images\/[0-9a-f-]+$/);
  const [path, data, options] = mocks.upload.mock.calls[0];
  expect(path).toMatch(/^[0-9a-f-]+\.webp$/);
  expect((await sharp(data).metadata()).format).toBe("webp");
  expect(options.upsert).toBe(false);
  expect(mocks.rpc.mock.calls.map((v) => v[0])).toEqual(["consume_rate_limit", "register_marketing_image"]);
});
it("rejects forged image bytes and never registers an object", async () => {
  const fd = await imageForm();
  fd.set("file", new File(["<script>bad</script>"], "picture.png", { type: "image/png" }));
  expect((await uploadMarketingImage({}, fd)).error).toBeTruthy();
  expect(mocks.upload).not.toHaveBeenCalled();
});
it("cleans up an uploaded object if metadata registration fails", async () => {
  mocks.rpc.mockImplementation(async (name: string) =>
    name === "register_marketing_image" ? { error: { message: "failed" } } : { data: true, error: null },
  );
  expect((await uploadMarketingImage({}, await imageForm())).error).toBeTruthy();
  expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0][0]]);
});
it("fails closed on rate-limit errors", async () => {
  mocks.rpc.mockResolvedValue({ error: { message: "unavailable" } });
  expect((await uploadMarketingImage({}, await imageForm())).error).toBeTruthy();
  expect(mocks.upload).not.toHaveBeenCalled();
});
it("does not allow private receipt paths as a homepage image", async () => {
  const fd = new FormData();
  fd.set("image", "/api/case-files/90000000-0000-4000-8000-000000000001");
  expect((await saveHomepageImage({}, fd)).error).toBeTruthy();
  expect(mocks.rpc).not.toHaveBeenCalled();
});
