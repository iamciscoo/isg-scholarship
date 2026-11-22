import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { ActionForm } from "@/components/forms/action-form";
import { proposeApplication } from "@/features/applicants/tracking-actions";
import { getLead } from "@/server/repositories/leads";
import { packageStatus } from "@/features/applicants/package-status";
import { receiptLabels } from "./progress";
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
  const [assessment, receipt, applications, support, opportunities] = await Promise.all([
    getLead(db, record.lead_id),
    db
      .from("case_files")
      .select("id,review_status,review_note")
      .eq("user_id", id)
      .eq("kind", "receipt")
      .is("application_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("study_applications")
      .select("id,proposal,status,package_state")
      .eq("user_id", id)
      .neq("status", "Cancelled")
      .order("created_at", { ascending: false }),
    db.from("case_files").select("id,original_name").eq("user_id", id).eq("kind", "support"),
    record.payment_status === "verified" ? db.rpc("staff_opportunity_choices") : { data: [], error: null },
  ]);
  if (
    assessment.error ||
    !assessment.lead ||
    receipt.error ||
    applications.error ||
    support.error ||
    opportunities.error
  )
    throw Error("Consultation details unavailable");
  const form = assessment.lead.eligibility_assessments;
  const phone = form.phone.replace(/\D/g, "");
  const area = admin ? "admin" : "advisor";
  return (
    <Workspace role={role} email={user.email || ""} active="consultations">
      <h1>
        {form.first_name} {form.last_name}
      </h1>
      <p>
        {form.reference} · {form.preferred_fields}
      </p>
      <section className="workspace-panel">
        <span className="status-pill">{receiptLabels[record.payment_status]}</span>
        <div className="workspace-action-row">
          {receipt.data && (
            <Link className="text-link" href={`/admin/receipts/${receipt.data.id}`}>
              {receipt.data.review_status === "pending" ? "Review receipt" : "View receipt"}
            </Link>
          )}
          <Link className="text-link" href={`/${area}/leads/${record.lead_id}`}>
            Consultation details
          </Link>
          <a className="text-link" href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer">
            Contact on WhatsApp
          </a>
        </div>
        {receipt.data?.review_note && <p>{receipt.data.review_note}</p>}
      </section>
      {record.payment_status === "verified" && (
        <section className="workspace-panel">
          <h2>Assigned package</h2>
          {applications.data.length ? (
            applications.data.map((application) => (
              <div key={application.id}>
                <Link className="text-link" href={`/${area}/applications/${application.id}`}>
                  {application.proposal?.name}
                </Link>
                <p>{packageStatus(application.package_state, application.status)}</p>
              </div>
            ))
          ) : admin ? (
            <ActionForm action={proposeApplication} label="Assign package">
              <input type="hidden" name="user" value={id} />
              <label>
                Package
                <select name="opportunity" required>
                  <option value="">Choose a package</option>
                  {(opportunities.data || []).map((item: { id: string; name: string }) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </ActionForm>
          ) : (
            <p>An administrator will assign the package.</p>
          )}
        </section>
      )}
      <SupportingFiles files={support.data || []} staff />
    </Workspace>
  );
}
