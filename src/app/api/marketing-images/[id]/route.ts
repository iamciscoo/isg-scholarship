import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { authConfigured } from "@/lib/supabase/config";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response(null, { status: 404 });
  if (!authConfigured()) return new Response(null, { status: 503 });
  const db = await createClient();
  const { data: record, error } = await db
    .from("marketing_images")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (error || !record) return new Response(null, { status: 404 });
  const { data, error: downloadError } = await adminClient()
    .storage.from("marketing-images")
    .download(record.storage_path);
  if (downloadError || !data) return new Response(null, { status: 404 });
  return new Response(data, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
