import "server-only";
import sharp from "sharp";
import { createConnection } from "node:net";
export async function scanPdf(data: Buffer) {
  if (!process.env.CLAMAV_HOST)
    throw Error("PDF scanning is not configured. Upload a clear image or contact ISG.");
  await new Promise<void>((resolve, reject) => {
    const socket = createConnection({
      host: process.env.CLAMAV_HOST!,
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
export async function validateCaseFile(file: File) {
  if (file.size < 1 || file.size > 8 * 1024 * 1024) throw Error("Choose a file under 8 MB.");
  const data = Buffer.from(await file.arrayBuffer());
  if (file.type === "application/pdf" && data.subarray(0, 5).toString() === "%PDF-") {
    if (!data.subarray(-2048).includes(Buffer.from("%%EOF"))) throw Error("This PDF is incomplete.");
    await scanPdf(data);
    return { data, mime: "application/pdf", extension: "pdf" };
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw Error("Choose a JPEG, PNG, WebP or PDF.");
  try {
    const image = sharp(data, { limitInputPixels: 25000000, animated: false });
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format || "")) throw Error();
    return {
      data: await image
        .rotate()
        .resize({ width: 2000, height: 2600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer(),
      mime: "image/webp",
      extension: "webp",
    };
  } catch {
    throw Error("This image could not be read. Choose another file.");
  }
}
