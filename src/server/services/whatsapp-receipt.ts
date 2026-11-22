import "server-only";
import sharp from "sharp";
import type { adminClient } from "@/lib/supabase/admin";
import { greenApiConfig } from "./delivery-provider";

export async function sendReceiptAttachment(
  db: ReturnType<typeof adminClient>,
  id: string,
  group: string,
  caption: string,
  signal = AbortSignal.timeout(9000),
  provider = greenApiConfig(),
) {
  if (!provider) return null;
  const receipt = await db.rpc("whatsapp_receipt", { p_file: id, p_group: group }).maybeSingle<{
    storage_path: string;
    mime: string;
  }>();
  if (!receipt.data) return null;
  const file = await db.storage.from("case-files").download(receipt.data.storage_path);
  if (file.error || !file.data) return null;

  const isImage = receipt.data.mime === "image/webp";
  const contents = isImage
    ? await sharp(await file.data.arrayBuffer())
        .jpeg({ quality: 88 })
        .toBuffer()
        .then((buffer) => new Blob([new Uint8Array(buffer)], { type: "image/jpeg" }))
        .catch(() => null)
    : file.data;
  if (!contents) return null;
  const name = isImage ? "ISG-payment-receipt.jpg" : "ISG-payment-receipt.pdf";
  const body = new FormData();
  body.set("chatId", group);
  body.set("file", contents, name);
  body.set("fileName", name);
  body.set("caption", caption);
  const uploaded = await fetch(provider("sendFileByUpload"), {
    method: "POST",
    body,
    redirect: "error",
    signal,
  });
  if (![400, 413, 415, 422].includes(uploaded.status)) return uploaded;
  // Retry as a signed link only when Green API definitively rejected the upload.
  const signed = await db.storage.from("case-files").createSignedUrl(receipt.data.storage_path, 300);
  if (signed.error || !signed.data?.signedUrl) return null;
  const sent = await fetch(provider("sendFileByUrl"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId: group, urlFile: signed.data.signedUrl, fileName: name, caption }),
    signal,
    redirect: "error",
  });
  return [400, 413, 415, 422].includes(sent.status) ? null : sent;
}
