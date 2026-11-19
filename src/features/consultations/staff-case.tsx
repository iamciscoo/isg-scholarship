import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { CaseSupport } from "./case-support";
import { DocumentPanel } from "@/features/applicants/document-panel";
import Link from "next/link";
import { ActionForm } from "@/components/forms/action-form";
import { proposeApplication } from "@/features/applicants/tracking-actions";
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
  const opportunities = record.completed_at
    ? await db.rpc("staff_opportunity_choices")
    : { data: [], error: null };
  if (opportunities.error) throw Error("Scholarship packages unavailable");
  return (
    <Workspace role={role} email={user.email || ""}>
      <h1>{[profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Applicant consultation"}</h1>
      <p>
        Payment: {record.payment_status.replaceAll("_", " ")} · Consultation fee: TZS 50,000, once per
        student.
      </p>
      {admin && (
        <Link className="text-link" href="/admin/payments">
          Review consultation payments →
        </Link>
      )}
      <CaseSupport record={record} staff />
      {declaration.data && (
        <section className="workspace-panel">
          <h2>Current application declaration</h2>
          <p>
            Accepted {new Date(declaration.data.accepted_at).toISOString()} · {declaration.data.version}
          </p>
          <Link className="text-link" href={`/api/application-pdf/${declaration.data.id}`}>
            Download accepted application PDF
          </Link>
          <p>This copy records the applicant’s accepted answers. Later draft edits do not change it.</p>
        </section>
      )}
      {record.completed_at && <DocumentPanel user={id} staff />}
      {record.completed_at && (
        <section className="workspace-panel">
          <h2>Share a scholarship package</h2>
          <p>The package appears in the applicant’s Applications. Ask them to review it before you apply.</p>
          {!opportunities.data?.length ? (
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
            <ActionForm action={proposeApplication} label="Share package">
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
      )}
    </Workspace>
  );
}
