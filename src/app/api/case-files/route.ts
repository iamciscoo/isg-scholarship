import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { sameOrigin } from "@/lib/security/request";
import { validateCaseFile } from "@/server/services/file-validation";
import { authConfigured } from "@/lib/supabase/config";
import { z } from "zod";
import { isPreviewPackage } from "@/lib/validation/opportunities";
import { caseFileLimit, caseFileSizeError, caseUploadKinds } from "@/lib/validation/case-file";
import { wakeNotifications } from "@/server/services/notification-delivery";
import { storageBody } from "@/server/services/storage-body";
import { stagedPdfPath, stagedPdfStorage } from "@/server/services/case-pdf-staging";

export const maxDuration = 60;

const uploadBodyLimit = caseFileLimit + 64 * 1024;

export async function POST(request: Request) {
  if (!sameOrigin(request.headers.get("origin"), request.headers))
    return Response.json({ error: "Request origin is not allowed." }, { status: 403 });
  if (!authConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return Response.json({ error: "Private uploads are not configured." }, { status: 503 });
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Sign in to upload." }, { status: 401 });
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.startsWith("multipart/form-data;"))
    return Response.json({ error: "Choose a valid file to upload." }, { status: 415 });
  const contentLength = Number(request.headers.get("content-length"));
  if (contentLength > uploadBodyLimit) return Response.json({ error: caseFileSizeError }, { status: 413 });
  const admin = adminClient();
  const rate = await admin.rpc("consume_rate_limit", {
    p_key: `case-upload:${user.id}`,
    p_limit: 30,
    p_seconds: 900,
  });
  if (rate.error || !rate.data)
    return Response.json({ error: "Please wait before uploading again." }, { status: 429 });
  let stagedPath: string | undefined;
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = request.body?.getReader();
    if (!reader) throw Error("Choose a file.");
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > uploadBodyLimit) {
        await reader.cancel();
        return Response.json({ error: caseFileSizeError }, { status: 413 });
      }
      chunks.push(value);
    }
    const fd = await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": contentType },
    }).formData();
    let file = fd.get("file");
    const preparing = fd.get("preparePdf") === "1";
    const pdfId = z.uuid().nullable().safeParse(fd.get("pdfId"));
    const kindInput = z.enum(caseUploadKinds).safeParse(fd.get("kind"));
    const category = z
      .string()
      .regex(/^[a-z][a-z0-9_]{0,79}$/)
      .safeParse(fd.get("category"));
    const application = z.uuid().nullable().safeParse(fd.get("application"));
    const applicant = z.uuid().nullable().safeParse(fd.get("applicant"));
    if (
      !pdfId.success ||
      Number(file instanceof File) + Number(preparing) + Number(Boolean(pdfId.data)) !== 1 ||
      !kindInput.success ||
      !application.success ||
      !applicant.success ||
      !category.success ||
      (application.data && kindInput.data !== "receipt")
    )
      throw Error("Choose a valid file and category.");
    const kind = kindInput.data;
    const owner = applicant.data || user.id;
    const staffUpload = applicant.data !== null;
    if (staffUpload) {
      const { data: role } = await db.from("user_roles").select("role").eq("user_id", user.id).single();
      const permitted =
        kind === "receipt" ? role?.role === "admin" : role && ["admin", "advisor"].includes(role.role);
      if (!permitted)
        return Response.json({ error: "You cannot upload for this applicant." }, { status: 403 });
    }
    const { data: record, error: caseError } = await db
      .from("consultation_cases")
      .select("user_id,payment_status,completed_at")
      .eq("user_id", owner)
      .maybeSingle();
    if (caseError) throw Error("The consultation could not be loaded. Try again.");
    if (!record) return Response.json({ error: "Consultation unavailable." }, { status: 403 });
    if (
      kind === "receipt" &&
      !application.data &&
      ["verified", "pending_verification"].includes(record.payment_status)
    )
      throw Error("Your payment is already submitted.");
    let shareReceipt = kind === "receipt";
    if (application.data) {
      const { data: target } = await db
        .from("study_applications")
        .select("package_state,status,proposal")
        .eq("id", application.data)
        .eq("user_id", owner)
        .maybeSingle();
      if (
        !target ||
        target.status !== "Starting" ||
        !["awaiting_receipt", "receipt_rejected"].includes(target.package_state)
      )
        throw Error("Package payment is not available. Refresh your application.");
      if (isPreviewPackage(target.proposal?.name)) shareReceipt = false;
    }
    if (kind === "document") {
      if (!record.completed_at || record.payment_status !== "verified")
        throw Error("Your application form is not unlocked yet.");
      const { data: documentRequest, error } = await db
        .from("document_requests")
        .select("id")
        .eq("user_id", owner)
        .eq("category", category.data)
        .maybeSingle();
      if (error || !documentRequest)
        throw Error("This document category is unavailable. Refresh and try again.");
    }
    if (preparing) {
      const id = randomUUID();
      const signed = await stagedPdfStorage(admin).createSignedUploadUrl(stagedPdfPath(user.id, id));
      if (signed.error) throw Error("Private storage is unavailable. Please try again.");
      return Response.json({ id, url: signed.data.signedUrl }, { headers: { "Cache-Control": "no-store" } });
    }
    if (pdfId.data) {
      const path = stagedPdfPath(user.id, pdfId.data);
      const staged = await stagedPdfStorage(admin).download(path);
      if (staged.error || !staged.data) throw Error("The PDF upload is incomplete. Please try again.");
      stagedPath = path;
      file = new File([staged.data], "upload.pdf", { type: "application/pdf" });
    }
    if (!(file instanceof File)) throw Error("Choose a valid file to upload.");
    const validated = await validateCaseFile(file, true);
    const id = pdfId.data || randomUUID();
    const path = `${owner}/${id}.${validated.extension}`;
    const upload = await admin.storage
      .from("case-files")
      .upload(path, storageBody(validated.data), { contentType: validated.mime, upsert: false });
    if (upload.error) {
      console.error("case_file_storage_failed", {
        name: upload.error.name,
        status: "statusCode" in upload.error ? upload.error.statusCode : null,
      });
      throw Error("Private storage is unavailable. Please try again.");
    }
    const suppliedName = fd.get("originalName");
    const originalName = (typeof suppliedName === "string" ? suppliedName : file.name)
      .replace(/[\p{Cc}\p{Cf}\/\\]/gu, "")
      .trim();
    const name = Array.from(originalName).slice(0, 180).join("");
    const registered =
      staffUpload && kind === "receipt"
        ? await db.rpc("register_admin_payment_file", {
            p_user: owner,
            p_id: id,
            p_path: path,
            p_mime: validated.mime,
            p_bytes: validated.data.length,
            p_hash: createHash("sha256").update(validated.data).digest("hex"),
            p_application: application.data,
            p_name: name,
          })
        : staffUpload
          ? await db.rpc("register_staff_application_file", {
              p_user: owner,
              p_id: id,
              p_category: category.data,
              p_path: path,
              p_mime: validated.mime,
              p_bytes: validated.data.length,
              p_hash: createHash("sha256").update(validated.data).digest("hex"),
              p_name: name,
            })
          : await admin.rpc("register_uploaded_case_file", {
              p_user: owner,
              p_id: id,
              p_kind: kind,
              p_category: category.data,
              p_path: path,
              p_mime: validated.mime,
              p_bytes: validated.data.length,
              p_hash: createHash("sha256").update(validated.data).digest("hex"),
              p_application: application.data,
              p_share_receipt: shareReceipt,
              p_name: name,
            });
    if (registered.error) {
      if (/^(22|23|42|P0)/.test(registered.error.code)) await admin.storage.from("case-files").remove([path]);
      console.error("case_file_registration_failed", { code: registered.error.code });
      if (registered.error.message === "Payment already submitted")
        throw Error("Your payment receipt is already submitted.");
      throw Error("The file could not be attached. Please refresh and try again.");
    }
    wakeNotifications();
    return Response.json({ id }, { status: 201 });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Upload failed." }, { status: 422 });
  } finally {
    if (stagedPath) {
      const removed = await stagedPdfStorage(admin).remove([stagedPath]).catch(() => null);
      if (!removed || removed.error) console.error("staged_case_pdf_cleanup_failed");
    }
  }
}
