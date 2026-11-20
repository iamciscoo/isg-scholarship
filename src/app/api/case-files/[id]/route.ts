import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { authConfigured } from "@/lib/supabase/config";
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
    .select("storage_path,mime,kind")
    .eq("id", id)
    .maybeSingle();
  if (!file) return new Response(null, { status: 404 });
  const { data, error } = await adminClient().storage.from("case-files").download(file.storage_path);
  if (error || !data) return new Response(null, { status: 404 });
  const inline =
    file.kind === "receipt" &&
    new URL(request.url).searchParams.get("preview") === "1" &&
    ["application/pdf", "image/webp"].includes(file.mime);
  return new Response(data, {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="ISG-${file.kind}-${id}.${file.mime === "application/pdf" ? "pdf" : "webp"}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": inline
        ? "default-src 'none'; frame-ancestors 'self'"
        : "sandbox; default-src 'none'",
      "X-Frame-Options": inline ? "SAMEORIGIN" : "DENY",
    },
  });
}
