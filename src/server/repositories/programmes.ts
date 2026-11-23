import "server-only";
import { cache } from "react";
import { authConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Programme } from "@/lib/programmes";

// No hardcoded fallback: an empty published catalogue must stay empty everywhere.
export const getPublishedProgrammes = cache(async (): Promise<Programme[]> => {
  if (!authConfigured()) return [];
  const db = await createClient();
  const rows: Programme[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db
      .from("study_promotions")
      .select("id,title,destination,destinations,study_level,field,funding_type,eligibility,image,published")
      .eq("published", true)
      .order("title")
      .order("id")
      .range(offset, offset + 499);
    if (error) throw Error("Study paths unavailable");
    rows.push(...(data as Programme[]));
    if (data.length < 500) break;
  }
  return rows;
});
