import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/supabase/config";
import type { Role } from "./permissions";
export async function requireUser() {
  if (!authConfigured()) redirect("/login?setup=pending");
  const db = await createClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user || !user.email_confirmed_at) redirect("/login");
  const { data: profile } = await db
    .from("profiles")
    .select("id,first_name,last_name,phone,nationality,residence,status,avatar_path,updated_at")
    .eq("id", user.id)
    .single();
  if (!profile || profile.status !== "active") redirect("/login?account=unavailable");
  const { data: roleRecord } = await db.from("user_roles").select("role").eq("user_id", user.id).single();
  const role: Role = roleRecord?.role || "applicant";
  return { db, user, profile, role };
}
export async function requireStaff(adminOnly = false) {
  const context = await requireUser();
  if (context.role === "applicant" || (adminOnly && context.role !== "admin")) redirect("/dashboard");
  return context;
}
