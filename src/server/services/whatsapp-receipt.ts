import "server-only";
import sharp from "sharp";
import type { adminClient } from "@/lib/supabase/admin";

export async function sendReceiptAttachment(
  db: ReturnType<typeof adminClient>,
  id: string,
  group: string,
  caption: string,
  signal = AbortSignal.timeout(12000),
) {
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
  // Direct upload is preferred, but the media host drops connections from some networks.
  try {
    const uploaded = await fetch(
      `https://media.green-api.com/waInstance${process.env.GREEN_API_INSTANCE_ID}/sendFileByUpload/${process.env.GREEN_API_TOKEN}`,
      { method: "POST", body, redirect: "error", signal },
    );
    if (uploaded.ok) return uploaded;
  } catch {
    /* fall through to the signed-link send */
  }
  // Fallback: a five-minute signed link keeps the private object reachable for the provider only.
  const signed = await db.storage.from("case-files").createSignedUrl(receipt.data.storage_path, 300);
  if (signed.error || !signed.data?.signedUrl) return null;
  try {
    const sent = await fetch(
      `https://7107.api.greenapi.com/waInstance${process.env.GREEN_API_INSTANCE_ID}/sendFileByUrl/${process.env.GREEN_API_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: group, urlFile: signed.data.signedUrl, fileName: name, caption }),
        signal: AbortSignal.timeout(20000),
      },
    );
    return sent.ok ? sent : null;
  } catch {
    return null;
  }
}
