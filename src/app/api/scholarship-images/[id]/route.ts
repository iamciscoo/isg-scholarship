import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { authConfigured } from "@/lib/supabase/config";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!authConfigured()) return new Response(null, { status: 503 });
  if (!z.uuid().safeParse(id).success) return new Response(null, { status: 404 });
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return new Response(null, { status: 401 });
  const { data: allowed } = await db.rpc("can_read_scholarship_image", { p_id: id });
  if (allowed !== true) return new Response(null, { status: 404 });
  const { data, error } = await adminClient().storage.from("scholarship-images").download(`${id}.webp`);
  if (error || !data) return new Response(null, { status: 404 });
  return new Response(data, {
    headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store" },
  });
}
