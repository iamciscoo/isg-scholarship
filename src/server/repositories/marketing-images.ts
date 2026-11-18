import "server-only";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/supabase/config";
export type MarketingImage = { id: string; path: string; label: string };
export async function getMarketingImages(): Promise<MarketingImage[]> {
  if (!authConfigured()) return [];
  const db = await createClient();
  const { data, error } = await db
    .from("marketing_images")
    .select("id,label")
    .order("created_at", { ascending: false });
  if (error) throw Error("Marketing gallery unavailable");
  return (data || []).map((m) => ({ id: m.id, path: `/api/marketing-images/${m.id}`, label: m.label }));
}
export async function getHomepageImage() {
  if (!authConfigured()) return "/images/study-together.jpg";
  const db = await createClient();
  const { data, error } = await db.from("site_presentation").select("hero_image").eq("id", true).single();
  if (error) throw Error("Homepage image unavailable");
  return data.hero_image as string;
}
