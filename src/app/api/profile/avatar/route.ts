import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/supabase/config";
export async function GET() {
  if (!authConfigured()) return new Response(null, { status: 503 });
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user?.email_confirmed_at) return new Response(null, { status: 401 });
  const { data: profile } = await db.from("profiles").select("avatar_path,status").eq("id", user.id).single();
  if (!profile || profile.status !== "active" || !profile.avatar_path?.startsWith(`${user.id}/`))
    return new Response(null, { status: 404 });
  const { data, error } = await db.storage.from("profile-avatars").download(profile.avatar_path);
  if (error || !data) return new Response(null, { status: 404 });
  return new Response(data, {
    headers: {
      "Content-Type": "image/webp",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
