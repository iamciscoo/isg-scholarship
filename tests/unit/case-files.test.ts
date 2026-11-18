import { it, expect, afterEach, vi } from "vitest";
import sharp from "sharp";
import { validateCaseFile } from "@/server/services/file-validation";
afterEach(() => vi.unstubAllEnvs());
it("decodes and re-encodes image content rather than trusting its name or MIME", async () => {
  const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "white" } })
    .png()
    .toBuffer();
  const result = await validateCaseFile(
    new File([new Uint8Array(png)], "untrusted-name.png", { type: "image/png" }),
  );
  expect(result.mime).toBe("image/webp");
  expect((await sharp(result.data).metadata()).format).toBe("webp");
  await expect(
    validateCaseFile(
      new File(["<svg><script>alert(1)</script></svg>"], "receipt.png", { type: "image/png" }),
    ),
  ).rejects.toThrow("could not be read");
});
it("fails PDF uploads closed without scanning and rejects oversized files", async () => {
  vi.stubEnv("CLAMAV_HOST", "");
  await expect(
    validateCaseFile(new File(["%PDF-1.7\n%%EOF"], "receipt.pdf", { type: "application/pdf" })),
  ).rejects.toThrow("scanning is not configured");
  await expect(
    validateCaseFile(new File([new Uint8Array(8 * 1024 * 1024 + 1)], "large.png", { type: "image/png" })),
  ).rejects.toThrow("under 8 MB");
});
