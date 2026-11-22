import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import {
  fullApplicationStatuses,
  fullApplicationStatusLabel,
  type FullApplicationStatus,
} from "@/lib/validation/application-review";
import { ApplicationList, type ApplicationQuery } from "./application-list";
import { applicationDate } from "./application-updates";

export async function ApplicationOverview({
  query,
  admin = false,
}: {
  query: ApplicationQuery;
  admin?: boolean;
}) {
  if (query.view === "packages") return <ApplicationList query={query} staff admin />;

  const { db, user, role } = await requireStaff(admin);
  const area = admin ? "/admin" : "/advisor";
  const page = Math.max(1, Math.min(10000, Number.parseInt(query.page || "1", 10) || 1));
  const status = fullApplicationStatuses.find((value) => value === query.status);
  let request = db
    .from("full_application_queue")
    .select("id,applicant,programme,status,accepted_at", { count: "exact" })
    .order("accepted_at", { ascending: false })
    .order("id")
    .range((page - 1) * 20, page * 20 - 1);
  if (status) request = request.eq("status", status);
  const { data, error, count } = await request;
  if (error) throw Error("Application submissions unavailable");
  const pageHref = (n: number) =>
    `${area}/applications?${new URLSearchParams({ page: String(n), status: status || "" })}`;

  return (
    <Workspace role={role} email={user.email || ""} active="applications">
      <div className="workspace-page-heading">
        <h1>Scholarship applications</h1>
        <Link href={`${area}/applications?view=packages`} className="text-link">
          Package tracking →
        </Link>
      </div>
      <form className="filter-bar">
        <label className="field">
          Status
          <select name="status" defaultValue={status || ""}>
            <option value="">All statuses</option>
            {fullApplicationStatuses.map((value) => (
              <option key={value} value={value}>
                {fullApplicationStatusLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <button className="button button-outline" type="submit">
          Filter
        </button>
      </form>
      <section className="workspace-panel" aria-label="Submitted scholarship applications">
        {!data.length ? (
          <p>
            {status
              ? "No applications match this status."
              : "No scholarship applications have been submitted yet."}
          </p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Programme</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {data.map(
                  (row: {
                    id: string;
                    applicant: string;
                    programme: string;
                    status: FullApplicationStatus;
                    accepted_at: string;
                  }) => (
                    <tr key={row.id}>
                      <td>
                        <Link className="text-link" href={`${area}/declarations/${row.id}`}>
                          {row.applicant || "Review application"}
                        </Link>
                      </td>
                      <td>{row.programme || "—"}</td>
                      <td>
                        <span className="status-pill">{fullApplicationStatusLabel(row.status)}</span>
                      </td>
                      <td>
                        <time dateTime={row.accepted_at}>{applicationDate(row.accepted_at)}</time>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {(count || 0) > 20 && (
        <div className="pagination">
          <span>
            {count} applications · Page {page}
          </span>
          <div>
            {page > 1 && <Link href={pageHref(page - 1)}>← Previous </Link>}
            {page * 20 < (count || 0) && <Link href={pageHref(page + 1)}> Next →</Link>}
          </div>
        </div>
      )}
    </Workspace>
  );
}
