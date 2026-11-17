import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { Button } from "@/components/ui/button";
import { listLeads, getAdvisors } from "@/server/repositories/leads";
import { leadStages, stageLabel } from "@/lib/validation/leads";
import { studyLevels } from "@/lib/validation/assessment";
type Query = { stage?: string; level?: string; page?: string; advisor?: string; from?: string; to?: string };
export async function LeadList({ admin, query }: { admin: boolean; query: Query }) {
  const { db, user, role } = await requireStaff(admin);
  const { leads, count, error, page } = await listLeads(db, query);
  const advisors = admin ? await getAdvisors(db) : [];
  const base = admin ? "/admin" : "/advisor";
  const [all, newLeads, reviewing] = await Promise.all([
    db.from("leads").select("id", { count: "exact", head: true }),
    db.from("leads").select("id", { count: "exact", head: true }).eq("stage", "new"),
    db.from("leads").select("id", { count: "exact", head: true }).eq("stage", "under_review"),
  ]);
  const link = (n: number) => {
    const params = new URLSearchParams(
      Object.entries(query).filter((pair): pair is [string, string] => typeof pair[1] === "string"),
    );
    params.set("page", String(n));
    return `${base}?${params}`;
  };
  return (
    <Workspace role={role} email={user.email || ""}>
      <h1>{admin ? "The next chapter starts here." : "Your assigned leads."}</h1>
      <p>
        {admin
          ? "Review initial assessments, assign advisors and keep every follow-up clear."
          : "Review the assessments assigned to you. Unassigned applicants and financial records are restricted."}
      </p>
      <div className="stat-grid">
        {[
          ["Total accessible leads", all],
          ["Awaiting first review", newLeads],
          ["Under review", reviewing],
        ].map(([label, result]) => (
          <div className="stat-box" key={label as string}>
            <span>{label as string}</span>
            <strong>
              {(result as typeof all).error ? "Unavailable" : (result as typeof all).count || 0}
            </strong>
          </div>
        ))}
      </div>
      <section className="workspace-panel">
        <h2>Assessment inbox</h2>
        <form className="filter-bar">
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
                    {a.first_name} {a.last_name}
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
          <Link className="text-link" href={base}>
            Reset
          </Link>
        </form>
        {error ? (
          <p role="alert" className="notice notice-error">
            We couldn’t load the lead inbox. Please try again.
          </p>
        ) : !leads.length ? (
          <div className="empty-state">
            <ClipboardList size={32} />
            <h3>No assessments in this view.</h3>
            <p>
              New submissions appear here after secure intake. Try changing the filters, or return when a lead
              is received.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Reference</th>
                  <th>Study goal</th>
                  <th>Stage</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <Link href={`${base}/leads/${lead.id}`}>
                        {lead.eligibility_assessments.first_name} {lead.eligibility_assessments.last_name}
                      </Link>
                      <small>{lead.eligibility_assessments.email}</small>
                    </td>
                    <td>{lead.eligibility_assessments.reference}</td>
                    <td>{lead.eligibility_assessments.study_level}</td>
                    <td>
                      <span className="badge">{stageLabel(lead.stage)}</span>
                    </td>
                    <td>
                      {new Date(lead.created_at).toLocaleDateString("en-GB", {
                        timeZone: "Africa/Dar_es_Salaam",
                      })}
                    </td>
                  </tr>
                ))}
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
