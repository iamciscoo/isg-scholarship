import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { FullApplicationForm } from "@/features/applicants/full-application-form";
import { DocumentPanel } from "@/features/applicants/document-panel";
import { applicationDraftSchema } from "@/lib/validation/application-form";
export default async function ApplicationDetails() {
  const { db, user, role, profile } = await requireUser();
  const { data: record, error } = await db
    .from("consultation_cases")
    .select("completed_at,payment_status,current_declaration_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw Error("Application access unavailable");
  if (!record?.completed_at || record.payment_status !== "verified")
    return (
      <Workspace role={role} email={user.email || ""} active="application">
        <h1>Application details.</h1>
        <section className="workspace-panel">
          <h2>Your advisor will unlock this step.</h2>
          <p>
            Complete your payment verification and advisor consultation first. You do not need passports,
            transcripts or guardian information for the initial consultation.
          </p>
          <Link href="/dashboard/consultations" className="text-link">
            View consultation →
          </Link>
        </section>
      </Workspace>
    );
  const [draft, assessment, declarations] = await Promise.all([
    db.from("application_form_drafts").select("data").eq("user_id", user.id).maybeSingle(),
    db
      .from("eligibility_assessments")
      .select("preferred_fields,qualification,field_of_study,graduation_year")
      .eq("applicant_id", user.id)
      .order("created_at")
      .limit(1)
      .maybeSingle(),
    record.current_declaration_id
      ? db
          .from("application_declarations")
          .select("id,version,accepted_at")
          .eq("user_id", user.id)
          .eq("id", record.current_declaration_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (draft.error || assessment.error || declarations.error) throw Error("Application details unavailable");
  const restored = applicationDraftSchema.safeParse(draft.data?.data || {});
  const a = assessment.data;
  const initial = {
    firstName: profile.first_name,
    lastName: profile.last_name,
    phone: profile.phone,
    residence: profile.residence,
    studyInterest: a?.preferred_fields || "",
    programme: a?.preferred_fields || "",
    highestEducation: a?.qualification || "",
    graduationYear: a?.graduation_year ? String(a.graduation_year) : "",
    ...(restored.success ? restored.data : {}),
    email: user.email || "",
  };
  return (
    <Workspace role={role} email={user.email || ""} active="application">
      <h1>Your full application details.</h1>
      <p>
        Known details are prefilled. Save a draft at any time, then submit with your declaration when ready.
        Provider-specific applications still require your separate approval.
      </p>
      {declarations.data && (
        <section className="workspace-panel">
          <h2>Latest submitted copy</h2>
          <p>
            Declaration accepted {new Date(declarations.data.accepted_at).toISOString()} ·{" "}
            {declarations.data.version}
          </p>
          <Link className="text-link" href={`/api/application-pdf/${declarations.data.id}`}>
            Download submitted PDF
          </Link>
          <p>
            New draft edits do not change this accepted copy. Submit again to record an updated declaration.
          </p>
        </section>
      )}
      <section className="workspace-panel">
        <FullApplicationForm initial={initial} />
      </section>
      <DocumentPanel user={user.id} />
    </Workspace>
  );
}
