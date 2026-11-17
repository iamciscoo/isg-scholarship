import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/supabase/config";
export type AccountSummary = { name: string; initials: string; avatar: string | null; href: string } | null;
export const getAccountSummary = cache(async (): Promise<AccountSummary> => {
  if (!authConfigured()) return null;
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user?.email_confirmed_at) return null;
  const { data: p } = await db
    .from("profiles")
    .select("first_name,last_name,avatar_path,updated_at,status")
    .eq("id", user.id)
    .single();
  if (!p || p.status !== "active") return null;
  const { data: r } = await db.from("user_roles").select("role").eq("user_id", user.id).single();
  const name = `${p.first_name} ${p.last_name}`.trim() || user.email || "ISG";
  return {
    name,
    initials: `${p.first_name?.[0] || name[0]}${p.last_name?.[0] || ""}`.toUpperCase(),
    avatar: p.avatar_path ? `/api/profile/avatar?v=${encodeURIComponent(p.updated_at)}` : null,
    href: r?.role === "admin" ? "/admin" : r?.role === "advisor" ? "/advisor" : "/dashboard",
  };
});
