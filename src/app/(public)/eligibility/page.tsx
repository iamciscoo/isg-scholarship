import type { Metadata } from "next";
import { headers } from "next/headers";
import { AssessmentForm } from "@/features/assessments/assessment-form";
import { intakeConfigured } from "@/lib/supabase/config";
export const metadata: Metadata = {
  title: "Check my eligibility",
  alternates: { canonical: "/eligibility" },
};
export default async function Eligibility() {
  return (
    <AssessmentForm enabled={intakeConfigured()} nonce={(await headers()).get("x-nonce") || undefined} />
  );
}
