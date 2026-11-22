import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { ActionForm } from "@/components/forms/action-form";
import { applicationFields } from "@/lib/validation/application-form";
import { fullApplicationStatusLabel, fullApplicationStatuses } from "@/lib/validation/application-review";
import { reviewFullApplication } from "./application-actions";
import { DocumentPanel } from "./document-panel";
import { ApplicationUpdates, applicationDate } from "./application-updates";

export async function ApplicationReview({ id, admin = false }: { id: string; admin?: boolean }) {
  const { db, user, role } = await requireStaff(admin);
  if (!z.uuid().safeParse(id).success) notFound();
  const { data: declaration, error } = await db
    .from("application_declarations")
    .select("id,user_id,data,accepted_at,submission_method")
    .eq("id", id)
    .maybeSingle();
  if (error) throw Error("Application submission unavailable");
  if (!declaration) notFound();
  const [caseRecord, updates] = await Promise.all([
    db
      .from("consultation_cases")
      .select("current_declaration_id,application_status")
      .eq("user_id", declaration.user_id)
      .single(),
    db
      .from("full_application_updates")
      .select("id,status,note,created_at")
      .eq("user_id", declaration.user_id)
      .order("created_at", { ascending: false })
      .order("id")
      .limit(10),
  ]);
  if (caseRecord.error || updates.error) throw Error("Application review unavailable");

  const current = caseRecord.data.current_declaration_id === id;
  const status = caseRecord.data.application_status;
  const area = admin ? "/admin" : "/advisor";
  const name = `${declaration.data.firstName || ""} ${declaration.data.lastName || ""}`.trim() || "Applicant";
  return (
    <Workspace role={role} email={user.email || ""} active="applications">
      <Link className="text-link" href={`${area}/applications`}>
        ← Scholarship applications
      </Link>
      <div className="workspace-page-heading">
        <div>
          <h1>{name}</h1>
          <p>Submitted {applicationDate(declaration.accepted_at)}</p>
          {declaration.submission_method === "staff" && <p>Recorded by ISG staff</p>}
        </div>
        <span className="status-pill">
          {current ? fullApplicationStatusLabel(status) : "Earlier submission"}
        </span>
      </div>
      <div className="workspace-action-row case-actions">
        <Link className="text-link" href={`/api/application-pdf/${id}`}>
          Download application
        </Link>
        {current && <Link href={`${area}/cases/${declaration.user_id}/application`}>Edit application</Link>}
        <Link className="text-link" href={`${area}/cases/${declaration.user_id}`}>
          View consultation
        </Link>
        {!current && caseRecord.data.current_declaration_id && (
          <Link className="text-link" href={`${area}/declarations/${caseRecord.data.current_declaration_id}`}>
            Open latest submission
          </Link>
        )}
      </div>
      {current && admin && (
        <section className="workspace-panel">
          <h2>Application status</h2>
          <ActionForm action={reviewFullApplication} label="Save status">
            <input name="declaration" type="hidden" value={id} />
            <input name="previous" type="hidden" value={status} />
            <label>
              Application status
              <select name="status" defaultValue={status}>
                {fullApplicationStatuses
                  .filter(
                    (value) => value === status || !["submitted", "approved", "declined"].includes(value),
                  )
                  .map((value) => (
                    <option key={value} value={value}>
                      {fullApplicationStatusLabel(value)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Note for the applicant (optional)
              <textarea
                name="note"
                maxLength={2000}
                placeholder="Add instructions if the applicant needs to do something."
              />
            </label>
          </ActionForm>
        </section>
      )}
      <section className="workspace-panel">
        <h2>Submitted information</h2>
        <div className="operation-grid">
          {applicationFields.map((section) => (
            <article key={section.title} className="operation-card">
              <h3>{section.title}</h3>
              <dl className="package-fees">
                {section.fields.map((field) => (
                  <div key={field.key} className="break-words">
                    <dt>{field.label}</dt>
                    <dd className="min-w-0">{String(declaration.data[field.key] || "—")}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
        <p>
          Guardian contact permission: {declaration.data.guardianPermission ? "Confirmed" : "Not recorded"}
        </p>
      </section>
      {current && <DocumentPanel user={declaration.user_id} staff />}
      <ApplicationUpdates updates={updates.data} />
    </Workspace>
  );
}
