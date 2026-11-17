import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { leadStages } from "@/lib/validation/leads";
import type { Advisor, Lead, LeadNote } from "@/features/leads/types";
export const assessmentColumns =
  "id,reference,first_name,last_name,email,phone,nationality,residence,qualification,education_status,field_of_study,performance,graduation_year,english_status,study_level,preferred_fields,destinations,intake,funding,constraints_note,created_at";
export async function listLeads(
  db: SupabaseClient,
  query: { stage?: string; level?: string; page?: string; advisor?: string; from?: string; to?: string },
) {
  const page = Math.min(10000, Math.max(1, Number.parseInt(query.page || "1", 10) || 1));
  let request = db
    .from("leads")
    .select(
      `id,assessment_id,stage,advisor_id,follow_up,created_at,eligibility_assessments!inner(${assessmentColumns})`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * 20, page * 20 - 1);
  if (leadStages.includes(query.stage as (typeof leadStages)[number]))
    request = request.eq("stage", query.stage);
  if (["Undergraduate", "Master's", "PhD / Research"].includes(query.level || ""))
    request = request.eq("eligibility_assessments.study_level", query.level);
  if (query.advisor && /^[0-9a-f-]{36}$/i.test(query.advisor))
    request = request.eq("advisor_id", query.advisor);
  if (query.from && /^\d{4}-\d{2}-\d{2}$/.test(query.from))
    request = request.gte("created_at", `${query.from}T00:00:00Z`);
  if (query.to && /^\d{4}-\d{2}-\d{2}$/.test(query.to))
    request = request.lt("created_at", `${query.to}T23:59:59.999Z`);
  const result = await request;
  return {
    leads: (result.data || []) as unknown as Lead[],
    count: result.count || 0,
    error: result.error,
    page,
  };
}
export async function getLead(db: SupabaseClient, id: string) {
  const result = await db
    .from("leads")
    .select(
      `id,assessment_id,stage,advisor_id,follow_up,created_at,eligibility_assessments!inner(${assessmentColumns})`,
    )
    .eq("id", id)
    .single();
  return { lead: result.data as unknown as Lead | null, error: result.error };
}
export async function getAdvisors(db: SupabaseClient) {
  const { data, error } = await db.rpc("advisor_directory");
  if (error) return [];
  return (data || []) as Advisor[];
}
export async function getLeadNotes(db: SupabaseClient, id: string) {
  const result = await db.rpc("lead_notes", { p_id: id });
  return { notes: (result.data || []) as LeadNote[], error: result.error };
}
