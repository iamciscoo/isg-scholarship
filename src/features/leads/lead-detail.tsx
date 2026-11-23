import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { getLead } from "@/server/repositories/leads";
import { ReviewForm } from "./review-form";
import { stageLabel } from "@/lib/validation/leads";
import { Text } from "@/lib/i18n/workspace-text";
import { getWorkspaceText, getLocale } from "@/lib/i18n/server";
export async function LeadDetail({ id, admin }: { id: string; admin: boolean }) {
  const { db, user, role } = await requireStaff(admin);
  const [t, locale] = await Promise.all([getWorkspaceText(), getLocale()]);
  if (!z.uuid().safeParse(id).success) notFound();
  const { lead } = await getLead(db, id);
  if (!lead) notFound();
  const { data: consents, error: consentError } = await db
    .from("consent_records")
    .select("purpose,granted,created_at,policy_version")
    .eq("assessment_id", lead.assessment_id);
  const a = lead.eligibility_assessments;
  const details: Array<[string, string | number | null]> = [
    ["Email", a.email],
    ["Phone", a.phone],
    ["Nationality", a.nationality],
    ["Country of residence", a.residence],
    ["Highest qualification", t(a.qualification || "")],
    ["Current status", t(a.education_status || "")],
    ["Field of study", a.field_of_study],
    ["Academic performance", a.performance],
    ["Graduation year", a.graduation_year],
    ["English proficiency", t(a.english_status || "")],
    ["Desired level", t(a.study_level)],
    ["Preferred fields", a.preferred_fields],
    ["Destinations", a.destinations || t("No preference specified")],
    ["Intake", t(a.intake)],
    ["Funding preference", t(a.funding)],
    ["General constraints", a.constraints_note || t("None provided")],
  ];
  return (
    <Workspace role={role} email={user.email || ""}>
      <Link className="text-link mb-6" href={admin ? "/admin/consultations" : "/advisor"}>
        ← <Text>Back to consultations</Text>
      </Link>
      <h1>
        {a.first_name} {a.last_name}
      </h1>
      <p>
        {a.reference} • <span className="badge">{t(stageLabel(lead.stage))}</span>
      </p>
      <section className="workspace-panel consultation-status-panel">
        <h2>
          <Text>Consultation status</Text>
        </h2>
        <ReviewForm lead={lead} />
      </section>
      {a.applicant_id && (
        <Link className="text-link" href={`/${admin ? "admin" : "advisor"}/cases/${a.applicant_id}`}>
          <Text>Open consultation</Text> →
        </Link>
      )}
      <div className="consultation-detail-layout">
        <section className="workspace-panel">
          <h2>
            <Text>Consultation details</Text>
          </h2>
          <dl className="consultation-details">
            {details.map(([label, value]) => (
              <div key={label}>
                <dt>{t(label)}</dt>
                <dd>{value || t("Not collected at consultation")}</dd>
              </div>
            ))}
          </dl>
          <details className="consent-record">
            <summary>
              <Text>Consent record</Text>
            </summary>
            {consentError ? (
              <p className="notice notice-error">
                <Text>Consent history is unavailable.</Text>
              </p>
            ) : (
              consents?.map((c) => (
                <p className="text-xs mb-3" key={c.purpose}>
                  {t(stageLabel(c.purpose))}: {t(c.granted ? "Granted" : "Declined")}
                  <br />
                  {c.policy_version} •{" "}
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Africa/Dar_es_Salaam",
                  }).format(new Date(c.created_at))}
                </p>
              ))
            )}
          </details>
        </section>
      </div>
    </Workspace>
  );
}
