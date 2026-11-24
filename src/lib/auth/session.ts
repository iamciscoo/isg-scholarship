import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/supabase/config";
import type { Role } from "./permissions";
export const requireUser = cache(async () => {
  if (!authConfigured()) redirect("/login?setup=pending");
  const db = await createClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) {
    const pathname = (await headers()).get("x-isg-pathname") || "";
    const followsRecord = /^\/admin\/(users|receipts)\/[0-9a-f-]{36}$/i.test(pathname);
    redirect(followsRecord ? `/login?next=${encodeURIComponent(pathname)}` : "/login");
  }
  const [{ data: profile }, { data: roleRecord }] = await Promise.all([
    db.from("profiles")
      .select("id,first_name,last_name,phone,nationality,residence,status,avatar_path,updated_at,password_set_at")
      .eq("id", user.id)
      .single(),
    db.from("user_roles").select("role").eq("user_id", user.id).single(),
  ]);
  if (!profile || profile.status !== "active") redirect("/login?account=unavailable");
  const role: Role = roleRecord?.role || "applicant";
  return { db, user, profile, role };
});
export async function requireStaff(adminOnly = false) {
  const context = await requireUser();
  if (context.role === "applicant" || (adminOnly && context.role !== "admin")) redirect("/dashboard");
  return context;
}
