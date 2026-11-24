import { getWorkspaceText } from "@/lib/i18n/server";

import { Text } from "@/lib/i18n/workspace-text";
import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { requireUser, requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { proposalSchema, isPreviewPackage } from "@/lib/validation/opportunities";
import { fullApplicationStatusLabel } from "@/lib/validation/application-review";
import { PackageProgress } from "./package-progress";
import { packageStatus } from "./package-status";
import { UserFiles } from "@/features/consultations/user-files";
import { ApplicationTabs } from "./application-tabs";
import { DocumentPanel } from "./document-panel";
import { FullApplicationForm } from "./full-application-form";
import type { FullApplication } from "@/lib/validation/application-form";

export async function ApplicationDetail({
  id,
  staff = false,
  admin = false,
}: {
  id: string;
  historyPage?: number;
  staff?: boolean;
  admin?: boolean;
}) {
  const { db, user, role } = staff ? await requireStaff(admin) : await requireUser();
  const translate = await getWorkspaceText();
  if (!z.uuid().safeParse(id).success) notFound();
  const { data: application, error } = await db
    .from("study_applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw Error("Application unavailable");
  if (!application || (!staff && application.user_id !== user.id)) notFound();
  const proposal = proposalSchema.parse(application.proposal);
  const { data: record, error: caseError } = await db
    .from("consultation_cases")
    .select("current_declaration_id,application_status")
    .eq("user_id", application.user_id)
    .single();
  if (caseError) throw Error("Application status unavailable");
  const area = staff ? (admin ? "/admin" : "/advisor") : "/dashboard";
  const paid = application.package_state === "paid";
  const { data: draft } = paid
    ? await db.from("application_form_drafts").select("data").eq("user_id", application.user_id).maybeSingle()
    : { data: null };
  const applicationForm =
    paid && !record.current_declaration_id ? (
      <FullApplicationForm
        applicant={staff ? application.user_id : undefined}
        initial={(draft?.data ?? {}) as Partial<FullApplication>}
      />
    ) : undefined;
  return (
    <Workspace role={role} email={user.email || ""} active="applications">
      <Link className="text-link" href={`${area}/applications`}>
        <Text>{"← Applications"}</Text>
      </Link>
      <h1>{proposal.name}</h1>
      <p>
        {proposal.provider} · {proposal.destination} · {proposal.studyLevel}
      </p>
      <ApplicationTabs
        details={
          <>
            <section className="workspace-panel">
              <span className="status-pill">
                {record.current_declaration_id
                  ? fullApplicationStatusLabel(record.application_status)
                  : packageStatus(application.package_state, application.status)}
              </span>
              {proposal.requirements && <p className="preserve-lines">{proposal.requirements}</p>}
              {proposal.supportSummary && <p className="preserve-lines">{proposal.supportSummary}</p>}
              {staff ? (
                <div className="workspace-action-row">
                  <Link className="text-link" href={`${area}/cases/${application.user_id}`}>
                    <Text>{"View consultation"}</Text>
                  </Link>
                  {record.current_declaration_id && (
                    <Link
                      className="button button-primary"
                      href={`${area}/declarations/${record.current_declaration_id}`}
                    >
                      <Text>{"Review application"}</Text>
                    </Link>
                  )}
                </div>
              ) : (
                paid &&
                record.current_declaration_id && (
                  <Link className="button button-primary" href="/dashboard/application">
                    {translate("View application")}
                  </Link>
                )
              )}
            </section>
            <PackageProgress
              id={id}
              state={application.package_state}
              status={application.status}
              fee={proposal.packageFee}
              staff={staff}
              admin={admin}
              testPackage={isPreviewPackage(proposal.name)}
              applicant={application.user_id}
            />
          </>
        }
        application={applicationForm}
        documents={
          staff ? (
            <UserFiles user={application.user_id} />
          ) : paid ? (
            <DocumentPanel user={application.user_id} />
          ) : undefined
        }
      />
    </Workspace>
  );
}
