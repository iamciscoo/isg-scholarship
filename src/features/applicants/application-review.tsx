import { getWorkspaceText } from "@/lib/i18n/server";

import { Text } from "@/lib/i18n/workspace-text";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { applicationFields } from "@/lib/validation/application-form";
import { fullApplicationStatusLabel } from "@/lib/validation/application-review";
import { ApplicationStatusForm } from "./application-status-form";
import { DocumentPanel } from "./document-panel";
import { ApplicationTabs } from "./application-tabs";
import { ApplicationUpdates, applicationDate } from "./application-updates";

export async function ApplicationReview({ id, admin = false }: { id: string; admin?: boolean }) {
  const { db, user, role } = await requireStaff(admin);
  const translate = await getWorkspaceText();
  if (!z.uuid().safeParse(id).success) notFound();
  const { data: declaration, error } = await db
    .from("application_declarations")
    .select("id,user_id,data,accepted_at,submission_method")
    .eq("id", id)
    .maybeSingle();
  if (error) throw Error("Application submission unavailable");
  if (!declaration) notFound();
  const [caseRecord, updates, application] = await Promise.all([
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
    db.from("study_applications").select("id").eq("user_id", declaration.user_id).limit(1),
  ]);
  if (caseRecord.error || updates.error || application.error) throw Error("Application review unavailable");

  const current = caseRecord.data.current_declaration_id === id;
  const status = caseRecord.data.application_status;
  const area = admin ? "/admin" : "/advisor";
  const name = `${declaration.data.firstName || ""} ${declaration.data.lastName || ""}`.trim() || "Applicant";
  return (
    <Workspace role={role} email={user.email || ""} active="applications">
      <Link className="text-link" href={`${area}/applications`}>
        <Text>{"← Scholarship applications"}</Text>
      </Link>
      <div className="workspace-page-heading">
        <div>
          <h1>{name}</h1>
          <p>
            <Text>{"Submitted"}</Text> {applicationDate(declaration.accepted_at)}
          </p>
          {declaration.submission_method === "staff" && (
            <p>
              <Text>{"Recorded by ISG staff"}</Text>
            </p>
          )}
        </div>
        <span className="status-pill">
          {current ? fullApplicationStatusLabel(status) : translate("Earlier submission")}
        </span>
      </div>
      <ApplicationTabs
        details={
          <>
            <div className="workspace-action-row case-actions">
              <Link className="text-link" href={`/api/application-pdf/${id}`}>
                <Text>{"Download application"}</Text>
              </Link>
              {current && application.data?.[0] && (
                <Link className="text-link" href={`${area}/applications/${application.data[0].id}/application`}>
                  <Text>{"Edit application"}</Text>
                </Link>
              )}
              <Link className="text-link" href={`${area}/cases/${declaration.user_id}`}>
                <Text>{"View consultation"}</Text>
              </Link>
              {!current && caseRecord.data.current_declaration_id && (
                <Link
                  className="text-link"
                  href={`${area}/declarations/${caseRecord.data.current_declaration_id}`}
                >
                  <Text>{"Open latest submission"}</Text>
                </Link>
              )}
            </div>
            {current && admin && <ApplicationStatusForm declaration={id} status={status} />}
            <section className="workspace-panel">
              <h2>
                <Text>{"Submitted information"}</Text>
              </h2>
              <div className="operation-grid">
                {applicationFields.map((section) => (
                  <article key={section.title} className="operation-card">
                    <h3>{<Text>{section.title}</Text>}</h3>
                    <dl className="package-fees">
                      {section.fields.map((field) => (
                        <div key={field.key} className="break-words">
                          <dt>{<Text>{field.label}</Text>}</dt>
                          <dd className="min-w-0">{String(declaration.data[field.key] || "—")}</dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                ))}
              </div>
              <p>
                <Text>{"Guardian contact permission:"}</Text>{" "}
                {declaration.data.guardianPermission ? translate("Confirmed") : translate("Not recorded")}
              </p>
            </section>
            <ApplicationUpdates updates={updates.data} />
          </>
        }
        documents={current ? <DocumentPanel user={declaration.user_id} staff /> : undefined}
      />
    </Workspace>
  );
}
