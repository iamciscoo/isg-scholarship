import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { authConfigured, intakeConfigured, challengeRequired } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { AssessmentForm } from "@/features/assessments/assessment-form";
import { restoreConsultationDraft } from "@/lib/validation/consultation-draft";
export const metadata = { title: "Start consultation", robots: { index: false, follow: false } };
export default async function Consultation() {
  if (!authConfigured()) redirect("/register?next=/consultation");
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/register?next=/consultation");
  const { profile, role } = await requireUser();
  if (role !== "applicant") redirect(role === "admin" ? "/admin/consultations" : "/advisor");
  const existing = await db.from("consultation_cases").select("user_id").eq("user_id", user.id).maybeSingle();
  if (existing.error) throw Error("Consultation access unavailable");
  if (existing.data) redirect("/dashboard/consultations");
  const { data: draft, error } = await db
    .from("consultation_drafts")
    .select("data,step")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error("Consultation progress unavailable");
  const restored = restoreConsultationDraft(draft?.data || {}, draft?.step);
  return (
    <AssessmentForm
      enabled={intakeConfigured()}
      challengeRequired={challengeRequired()}
      initialStep={restored.step}
      initial={{
        firstName: profile.first_name,
        lastName: profile.last_name,
        phone: profile.phone,
        nationality: profile.nationality,
        residence: profile.residence,
        ...restored.data,
        email: user.email || "",
      }}
      nonce={(await headers()).get("x-nonce") || undefined}
    />
  );
}
