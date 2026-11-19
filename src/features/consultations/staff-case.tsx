import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { CaseSupport } from "./case-support";
import { DocumentPanel } from "@/features/applicants/document-panel";
import Link from "next/link";
import { ActionForm } from "@/components/forms/action-form";
import { proposeApplication } from "@/features/applicants/tracking-actions";
import { getAdvisors } from "@/server/repositories/leads";
import { AdvisorAssignment } from "./advisor-assignment";
import { packageStatus } from "@/features/applicants/package-status";
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
    .select("first_name,last_name")
    .eq("id", id)
    .single();
  if (profileError) throw Error("Applicant details unavailable");
  const declaration = record.current_declaration_id
    ? await db
        .from("application_declarations")
        .select("id,version,accepted_at")
        .eq("user_id", id)
        .eq("id", record.current_declaration_id)
        .maybeSingle()
    : { data: null, error: null };
  if (declaration.error) throw Error("Application declaration unavailable");
  const [advisor, lead, receipts, applications, advisors] = await Promise.all([
    db.rpc("consultation_advisor", { p_user: id }),
    db.from("leads").select("advisor_id").eq("id", record.lead_id).single(),
    admin
      ? db
          .from("case_files")
          .select("id")
          .eq("user_id", id)
          .eq("kind", "receipt")
          .is("application_id", null)
          .eq("review_status", "pending")
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
  ]);
  if (advisor.error || lead.error || receipts.error || applications.error)
    throw Error("Consultation details unavailable");
  const opportunities = advisor.data ? await db.rpc("staff_opportunity_choices") : { data: [], error: null };
  if (opportunities.error) throw Error("Scholarship packages unavailable");
  return (
    <Workspace role={role} email={user.email || ""}>
      <h1>{[profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Applicant consultation"}</h1>
      <p>
        Payment: {record.payment_status.replaceAll("_", " ")} · Consultation fee: TZS 50,000, once per
        student.
      </p>
      {receipts.data && (
        <section className="workspace-panel">
          <h2>Next: check the consultation receipt</h2>
          <Link className="button button-primary" href={`/admin/receipts/${receipts.data.id}`}>
            Review receipt
          </Link>
        </section>
      )}
      {admin && record.payment_status === "verified" && (
        <AdvisorAssignment applicant={id} assigned={lead.data?.advisor_id} advisors={advisors} />
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
      <CaseSupport record={record} advisor={advisor.data} staff />
      {(declaration.data || record.completed_at) && (
        <details className="workspace-panel package-gallery">
          <summary>Application documents</summary>
          {declaration.data && (
            <Link className="text-link" href={`/api/application-pdf/${declaration.data.id}`}>
              Download accepted application PDF
            </Link>
          )}
          {record.completed_at && <DocumentPanel user={id} staff />}
        </details>
      )}
    </Workspace>
  );
}
