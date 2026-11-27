import "server-only";
import { createConnection } from "node:net";
import { casePdfLimit, casePdfSizeError, isCasePdf } from "@/lib/validation/case-file";
import { rebuildPrivatePdf } from "./private-pdf";
import { normalizeUploadImage } from "./upload-image";

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
  if (!pdf) return { data: await normalizeUploadImage(file), mime: "image/webp", extension: "webp" };
  if (file.size < 1 || file.size > casePdfLimit) throw Error(casePdfSizeError);
  const data = Buffer.from(await file.arrayBuffer());
  if (data.subarray(0, 5).toString() !== "%PDF-") throw Error("Choose a valid PDF.");
  if (!data.subarray(-2048).includes(Buffer.from("%%EOF"))) throw Error("This PDF is incomplete.");
  const host = process.env.CLAMAV_HOST;
  const shouldCompress = compressPdf && data.length > 1024 * 1024;
  if (host) {
    await scanPdf(data, host);
    const compressed = shouldCompress ? await rebuildPrivatePdf(data, true).catch(() => null) : null;
    return {
      data: compressed && compressed.length < data.length ? compressed : data,
      mime: "application/pdf",
      extension: "pdf",
    };
  }
  return { data: await rebuildPrivatePdf(data, shouldCompress), mime: "application/pdf", extension: "pdf" };
}
