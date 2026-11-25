import { Text } from "@/lib/i18n/workspace-text";
import { getWorkspaceText } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { requireUser, requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { packageStatus } from "./package-status";
import { proposalSchema } from "@/lib/validation/opportunities";
import { usdLabel } from "@/lib/format";
import { fullApplicationStatusLabel, fullApplicationStatuses } from "@/lib/validation/application-review";
import { NavigableRow } from "@/components/layout/navigable-row";
export type ApplicationQuery = { page?: string; q?: string; status?: string };
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
  const t = await getWorkspaceText();
  const own = !staff;
  const search = (query.q || "").trim();
  const status = (query.status || "").trim();
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
  if (staff && (search || status)) {
    let allow: string[] | null = null;
    if (search) {
      const { data, error } = await db.rpc("staff_application_users", { p_search: search });
      if (error) throw Error("Applications unavailable");
      allow = (data as string[] | null) ?? [];
    }
    if (status) {
      const { data, error } = await db
        .from("consultation_cases")
        .select("user_id")
        .eq("application_status", status);
      if (error) throw Error("Applications unavailable");
      const ids = (data ?? []).map((row) => row.user_id);
      allow = allow ? allow.filter((id) => ids.includes(id)) : ids;
    }
    request = allow?.length
      ? request.in("user_id", allow)
      : request.eq("id", "00000000-0000-0000-0000-000000000000");
  }
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
      ...(search ? { q: search } : {}),
      ...(status ? { status } : {}),
      page: String(n),
    })}`;
  return (
    <Workspace role={role} email={user.email || ""} active="applications">
      <h1>
        <Text>{"Applications"}</Text>
      </h1>
      {staff && (
        <form className="case-filters" action={base}>
          <div className="filter-primary">
            <div className="field">
              <label htmlFor="application-filter-q">
                <Text>{"Name or email"}</Text>
              </label>
              <input type="search" name="q" id="application-filter-q" defaultValue={query.q || ""} />
            </div>
            <div className="field">
              <label htmlFor="application-filter-status">
                <Text>{"Application status"}</Text>
              </label>
              <select name="status" id="application-filter-status" defaultValue={status}>
                <option value="">{t("All statuses")}</option>
                {fullApplicationStatuses.map((value) => (
                  <option key={value} value={value}>
                    {t(fullApplicationStatusLabel(value))}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="filter-actions">
            <Link className="text-link" href={base}>
              <Text>{"Reset"}</Text>
            </Link>
            <Button size="sm">
              <Text>{"Apply filters"}</Text>
            </Button>
          </div>
        </form>
      )}
      {!applications?.length ? (
        <section className="workspace-panel">
          <h2>
            <Text>{"No applications in this view."}</Text>
          </h2>
          <p>
            {
              <Text>
                {own
                  ? "ISG will assign your package after the consultation."
                  : "Open an applicant’s consultation to assign a scholarship package."}
              </Text>
            }
          </p>
          {own && (
            <Link href="/dashboard/consultations" className="text-link">
              <Text>{"View consultation →"}</Text>
            </Link>
          )}
        </section>
      ) : staff ? (
        <section className="workspace-panel table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">
                  <Text>{"Applicant"}</Text>
                </th>
                <th scope="col">
                  <Text>{"Package"}</Text>
                </th>
                <th scope="col">
                  <Text>{"Destination"}</Text>
                </th>
                <th scope="col">
                  <Text>{"Payment"}</Text>
                </th>
                <th scope="col">
                  <Text>{"Application"}</Text>
                </th>
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
                        <Link href={`${base}/${a.id}`}>
                          <Text>{"View application →"}</Text>
                        </Link>
                      </small>
                    </td>
                    <td>{proposal.name}</td>
                    <td>{proposal.destination}</td>
                    <td>{<Text>{packageStatus(a.package_state, a.status)}</Text>}</td>
                    <td>
                      {
                        <Text>
                          {record?.application_status
                            ? fullApplicationStatusLabel(record.application_status)
                            : "Not submitted"}
                        </Text>
                      }
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
                  {
                    <Text>
                      {record?.application_status
                        ? fullApplicationStatusLabel(record.application_status)
                        : packageStatus(a.package_state, a.status)}
                    </Text>
                  }
                </span>
                <h2>{p.data.name}</h2>
                <p>
                  {p.data.provider} · {p.data.destination}
                </p>
                {p.data.packageFee !== undefined && (
                  <p>
                    <Text>{"ISG package fee ·"}</Text>{" "}
                    <strong>
                      <Text>{"TZS"}</Text> {p.data.packageFee.toLocaleString("en")}
                    </strong>
                    <small>{usdLabel(p.data.packageFee)}</small>
                  </p>
                )}
                <Link className="text-link" href={`${base}/${a.id}`}>
                  <Text>{"View application →"}</Text>
                </Link>
              </article>
            );
          })}
        </div>
      )}
      <div className="pagination">
        <span>
          {count || 0} <Text>{"applications · Page"}</Text> {page}
        </span>
        <div>
          {page > 1 && (
            <Link href={pageLink(page - 1)}>
              <Text>{"← Previous"}</Text>{" "}
            </Link>
          )}
          {page * 20 < (count || 0) && (
            <Link href={pageLink(page + 1)}>
              {" "}
              <Text>{"Next →"}</Text>
            </Link>
          )}
        </div>
      </div>
    </Workspace>
  );
}
