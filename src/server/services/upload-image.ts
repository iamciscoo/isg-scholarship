import "server-only";
import sharp from "sharp";
import { caseFileLimit, caseFileSizeError } from "@/lib/validation/case-file";

export async function normalizeUploadImage(file: File) {
  if (file.size < 1 || file.size > caseFileLimit) throw Error(caseFileSizeError);
  const unspecifiedType = !file.type || file.type === "application/octet-stream";
  if (!unspecifiedType && !["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw Error("Choose a JPEG, PNG, WebP or PDF.");
  const data = Buffer.from(await file.arrayBuffer());
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
  return normalized;
}
