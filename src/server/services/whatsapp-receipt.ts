import "server-only";
import sharp from "sharp";
import type { adminClient } from "@/lib/supabase/admin";
import { greenApiConfig } from "./delivery-provider";

export class ReceiptDeliveryError extends Error {
  constructor(
    readonly state: "pending" | "failed",
    message: string,
  ) {
    super(message);
  }
}

export function receiptCaption(message: string) {
  if (message.length <= 1024) return message;
  const link = message.lastIndexOf("\nOpen ISG: ");
  const tail = link >= 0 ? message.slice(link) : "";
  return `${message.slice(0, Math.max(0, 1023 - tail.length))}…${tail}`;
}

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
  if (receipt.error) throw new ReceiptDeliveryError("pending", "receipt_lookup_unavailable");
  if (!receipt.data) return null;
  const file = await db.storage.from("case-files").download(receipt.data.storage_path);
  if (file.error || !file.data) throw new ReceiptDeliveryError("pending", "receipt_storage_unavailable");

  const isImage = receipt.data.mime === "image/webp";
  const contents = isImage
    ? await sharp(await file.data.arrayBuffer())
        .jpeg({ quality: 88 })
        .toBuffer()
        .then((buffer) => new Blob([new Uint8Array(buffer)], { type: "image/jpeg" }))
        .catch(() => null)
    : file.data;
  if (!contents) throw new ReceiptDeliveryError("failed", "receipt_image_unreadable");
  const name = isImage ? "ISG-payment-receipt.jpg" : "ISG-payment-receipt.pdf";
  const body = new FormData();
  body.set("chatId", group);
  body.set("file", contents, name);
  body.set("fileName", name);
  const description = receiptCaption(caption);
  body.set("caption", description);
  const uploaded = await fetch(provider("sendFileByUpload"), {
    method: "POST",
    body,
    redirect: "error",
    signal,
  });
  if (![400, 413, 415, 422].includes(uploaded.status)) return uploaded;
  // Retry as a signed link only when Green API definitively rejected the upload.
  const signed = await db.storage.from("case-files").createSignedUrl(receipt.data.storage_path, 300);
  if (signed.error || !signed.data?.signedUrl)
    throw new ReceiptDeliveryError("pending", "receipt_link_unavailable");
  const sent = await fetch(provider("sendFileByUrl"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chatId: group,
      urlFile: signed.data.signedUrl,
      fileName: name,
      caption: description,
    }),
    signal,
    redirect: "error",
  });
  if ([400, 413, 415, 422].includes(sent.status))
    throw new ReceiptDeliveryError("failed", `receipt_media_rejected_${sent.status}`);
  return sent;
}
