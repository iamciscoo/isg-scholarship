import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { applicationDraftSchema } from "@/lib/validation/application-form";
import { FullApplicationForm } from "./full-application-form";
import { DocumentPanel } from "./document-panel";

export async function StaffApplicationEditor({ id, admin }: { id: string; admin: boolean }) {
  const { db, user, role } = await requireStaff(admin);
  if (!z.uuid().safeParse(id).success) notFound();
  const { data: record, error } = await db
    .from("consultation_cases")
    .select("user_id,application_status,current_declaration_id")
    .eq("user_id", id)
    .maybeSingle();
  if (error) throw Error("Application unavailable");
  if (!record) notFound();
  const [paid, draft, profile, assessment, email] = await Promise.all([
    db
      .from("study_applications")
      .select("id")
      .eq("user_id", id)
      .eq("package_state", "paid")
      .neq("status", "Cancelled")
      .limit(1),
    db.from("application_form_drafts").select("data").eq("user_id", id).maybeSingle(),
    db.from("profiles").select("first_name,last_name,phone,residence").eq("id", id).single(),
    db
      .from("eligibility_assessments")
      .select("preferred_fields,qualification,graduation_year")
      .eq("applicant_id", id)
      .order("created_at")
      .limit(1)
      .maybeSingle(),
    db.rpc("staff_application_email", { p_user: id }),
  ]);
  if (paid.error || draft.error || profile.error || assessment.error || email.error)
    throw Error("Application details unavailable");
  const area = admin ? "admin" : "advisor";
  const restored = applicationDraftSchema.safeParse(draft.data?.data || {});
  const initial = {
    ...profile.data,
    firstName: profile.data.first_name || "",
    lastName: profile.data.last_name || "",
    studyInterest: assessment.data?.preferred_fields || "",
    programme: assessment.data?.preferred_fields || "",
    highestEducation: assessment.data?.qualification || "",
    graduationYear: assessment.data?.graduation_year ? String(assessment.data.graduation_year) : "",
    ...(restored.success ? restored.data : {}),
    email: email.data || "",
  };
  const closed = ["accepted", "rejected", "completed", "cancelled", "approved", "declined"].includes(
    record.application_status || "",
  );
  return (
    <Workspace role={role} email={user.email || ""} active="applications">
      <Link className="text-link" href={`/${area}/cases/${id}`}>
        ← Consultation
      </Link>
      <h1>
        Application for {initial.firstName} {initial.lastName}
      </h1>
      {!paid.data?.length ? (
        <p>Verify the package payment before entering application details.</p>
      ) : (
        <>
          {record.current_declaration_id && (
            <div className="workspace-action-row case-actions">
              <Link href={`/${area}/declarations/${record.current_declaration_id}`}>
                Review recorded application
              </Link>
            </div>
          )}
          {closed ? (
            <p>This application is closed. Reopen its status before editing details.</p>
          ) : (
            <section className="workspace-panel">
              <h2>Application details</h2>
              <p>Enter the information provided by the applicant. Files can be added below.</p>
              <FullApplicationForm initial={initial} applicant={id} />
            </section>
          )}
          <DocumentPanel user={id} staff editable />
        </>
      )}
    </Workspace>
  );
}
