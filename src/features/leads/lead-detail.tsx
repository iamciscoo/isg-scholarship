import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { getLead, getAdvisors, getLeadNotes } from "@/server/repositories/leads";
import { ReviewForm } from "./review-form";
import { stageLabel } from "@/lib/validation/leads";
export async function LeadDetail({ id, admin }: { id: string; admin: boolean }) {
  const { db, user, role } = await requireStaff(admin);
  if (!z.uuid().safeParse(id).success) notFound();
  const { lead } = await getLead(db, id);
  if (!lead) notFound();
  const { notes, error: notesError } = await getLeadNotes(db, id);
  const advisors = admin ? await getAdvisors(db) : [];
  const { data: consents, error: consentError } = await db
    .from("consent_records")
    .select("purpose,granted,created_at,policy_version")
    .eq("assessment_id", lead.assessment_id);
  const a = lead.eligibility_assessments;
  const details = [
    ["Email", a.email],
    ["Phone", a.phone],
    ["Nationality", a.nationality],
    ["Country of residence", a.residence],
    ["Highest qualification", a.qualification],
    ["Current status", a.education_status],
    ["Field of study", a.field_of_study],
    ["Academic performance", a.performance],
    ["Graduation year", a.graduation_year],
    ["English proficiency", a.english_status],
    ["Desired level", a.study_level],
    ["Preferred fields", a.preferred_fields],
    ["Destinations", a.destinations || "No preference specified"],
    ["Intake", a.intake],
    ["Funding preference", a.funding],
    ["General constraints", a.constraints_note || "None provided"],
  ];
  return (
    <Workspace role={role} email={user.email || ""}>
      <Link className="text-link mb-6" href={admin ? "/admin" : "/advisor"}>
        ← Back to inbox
      </Link>
      <h1>
        {a.first_name} {a.last_name}
      </h1>
      <p>
        {a.reference} • <span className="badge">{stageLabel(lead.stage)}</span>
      </p>
      <div className="detail-grid">
        <section className="workspace-panel">
          <h2>Initial assessment</h2>
          <dl>
            {details.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <h2>Consent record</h2>
          {consentError ? (
            <p className="notice notice-error">Consent history is unavailable.</p>
          ) : (
            consents?.map((c) => (
              <p className="text-xs mb-3" key={c.purpose}>
                {stageLabel(c.purpose)}: {c.granted ? "Granted" : "Declined"}
                <br />
                {c.policy_version} • {new Date(c.created_at).toISOString()}
              </p>
            ))
          )}
        </section>
        <div>
          <section className="workspace-panel">
            <h2>Review and follow-up</h2>
            <ReviewForm lead={lead} advisors={advisors} admin={admin} />
          </section>
          <section className="workspace-panel">
            <h2>Internal review history</h2>
            {notesError ? (
              <p className="notice notice-error">Review history is unavailable.</p>
            ) : !notes.length ? (
              <p>No reviews recorded yet.</p>
            ) : (
              <ol className="timeline">
                {notes.map((note) => (
                  <li key={note.id}>
                    <strong>{stageLabel(note.stage)}</strong>
                    <p>{note.reason}</p>
                    <small>
                      {new Date(note.created_at).toLocaleString("en-GB", {
                        timeZone: "Africa/Dar_es_Salaam",
                      })}{" "}
                      EAT
                    </small>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </Workspace>
  );
}
