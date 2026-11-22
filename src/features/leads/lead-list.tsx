import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { Button } from "@/components/ui/button";
import { listLeads, getAdvisors } from "@/server/repositories/leads";
import { leadStages, stageLabel } from "@/lib/validation/leads";
import { studyLevels } from "@/lib/validation/assessment";
import { consultationProgress } from "@/features/consultations/progress";
type Query = { stage?: string; level?: string; page?: string; advisor?: string; from?: string; to?: string };
export async function LeadList({ admin, query }: { admin: boolean; query: Query }) {
  const { db, user, role } = await requireStaff(admin);
  const { leads, count, error, page } = await listLeads(db, query);
  const advisors = admin ? await getAdvisors(db) : [];
  const base = admin ? "/admin" : "/advisor";
  const [all, newLeads, reviewing] = await Promise.all([
    db.from("leads").select("id", { count: "exact", head: true }),
    db.from("consultation_cases").select("user_id", { count: "exact", head: true }).eq("payment_status", "pending_verification"),
    db.from("consultation_cases").select("user_id", { count: "exact", head: true }).in("application_status", ["submitted", "in_review"]),
  ]);
  const ids = leads.map((lead) => lead.id);
  const cases = ids.length
    ? await db.from("consultation_cases").select("lead_id,payment_status,completed_at,current_declaration_id,application_status").in("lead_id", ids)
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
      <h1>Consultations</h1>
      <div className="stat-grid">
        {[
          { label: "Consultations", result: all },
          ...(admin ? [{ label: "Receipts to review", result: newLeads, href: "/admin/payments?status=pending_verification" }] : []),
          { label: "Applications to review", result: reviewing, href: `${base}/applications` },
        ].map(({ label, result, ...item }) => (
          <div className="stat-box" key={label}>
            {"href" in item && typeof item.href === "string" ? <Link href={item.href}>{label}</Link> : <span>{label}</span>}
            <strong>{result.error ? "Unavailable" : result.count || 0}</strong>
          </div>
        ))}
      </div>
      <section className="workspace-panel">
        <form className="filter-bar" action={filterPath}>
          <div className="field">
            <label htmlFor="filter-stage">Stage</label>
            <select name="stage" id="filter-stage" defaultValue={query.stage || ""}>
              <option value="">All stages</option>
              {leadStages.map((stage) => (
                <option key={stage} value={stage}>
                  {stageLabel(stage)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="filter-level">Study level</label>
            <select name="level" id="filter-level" defaultValue={query.level || ""}>
              <option value="">All levels</option>
              {studyLevels.map((level) => (
                <option key={level}>{level}</option>
              ))}
            </select>
          </div>
          {admin && (
            <div className="field">
              <label htmlFor="filter-advisor">Advisor</label>
              <select name="advisor" id="filter-advisor" defaultValue={query.advisor || ""}>
                <option value="">All advisors</option>
                {advisors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {`${a.first_name} ${a.last_name}`.trim() || a.email}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="field">
            <label htmlFor="from">Received from (UTC)</label>
            <input type="date" name="from" id="from" defaultValue={query.from} />
          </div>
          <div className="field">
            <label htmlFor="to">To (UTC)</label>
            <input type="date" name="to" id="to" defaultValue={query.to} />
          </div>
          <Button size="sm">Apply filters</Button>
          <Link className="text-link" href={filterPath}>
            Reset
          </Link>
        </form>
        {error || cases.error ? (
          <p role="alert" className="notice notice-error">
            We couldn’t load the lead inbox. Please try again.
          </p>
        ) : !leads.length ? (
          <div className="empty-state">
            <ClipboardList size={32} />
            <p>No consultations match these filters.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Reference</th>
                  <th>Study goal</th>
                  <th>Consultation</th>
                  <th>Receipt</th>
                  <th>Application</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const record = byLead.get(lead.id);
                  const status = consultationProgress(record || null);
                  const applicantId = lead.eligibility_assessments.applicant_id;
                  return (
                  <tr key={lead.id}>
                    <td>
                      <Link href={record && applicantId ? `${base}/cases/${applicantId}` : `${base}/leads/${lead.id}`}>
                        {lead.eligibility_assessments.first_name} {lead.eligibility_assessments.last_name}
                      </Link>
                      <small>{lead.eligibility_assessments.email}</small>
                    </td>
                    <td>{lead.eligibility_assessments.reference}</td>
                    <td>{lead.eligibility_assessments.study_level}</td>
                    <td>
                      <span className="badge">{record ? status.consultation : stageLabel(lead.stage)}</span>
                    </td>
                    <td>{record ? status.receipt : "—"}</td>
                    <td>{record ? status.application : "—"}</td>
                    <td>
                      {new Date(lead.created_at).toLocaleDateString("en-GB", {
                        timeZone: "Africa/Dar_es_Salaam",
                      })}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="pagination">
          <span>
            {count} results • Page {page} of {Math.max(1, Math.ceil(count / 20))}
          </span>
          <div className="flex gap-5">
            {page > 1 && <Link href={link(page - 1)}>Previous</Link>}
            {page * 20 < count && <Link href={link(page + 1)}>Next</Link>}
          </div>
        </div>
      </section>
    </Workspace>
  );
}
