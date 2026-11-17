import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { authConfigured, intakeConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { AssessmentForm } from "@/features/assessments/assessment-form";
export const metadata = { title: "Start consultation", robots: { index: false, follow: false } };
export default async function Consultation() {
  if (!authConfigured()) redirect("/register?next=/consultation");
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user?.email_confirmed_at) redirect("/register?next=/consultation");
  await requireUser();
  return (
    <AssessmentForm enabled={intakeConfigured()} nonce={(await headers()).get("x-nonce") || undefined} />
  );
}
