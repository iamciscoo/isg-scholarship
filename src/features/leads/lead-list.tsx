import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { listLeads, getAdvisors } from "@/server/repositories/leads";
import { stageLabel } from "@/lib/validation/leads";
import { consultationProgress } from "@/features/consultations/progress";
import { Text } from "@/lib/i18n/workspace-text";
import { getLocale } from "@/lib/i18n/server";
import { LeadFilters, type LeadQuery } from "./lead-filters";
import { ConsultationRows } from "./consultation-rows";
export async function LeadList({ admin, query }: { admin: boolean; query: LeadQuery }) {
  const [{ db, user, role }, locale] = await Promise.all([requireStaff(admin), getLocale()]);
  const base = admin ? "/admin" : "/advisor";
  const [{ leads, count, error, page }, advisors, all, newLeads, reviewing] = await Promise.all([
    listLeads(db, query),
    admin ? getAdvisors(db) : [],
    db.from("leads").select("id", { count: "exact", head: true }),
    admin ? db
      .from("consultation_cases")
      .select("user_id", { count: "exact", head: true })
      .eq("payment_status", "pending_verification") : { count: 0, error: null },
    db
      .from("consultation_cases")
      .select("user_id", { count: "exact", head: true })
      .in("application_status", ["submitted", "in_review"]),
  ]);
  const ids = leads.map((lead) => lead.id);
  const cases = ids.length
    ? await db
        .from("consultation_cases")
        .select("lead_id,payment_status,completed_at,current_declaration_id,application_status")
        .in("lead_id", ids)
    : { data: [], error: null };
  const byLead = new Map(cases.data?.map((entry) => [entry.lead_id, entry]));
  const filterPath = admin ? "/admin/consultations" : base;
  const link = (n: number) => {
    const params = new URLSearchParams(
      Object.entries(query).filter((pair): pair is [string, string] => typeof pair[1] === "string"),
    );
    params.set("page", String(n));
    return `${filterPath}?${params}`;
  };
  return (
    <Workspace role={role} email={user.email || ""} active="consultations">
      <h1>
        <Text>Consultations</Text>
      </h1>
      <div className="stat-grid consultation-summary">
        {[
          { label: "Consultations", result: all },
          ...(admin
            ? [
                {
                  label: "Receipts to review",
                  result: newLeads,
                  href: "/admin/payments?status=pending_verification",
                },
              ]
            : []),
          { label: "Applications to review", result: reviewing, href: `${base}/applications` },
        ].map(({ label, result, ...item }) => (
          <div className="stat-box" key={label}>
            {"href" in item && typeof item.href === "string" ? (
              <Link href={item.href}>
                <Text>{label}</Text>
              </Link>
            ) : (
              <span>
                <Text>{label}</Text>
              </span>
            )}
            <strong>{result.error ? <Text>Unavailable</Text> : result.count || 0}</strong>
          </div>
        ))}
      </div>
      <LeadFilters query={query} path={filterPath} advisors={advisors} admin={admin} />
      <section className="workspace-panel case-results">
        {error || cases.error ? (
          <p role="alert" className="notice notice-error">
            <Text>We couldn’t load the lead inbox. Please try again.</Text>
          </p>
        ) : !leads.length ? (
          <div className="empty-state">
            <ClipboardList size={32} />
            <p>
              <Text>No consultations match these filters.</Text>
            </p>
          </div>
        ) : (
          <ConsultationRows
            rows={leads.map((lead, index) => {
              const record = byLead.get(lead.id);
              const progress = consultationProgress(record || null);
              const assessment = lead.eligibility_assessments;
              return {
                id: lead.id,
                href:
                  record && assessment.applicant_id
                    ? `${base}/cases/${assessment.applicant_id}`
                    : `${base}/leads/${lead.id}`,
                number: (page - 1) * 20 + index + 1,
                name: `${assessment.first_name} ${assessment.last_name}`,
                email: assessment.email,
                reference: assessment.reference,
                level: assessment.study_level,
                consultation: record ? progress.consultation : stageLabel(lead.stage),
                receipt: record ? progress.receipt : "—",
                application: record ? progress.application : "—",
                received: new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeZone: "Africa/Dar_es_Salaam",
                }).format(new Date(lead.created_at)),
              };
            })}
          />
        )}
        <div className="pagination">
          <span>
            {count} <Text>results</Text> · <Text>Page</Text> {page} <Text>of</Text>{" "}
            {Math.max(1, Math.ceil(count / 20))}
          </span>
          <div className="flex gap-5">
            {page > 1 && (
              <Link href={link(page - 1)}>
                <Text>Previous</Text>
              </Link>
            )}
            {page * 20 < count && (
              <Link href={link(page + 1)}>
                <Text>Next</Text>
              </Link>
            )}
          </div>
        </div>
      </section>
    </Workspace>
  );
}
