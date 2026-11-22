import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { FullApplicationForm } from "@/features/applicants/full-application-form";
import { DocumentPanel } from "@/features/applicants/document-panel";
import { applicationDraftSchema } from "@/lib/validation/application-form";
import { fullApplicationStatusLabel } from "@/lib/validation/application-review";
import { ApplicationUpdates, applicationDate } from "@/features/applicants/application-updates";
import { ActionForm } from "@/components/forms/action-form";
import { respondToApplicationReview } from "@/features/applicants/application-actions";

export default async function ApplicationDetails() {
  const { db, user, role, profile } = await requireUser();
  const { data: record, error } = await db
    .from("consultation_cases")
    .select("completed_at,payment_status,current_declaration_id,application_status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw Error("Application access unavailable");
  if (!record?.completed_at || record.payment_status !== "verified")
    return (
      <Workspace role={role} email={user.email || ""} active="applications">
        <h1>Scholarship application</h1>
        <section className="workspace-panel">
          <p>Your application form opens after ISG verifies your package payment.</p>
          <Link href="/dashboard/consultations" className="text-link">
            View consultation →
          </Link>
        </section>
      </Workspace>
    );
  const paidPackage = await db
    .from("study_applications")
    .select("id")
    .eq("user_id", user.id)
    .eq("package_state", "paid")
    .neq("status", "Cancelled")
    .limit(1);
  if (paidPackage.error) throw Error("Package payment unavailable");
  if (!paidPackage.data?.length)
    return (
      <Workspace role={role} email={user.email || ""} active="applications">
        <h1>Scholarship application</h1>
        <p>Your application form opens after ISG verifies your package payment.</p>
        <Link href="/dashboard/applications" className="text-link">
          View package payment
        </Link>
      </Workspace>
    );
  const [draft, assessment, declaration, updates] = await Promise.all([
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
          .select("id,accepted_at,submission_method")
          .eq("user_id", user.id)
          .eq("id", record.current_declaration_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    db
      .from("full_application_updates")
      .select("id,status,note,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .order("id")
      .limit(10),
  ]);
  if (draft.error || assessment.error || declaration.error || updates.error)
    throw Error("Application details unavailable");
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
  const status = record.application_status;
  const editable = !status || status === "submitted" || status === "needs_information";
  const needsInformation = status === "needs_information";
  return (
    <Workspace role={role} email={user.email || ""} active="applications">
      <h1>Scholarship application</h1>
      {declaration.data && (
        <section className="workspace-panel">
          <div className="panel-head">
            <span className="status-pill">{fullApplicationStatusLabel(status)}</span>
            <Link className="text-link" href={`/api/application-pdf/${declaration.data.id}`}>
              Download submitted application
            </Link>
          </div>
          <p>
            {declaration.data.submission_method === "staff" ? "Recorded by ISG" : "Submitted"}{" "}
            {applicationDate(declaration.data.accepted_at)}
          </p>
          {needsInformation && (
            <p>Review the request below and send your corrections or additional documents.</p>
          )}
        </section>
      )}
      <ApplicationUpdates updates={updates.data} />
      {editable &&
        (declaration.data ? (
          <details className="workspace-panel package-gallery">
            <summary>Edit and resubmit application details</summary>
            <FullApplicationForm initial={initial} />
          </details>
        ) : (
          <section className="workspace-panel">
            <h2>Application details</h2>
            <FullApplicationForm initial={initial} />
          </section>
        ))}
      <DocumentPanel user={user.id} />
      {declaration.data && needsInformation && (
        <section className="workspace-panel">
          <h2>Send requested updates</h2>
          <p>Use this after adding the requested files or to reply to your reviewer.</p>
          <ActionForm action={respondToApplicationReview} label="Send for review">
            <input name="declaration" type="hidden" value={declaration.data.id} />
            <label>
              Note for ISG (optional)
              <textarea name="note" maxLength={2000} />
            </label>
          </ActionForm>
        </section>
      )}
    </Workspace>
  );
}
