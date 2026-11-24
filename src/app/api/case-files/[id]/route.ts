import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { authConfigured } from "@/lib/supabase/config";
import { caseFileLimit } from "@/lib/validation/case-file";
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!authConfigured()) return new Response(null, { status: 503 });
  if (!z.uuid().safeParse(id).success) return new Response(null, { status: 404 });
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return new Response(null, { status: 401 });
  const { data: file } = await db
    .from("case_files")
    .select("storage_path,user_id,kind")
    .eq("id", id)
    .maybeSingle();
  if (!file) return new Response(null, { status: 404 });
  const { data: role } = await db.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  const staff = role?.role === "admin" || role?.role === "advisor";
  if (!staff) {
    if (file.user_id !== user.id || file.kind !== "document") return new Response(null, { status: 403 });
    const { data: record } = await db
      .from("consultation_cases")
      .select("current_declaration_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (record?.current_declaration_id) return new Response(null, { status: 409 });
  }
  const admin = adminClient();
  const { error } = await admin.from("case_files").delete().eq("id", id);
  if (error) return new Response(null, { status: 500 });
  await admin.storage.from("case-files").remove([file.storage_path]);
  return new Response(null, { status: 204 });
}
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!authConfigured()) return new Response(null, { status: 503 });
  if (!z.uuid().safeParse(id).success) return new Response(null, { status: 404 });
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return new Response(null, { status: 401 });
  // Metadata RLS is the authorization boundary, including current account status and advisor assignment.
  const { data: file } = await db
    .from("case_files")
    .select("storage_path,mime,kind,bytes,original_name")
    .eq("id", id)
    .maybeSingle();
  if (!file) return new Response(null, { status: 404 });
  const storage = adminClient().storage.from("case-files");
  const name = `ISG-${file.kind}-${id}.${file.mime === "application/pdf" ? "pdf" : "webp"}`;
  const original = file.original_name || name;
  const privateHeaders = {
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  };
  // Previously accepted files can exceed Vercel's response limit. Authorize these
  // through RLS before redirecting to a short-lived, private attachment URL.
  if (file.bytes > caseFileLimit) {
    const { data, error } = await storage.createSignedUrl(file.storage_path, 60, { download: original });
    if (error || !data) return new Response(null, { status: 404 });
    return new Response(null, { status: 307, headers: { ...privateHeaders, Location: data.signedUrl } });
  }
  const { data, error } = await storage.download(file.storage_path);
  if (error || !data) return new Response(null, { status: 404 });
  const inline =
    new URL(request.url).searchParams.get("preview") === "1" &&
    ["image/webp", "application/pdf"].includes(file.mime);
  return new Response(data, {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name}"; filename*=UTF-8''${encodeURIComponent(original).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)}`,
      ...privateHeaders,
      "Content-Security-Policy": inline
        ? "sandbox; default-src 'none'; frame-ancestors 'self'"
        : "sandbox; default-src 'none'",
      "X-Frame-Options": inline ? "SAMEORIGIN" : "DENY",
    },
  });
}
