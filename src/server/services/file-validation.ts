import "server-only";
import sharp from "sharp";
import { createConnection } from "node:net";
import { caseFileLimit, caseFileSizeError, casePdfLimit, casePdfSizeError, isCasePdf } from "@/lib/validation/case-file";
import { rebuildPrivatePdf } from "./private-pdf";

async function scanPdf(data: Buffer, host: string) {
  await new Promise<void>((resolve, reject) => {
    const socket = createConnection({
      host,
      port: Number(process.env.CLAMAV_PORT || 3310),
    });
    let response = "";
    const fail = () => {
      socket.destroy();
      reject(Error("The PDF could not be cleared by the scanner. Please try again or upload an image."));
    };
    socket.setTimeout(20000, fail);
    socket.on("error", fail);
    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      for (let i = 0; i < data.length; i += 65536) {
        const chunk = data.subarray(i, i + 65536);
        const size = Buffer.alloc(4);
        size.writeUInt32BE(chunk.length);
        socket.write(size);
        socket.write(chunk);
      }
      socket.write(Buffer.alloc(4));
    });
    socket.on("data", (chunk) => {
      response += chunk.toString();
      if (response.length > 1024) return fail();
      if (response.includes("\0")) {
        socket.destroy();
        if (response.trim().replace(/\0/g, "") === "stream: OK") resolve();
        else reject(Error("The scanner rejected this PDF."));
      }
    });
    socket.on("end", () => {
      if (!response.includes("\0")) fail();
    });
  });
}
export async function validateCaseFile(file: File, compressPdf = false) {
  const unspecifiedType = !file.type || file.type === "application/octet-stream";
  const pdf = isCasePdf(file) || (unspecifiedType && await file.slice(0, 5).text() === "%PDF-");
  if (file.size < 1 || file.size > (pdf ? casePdfLimit : caseFileLimit))
    throw Error(pdf ? casePdfSizeError : caseFileSizeError);
  const data = Buffer.from(await file.arrayBuffer());
  if (pdf) {
    if (data.subarray(0, 5).toString() !== "%PDF-") throw Error("Choose a valid PDF.");
    if (!data.subarray(-2048).includes(Buffer.from("%%EOF"))) throw Error("This PDF is incomplete.");
    const host = process.env.CLAMAV_HOST;
    if (host) {
      await scanPdf(data, host);
      const compressed = compressPdf ? await rebuildPrivatePdf(data, true).catch(() => null) : null;
      return {
        data: compressed && compressed.length < data.length ? compressed : data,
        mime: "application/pdf",
        extension: "pdf",
      };
    }
    return { data: await rebuildPrivatePdf(data, compressPdf), mime: "application/pdf", extension: "pdf" };
  }
  if (!unspecifiedType && !["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw Error("Choose a JPEG, PNG, WebP or PDF.");
  let normalized: Buffer;
  try {
    const image = sharp(data, { limitInputPixels: 25000000, animated: false });
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format || "")) throw Error();
    normalized = await image
      .rotate()
      .resize({ width: 2000, height: 2600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw Error("This image could not be read. Choose another file.");
  }
  if (normalized.length > caseFileLimit) throw Error(caseFileSizeError);
  return { data: normalized, mime: "image/webp", extension: "webp" };
}
