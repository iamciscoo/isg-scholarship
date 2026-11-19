import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { sameOrigin } from "@/lib/security/request";
import { validateCaseFile } from "@/server/services/file-validation";
import { authConfigured } from "@/lib/supabase/config";
import { z } from "zod";
export async function POST(request: Request) {
  if (!sameOrigin(request.headers.get("origin"), request.headers))
    return Response.json({ error: "Request origin is not allowed." }, { status: 403 });
  if (!authConfigured())
    return Response.json({ error: "Private uploads are not configured." }, { status: 503 });
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Sign in to upload." }, { status: 401 });
  const { data: record } = await db
    .from("consultation_cases")
    .select("user_id,payment_status,completed_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!record) return Response.json({ error: "Submit your consultation first." }, { status: 403 });
  const admin = adminClient();
  const rate = await admin.rpc("consume_rate_limit", {
    p_key: `case-upload:${user.id}`,
    p_limit: 15,
    p_seconds: 900,
  });
  if (rate.error || !rate.data)
    return Response.json({ error: "Please wait before uploading again." }, { status: 429 });
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = request.body?.getReader();
    if (!reader) throw Error("Choose a file.");
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 9 * 1024 * 1024) {
        await reader.cancel();
        throw Error("Choose a file under 8 MB.");
      }
      chunks.push(value);
    }
    const fd = await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": request.headers.get("content-type") || "" },
    }).formData();
    const file = fd.get("file"),
      kind = fd.get("kind"),
      category = String(fd.get("category") || "");
    const application = z.uuid().nullable().safeParse(fd.get("application"));
    if (
      !(file instanceof File) ||
      !application.success ||
      (application.data && kind !== "receipt") ||
      !["receipt", "document"].includes(String(kind)) ||
      !category ||
      category.length > 80
    )
      throw Error("Choose a valid file and category.");
    if (
      kind === "receipt" &&
      !application.data &&
      ["verified", "pending_verification"].includes(record.payment_status)
    )
      throw Error("Your payment is already submitted.");
    if (application.data) {
      const { data: target } = await db
        .from("study_applications")
        .select("package_state,status")
        .eq("id", application.data)
        .eq("user_id", user.id)
        .maybeSingle();
      if (
        !target ||
        target.status !== "Starting" ||
        !["awaiting_receipt", "receipt_rejected"].includes(target.package_state)
      )
        throw Error("Package payment is not available. Refresh your application.");
    }
    if (kind === "document" && !record.completed_at)
      throw Error("Your application form is not unlocked yet.");
    const validated = await validateCaseFile(file);
    const id = randomUUID(),
      path = `${user.id}/${id}.${validated.extension}`;
    const upload = await admin.storage
      .from("case-files")
      .upload(path, validated.data, { contentType: validated.mime, upsert: false });
    if (upload.error) throw Error("Private storage is unavailable. Please try again.");
    const registered = await admin.rpc("register_payment_file", {
      p_user: user.id,
      p_id: id,
      p_kind: kind,
      p_category: category,
      p_path: path,
      p_mime: validated.mime,
      p_bytes: validated.data.length,
      p_hash: createHash("sha256").update(validated.data).digest("hex"),
      p_application: application.data,
      p_share_receipt: kind === "receipt" && fd.get("shareReceipt") === "on",
    });
    if (registered.error) {
      if (/^(22|23|42|P0)/.test(registered.error.code)) await admin.storage.from("case-files").remove([path]);
      throw Error("The file could not be attached. Please refresh and try again.");
    }
    return Response.json({ id }, { status: 201 });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Upload failed." }, { status: 422 });
  }
}
