import { it, expect, afterEach, vi } from "vitest";
import { createServer, type AddressInfo } from "node:net";
import { PDFiumLibrary } from "@hyzyla/pdfium";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { validateCaseFile } from "@/server/services/file-validation";
import { caseFileLimit, casePdfLimit, casePdfPageLimit } from "@/lib/validation/case-file";

afterEach(() => vi.unstubAllEnvs());

async function makePdf(pages: number) {
  const doc = new PDFDocument({ autoFirstPage: false });
  for (let page = 0; page < pages; page++) {
    doc.addPage().text(`Page ${page + 1}`, { link: "https://example.test/" });
  }
  doc.end();
  const result: Buffer[] = [];
  for await (const chunk of doc) result.push(chunk);
  return Buffer.concat(result);
}

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
it("rebuilds a readable multi-page PDF without a scanner and strips interactive objects", async () => {
  vi.stubEnv("CLAMAV_HOST", "");
  const pdf = await makePdf(2);
  expect(pdf.toString()).toContain("/URI");
  const result = await validateCaseFile(new File([new Uint8Array(pdf)], "receipt.pdf"));
  expect(result.mime).toBe("application/pdf");
  expect(result.data.toString()).not.toContain("/URI");
  expect(result.data.toString()).not.toContain("/Annots");

  const renderer = await PDFiumLibrary.init();
  try {
    const doc = await renderer.loadDocument(result.data);
    try {
      expect(doc.getPageCount()).toBe(2);
      for (const page of doc.pages()) {
        const { data, width, height } = await page.render({ width: 612, height: 792 });
        expect(data.length).toBe(width * height * 4);
        expect(data.some((pixel, index) => index % 4 === 0 && pixel < 80)).toBe(true);
      }
    } finally {
      doc.destroy();
    }
  } finally {
    renderer.destroy();
  }
});

it("preserves the original only after the configured scanner accepts it", async () => {
  const pdf = await makePdf(1);
  const responses = ["stream: OK\0", "stream: TestSignature FOUND\0"];
  const server = createServer((socket) => {
    let bytes = 0;
    socket.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes === Buffer.byteLength("zINSTREAM\0") + 4 + pdf.length + 4) {
        socket.end(responses.shift() ?? "");
      }
    });
  });
  try {
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    vi.stubEnv("CLAMAV_HOST", "127.0.0.1");
    vi.stubEnv("CLAMAV_PORT", String((server.address() as AddressInfo).port));
    const upload = new File([new Uint8Array(pdf)], "transcript.pdf", { type: "application/pdf" });
    expect((await validateCaseFile(upload)).data).toEqual(pdf);
    await expect(validateCaseFile(upload)).rejects.toThrow("scanner rejected");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

it("uses the smaller PDF settings when compression is requested during safe rebuilding", async () => {
  vi.stubEnv("CLAMAV_HOST", "");
  const pdf = new File([new Uint8Array(await makePdf(1))], "transcript.pdf");
  const standard = await validateCaseFile(pdf);
  const compact = await validateCaseFile(pdf, true);
  expect(compact.data.length).toBeLessThan(standard.data.length);
});

it("rejects malformed, oversized and excessively long PDF uploads", async () => {
  vi.stubEnv("CLAMAV_HOST", "");
  await expect(
    validateCaseFile(new File(["%PDF-1.7\n%%EOF"], "receipt.pdf", { type: "application/pdf" })),
  ).rejects.toThrow("could not be read");
  await expect(
    validateCaseFile(new File(["%PDF-1.7\n"], "receipt.pdf", { type: "application/pdf" })),
  ).rejects.toThrow("incomplete");
  await expect(
    validateCaseFile(new File([new Uint8Array(await makePdf(casePdfPageLimit + 1))], "long.pdf")),
  ).rejects.toThrow(`up to ${casePdfPageLimit} pages`);
  await expect(
    validateCaseFile(new File([new Uint8Array(caseFileLimit + 1)], "large.png", { type: "image/png" })),
  ).rejects.toThrow("4 MB or smaller");
  await expect(
    validateCaseFile(new File([new Uint8Array(casePdfLimit + 1)], "large.pdf", { type: "application/pdf" })),
  ).rejects.toThrow("5 MB or smaller");
});
