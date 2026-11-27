import { Text } from "@/lib/i18n/workspace-text";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { applicationDraftSchema } from "@/lib/validation/application-form";
import { fullApplicationStatusLabel } from "@/lib/validation/application-review";
import { FullApplicationForm } from "./full-application-form";
import { DocumentPanel } from "./document-panel";
import { ApplicationTabs } from "./application-tabs";

export async function StaffApplicationEditor({ id, admin }: { id: string; admin: boolean }) {
  const { db, user, role } = await requireStaff(admin);
  if (!z.uuid().safeParse(id).success) notFound();
  const { data: application, error: applicationError } = await db
    .from("study_applications")
    .select("user_id,package_state,status")
    .eq("id", id)
    .maybeSingle();
  if (applicationError) throw Error("Application unavailable");
  if (!application) notFound();
  const applicant = application.user_id;
  const { data: record, error } = await db
    .from("consultation_cases")
    .select("user_id,application_status,current_declaration_id")
    .eq("user_id", applicant)
    .maybeSingle();
  if (error) throw Error("Application unavailable");
  if (!record) notFound();
  const [draft, profile, assessment, email] = await Promise.all([
    db.from("application_form_drafts").select("data").eq("user_id", applicant).maybeSingle(),
    db.from("profiles").select("first_name,last_name,phone,residence").eq("id", applicant).single(),
    db
      .from("eligibility_assessments")
      .select("preferred_fields,qualification,graduation_year,residence")
      .eq("applicant_id", applicant)
      .order("created_at")
      .limit(1)
      .maybeSingle(),
    db.rpc("staff_application_email", { p_user: applicant }),
  ]);
  if (draft.error || profile.error || assessment.error || email.error)
    throw Error("Application details unavailable");
  const area = admin ? "admin" : "advisor";
  const restored = applicationDraftSchema.safeParse(draft.data?.data || {});
  const initial = {
    ...profile.data,
    firstName: profile.data.first_name || "",
    lastName: profile.data.last_name || "",
    residence: profile.data.residence || assessment.data?.residence || "",
    studyInterest: assessment.data?.preferred_fields || "",
    programme: assessment.data?.preferred_fields || "",
    highestEducation: assessment.data?.qualification || "",
    graduationYear: assessment.data?.graduation_year ? String(assessment.data.graduation_year) : "",
    email: email.data || "",
    ...(restored.success ? restored.data : {}),
  };
  const paid = application.package_state === "paid" && application.status !== "Cancelled";
  const closed = ["accepted", "rejected", "completed", "cancelled", "approved", "declined"].includes(
    record.application_status || "",
  );
  return (
    <Workspace role={role} email={user.email || ""} active="applications">
      <Link className="text-link" href={`/${area}/applications/${id}`}>
        <Text>{"← Applications"}</Text>
      </Link>
      <h1>
        <Text>{"Application for"}</Text> {initial.firstName} {initial.lastName}
      </h1>
      {!paid ? (
        <p>
          <Text>{"Verify the package payment before entering application details."}</Text>
        </p>
      ) : (
        <ApplicationTabs
          details={
            <section className="workspace-panel">
              <span className="status-pill">{fullApplicationStatusLabel(record.application_status)}</span>
              {closed ? (
                <p>
                  <Text>{"This application is closed. Reopen its status before editing details."}</Text>
                </p>
              ) : (
                <p>
                  <Text>{"The applicant's answers are entered in the Application tab."}</Text>
                </p>
              )}
              <Link className="text-link" href={`/${area}/cases/${applicant}`}>
                <Text>{"View consultation →"}</Text>
              </Link>
            </section>
          }
          application={
            <>
              {record.current_declaration_id && (
                <div className="workspace-action-row case-actions">
                  <Link className="button button-outline" href={`/${area}/declarations/${record.current_declaration_id}`}>
                    <Text>{"Review recorded application"}</Text>
                  </Link>
                </div>
              )}
              {closed ? (
                <p>
                  <Text>{"This application is closed. Reopen its status before editing details."}</Text>
                </p>
              ) : (
                <section className="workspace-panel">
                  <h2>
                    <Text>{"Application details"}</Text>
                  </h2>
                  <p>
                    <Text>{"Enter the information provided by the applicant."}</Text>
                  </p>
                  <FullApplicationForm initial={initial} applicant={applicant} />
                </section>
              )}
            </>
          }
          documents={<DocumentPanel user={applicant} staff editable />}
        />
      )}
    </Workspace>
  );
}
