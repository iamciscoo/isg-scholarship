import { getWorkspaceText } from "@/lib/i18n/server";

import { Text } from "@/lib/i18n/workspace-text";
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
import { FileUpload } from "./file-upload";
import { UserFiles } from "./user-files";

export async function StaffCase({ id, admin }: { id: string; admin: boolean }) {
  const { db, user, role } = await requireStaff(admin);
  const translate = await getWorkspaceText();
  if (!z.uuid().safeParse(id).success) notFound();
  const { data: record, error } = await db
    .from("consultation_cases")
    .select("*")
    .eq("user_id", id)
    .maybeSingle();
  if (error) throw Error("Consultation unavailable");
  if (!record) notFound();
  const [assessment, receipt, applications, opportunities] = await Promise.all([
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
    record.payment_status === "verified" ? db.rpc("staff_opportunity_choices") : { data: [], error: null },
  ]);
  if (assessment.error || !assessment.lead || receipt.error || applications.error || opportunities.error)
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
        <span className="status-pill">{translate(receiptLabels[record.payment_status])}</span>
        <div className="workspace-action-row case-actions">
          {receipt.data && admin && (
            <Link className="text-link" href={`/admin/receipts/${receipt.data.id}`}>
              {receipt.data.review_status === "pending"
                ? translate("Review receipt")
                : translate("View receipt")}
            </Link>
          )}
          <Link className="text-link" href={`/${area}/leads/${record.lead_id}`}>
            <Text>{"Consultation details"}</Text>
          </Link>
          <a className="text-link" href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer">
            <Text>{"Contact on WhatsApp"}</Text>
          </a>
        </div>
        {receipt.data?.review_note && <p>{receipt.data.review_note}</p>}
        {admin && ["awaiting_receipt", "rejected"].includes(record.payment_status) && (
          <>
            <p>
              <Text>{"Upload the applicant’s consultation receipt, then verify the payment."}</Text>
            </p>
            <FileUpload kind="receipt" applicant={id} />
          </>
        )}
      </section>
      {record.payment_status === "verified" && (
        <section className="workspace-panel">
          <h2>
            <Text>{"Assigned package"}</Text>
          </h2>
          {applications.data.length ? (
            applications.data.map((application) => (
              <div key={application.id}>
                <Link className="text-link" href={`/${area}/applications/${application.id}`}>
                  {application.proposal?.name}
                </Link>
                <p>{packageStatus(application.package_state, application.status)}</p>
                {application.package_state === "paid" && (
                  <Link className="button button-outline" href={`/${area}/cases/${id}/application`}>
                    <Text>{"Enter application details"}</Text>
                  </Link>
                )}
              </div>
            ))
          ) : admin ? (
            <ActionForm action={proposeApplication} label="Assign package">
              <input type="hidden" name="user" value={id} />
              <label>
                <Text>{"Package"}</Text>
                <select name="opportunity" required>
                  <option value="">
                    <Text>{"Choose a package"}</Text>
                  </option>
                  {(opportunities.data || []).map((item: { id: string; name: string }) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </ActionForm>
          ) : (
            <p>
              <Text>{"An administrator will assign the package."}</Text>
            </p>
          )}
        </section>
      )}
      <UserFiles user={id} />
    </Workspace>
  );
}
