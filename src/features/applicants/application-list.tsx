import Link from "next/link";
import { requireUser, requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { packageStatus } from "./package-status";
import { proposalSchema } from "@/lib/validation/opportunities";
import { usdLabel } from "@/lib/format";
import { fullApplicationStatusLabel } from "@/lib/validation/application-review";
import { NavigableRow } from "@/components/layout/navigable-row";
export type ApplicationQuery = { page?: string };
export async function ApplicationList({
  query,
  staff = false,
  admin = false,
}: {
  query: ApplicationQuery;
  staff?: boolean;
  admin?: boolean;
}) {
  const { db, user, role } = staff ? await requireStaff(admin) : await requireUser();
  const own = !staff;
  const page = Math.max(1, Math.min(100000, Number.parseInt(query.page || "1", 10) || 1));
  let request = db
    .from("study_applications")
    .select("id,user_id,proposal,status,package_state,created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * 20, page * 20 - 1);
  if (own) request = request.eq("user_id", user.id);
  const { data: applications, error, count } = await request;
  if (error) throw Error("Applications unavailable");
  const ids = (applications ?? []).map((a) => a.user_id);
  const cases = ids.length
    ? await db
        .from("consultation_cases")
        .select("user_id,application_status,current_declaration_id")
        .in("user_id", ids)
    : { data: [], error: null };
  if (cases.error) throw Error("Application status unavailable");
  const byUser = new Map(cases.data?.map((entry) => [entry.user_id, entry]));
  const people =
    staff && ids.length
      ? await db.from("profiles").select("id,first_name,last_name").in("id", ids)
      : { data: [], error: null };
  if (people.error) throw Error("Applicant names unavailable");
  const names = new Map(
    (people.data ?? []).map((p) => [p.id, `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()]),
  );
  const base = staff ? (admin ? "/admin/applications" : "/advisor/applications") : "/dashboard/applications";
  const pageLink = (n: number) =>
    `${base}?${new URLSearchParams({
      page: String(n),
    })}`;
  return (
    <Workspace role={role} email={user.email || ""} active="applications">
      <h1>Applications</h1>
      {!applications?.length ? (
        <section className="workspace-panel">
          <h2>No applications in this view.</h2>
          <p>
            {own
              ? "ISG will assign your package after the consultation."
              : "Open an applicant’s consultation to assign a scholarship package."}
          </p>
          {own && (
            <Link href="/dashboard/consultations" className="text-link">
              View consultation →
            </Link>
          )}
        </section>
      ) : staff ? (
        <section className="workspace-panel table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Applicant</th>
                <th scope="col">Package</th>
                <th scope="col">Destination</th>
                <th scope="col">Payment</th>
                <th scope="col">Application</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a, index) => {
                const proposal = proposalSchema.parse(a.proposal);
                const record = byUser.get(a.user_id);
                return (
                  <NavigableRow key={a.id} href={`${base}/${a.id}`}>
                    <td>{(page - 1) * 20 + index + 1}</td>
                    <td>
                      <Link href={`${base}/${a.id}`}>
                        {names.get(a.user_id) || `Applicant ${a.user_id.slice(0, 8)}`}
                      </Link>
                      <small>
                        <Link href={`${base}/${a.id}`}>View application →</Link>
                      </small>
                    </td>
                    <td>{proposal.name}</td>
                    <td>{proposal.destination}</td>
                    <td>{packageStatus(a.package_state, a.status)}</td>
                    <td>
                      {record?.application_status
                        ? fullApplicationStatusLabel(record.application_status)
                        : "Not submitted"}
                    </td>
                  </NavigableRow>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : (
        <div className="operation-grid">
          {applications.map((a) => {
            const p = proposalSchema.safeParse(a.proposal);
            if (!p.success) throw Error("Application proposal unavailable");
            const record = byUser.get(a.user_id);
            return (
              <article className="workspace-panel" key={a.id}>
                <span className="status-pill">
                  {record?.application_status
                    ? fullApplicationStatusLabel(record.application_status)
                    : packageStatus(a.package_state, a.status)}
                </span>
                <h2>{p.data.name}</h2>
                <p>
                  {p.data.provider} · {p.data.destination}
                </p>
                {p.data.packageFee !== undefined && (
                  <p>
                    ISG package fee · <strong>TZS {p.data.packageFee.toLocaleString("en")}</strong>
                    <small>{usdLabel(p.data.packageFee)}</small>
                  </p>
                )}
                <Link className="text-link" href={`${base}/${a.id}`}>
                  View application →
                </Link>
              </article>
            );
          })}
        </div>
      )}
      <div className="pagination">
        <span>
          {count || 0} applications · Page {page}
        </span>
        <div>
          {page > 1 && <Link href={pageLink(page - 1)}>← Previous </Link>}
          {page * 20 < (count || 0) && <Link href={pageLink(page + 1)}> Next →</Link>}
        </div>
      </div>
    </Workspace>
  );
}
