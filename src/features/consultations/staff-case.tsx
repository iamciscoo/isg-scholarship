import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { CaseSupport } from "./case-support";
import Link from "next/link";
import { ActionForm } from "@/components/forms/action-form";
import { proposeApplication } from "@/features/applicants/tracking-actions";
import { getAdvisors, getLead } from "@/server/repositories/leads";
import { AdvisorAssignment } from "./advisor-assignment";
import { packageStatus } from "@/features/applicants/package-status";
import { fullApplicationStatusLabel } from "@/lib/validation/application-review";
import { receiptLabels } from "./progress";
import { DocumentPanel } from "@/features/applicants/document-panel";
import { SupportingFiles } from "./supporting-files";
export async function StaffCase({ id, admin }: { id: string; admin: boolean }) {
  const { db, user, role } = await requireStaff(admin);
  if (!z.uuid().safeParse(id).success) notFound();
  const { data: record, error } = await db
    .from("consultation_cases")
    .select("*")
    .eq("user_id", id)
    .maybeSingle();
  if (error) throw Error("Consultation unavailable");
  if (!record) notFound();
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("first_name,last_name,phone")
    .eq("id", id)
    .single();
  if (profileError) throw Error("Applicant details unavailable");
  const [advisor, assessment, receipts, applications, advisors, support] = await Promise.all([
    db.rpc("consultation_advisor", { p_user: id }),
    getLead(db, record.lead_id),
    admin
      ? db
          .from("case_files")
          .select("id,review_status,review_note")
          .eq("user_id", id)
          .eq("kind", "receipt")
          .is("application_id", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null, error: null },
    db
      .from("study_applications")
      .select("id,proposal,status,package_state")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(25),
    admin && record.payment_status === "verified" ? getAdvisors(db) : [],
    db
      .from("case_files")
      .select("id,original_name")
      .eq("user_id", id)
      .eq("kind", "support")
      .order("created_at", { ascending: false }),
  ]);
  if (advisor.error || assessment.error || receipts.error || applications.error || support.error || !assessment.lead)
    throw Error("Consultation details unavailable");
  const lead = assessment.lead;
  const form = lead.eligibility_assessments;
  const area = admin ? "admin" : "advisor";
  const opportunities = advisor.data ? await db.rpc("staff_opportunity_choices") : { data: [], error: null };
  if (opportunities.error) throw Error("Scholarship packages unavailable");
  return (
    <Workspace role={role} email={user.email || ""} active="consultations">
      <h1>{[profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Applicant consultation"}</h1>
      <p>{form.reference} · {form.study_level} · {form.preferred_fields}</p>
      <section className="workspace-panel">
        <h2>Consultation status</h2>
        <dl className="review-grid">
          <div><dt>Consultation</dt><dd>{record.completed_at ? "Complete" : record.payment_status === "verified" ? "Approved · call available" : "Submitted"}</dd></div>
          <div><dt>Receipt</dt><dd>{receiptLabels[record.payment_status]}</dd></div>
          <div><dt>Scholarship application</dt><dd>{record.current_declaration_id ? fullApplicationStatusLabel(record.application_status) : record.completed_at ? "Unlocked" : "Locked"}</dd></div>
        </dl>
        <div className="workspace-action-row">
          {receipts.data && (
            <Link className="button button-primary" href={`/admin/receipts/${receipts.data.id}`}>
              {receipts.data.review_status === "pending" ? "Review receipt" : "View receipt"}
            </Link>
          )}
          <Link className="text-link" href={`/${area}/leads/${record.lead_id}`}>Review consultation details</Link>
          {record.current_declaration_id && (
            <Link className="text-link" href={`/${area}/declarations/${record.current_declaration_id}`}>Review full application</Link>
          )}
        </div>
        {receipts.data?.review_note && <p>{receipts.data.review_note}</p>}
      </section>
      <SupportingFiles files={support.data || []} staff />
      <CaseSupport record={record} advisor={advisor.data} phone={profile.phone || form.phone} staff />
      {record.completed_at && !record.current_declaration_id && (
        <details className="workspace-panel package-gallery">
          <summary>Application documents</summary>
          <DocumentPanel user={id} staff />
        </details>
      )}
      {admin && record.payment_status === "verified" && (
        <AdvisorAssignment applicant={id} assigned={lead.advisor_id} advisors={advisors} />
      )}
      {advisor.data || applications.data?.length ? (
        <section className="workspace-panel">
          <h2>Scholarship packages</h2>
          {!!applications.data?.length && (
            <ul className="notification-history">
              {applications.data.map((application) => (
                <li key={application.id}>
                  <Link
                    href={`/${admin ? "admin" : "advisor"}/applications/${application.id}`}
                    className="text-link"
                  >
                    {application.proposal?.name || "Scholarship package"}
                  </Link>
                  <span className="status-pill">
                    {packageStatus(application.package_state, application.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {!advisor.data ? null : !opportunities.data?.length ? (
            <p>
              No active scholarship packages.{" "}
              {admin ? (
                <Link className="text-link" href="/admin/packages">
                  Create a package →
                </Link>
              ) : (
                "Ask an admin to add one."
              )}
            </p>
          ) : (
            <ActionForm action={proposeApplication} label="Recommend package">
              <input type="hidden" name="user" value={id} />
              <label>
                Scholarship package
                <select name="opportunity" required>
                  <option value="">Choose a package</option>
                  {opportunities.data.map(
                    (o: { id: string; name: string; provider: string; destination: string }) => (
                      <option key={o.id} value={o.id}>
                        {o.name} · {o.provider} · {o.destination}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </ActionForm>
          )}
          <Link className="text-link" href={`/${admin ? "admin" : "advisor"}/applications`}>
            View application tracking →
          </Link>
        </section>
      ) : null}
    </Workspace>
  );
}
