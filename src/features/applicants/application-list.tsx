import Link from "next/link";
import { requireUser, requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { PreviousPackageQuote } from "./package-panel";
import { PackageCatalogue } from "./package-catalogue";
import { packageStatus } from "./package-status";
import { applicationStatuses, proposalSchema } from "@/lib/validation/opportunities";
import { usdLabel } from "@/lib/format";
export type ApplicationQuery = { page?: string; status?: string };
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
    .select(
      "id,user_id,proposal,status,package_state,provider_decision,approval,next_step,next_date,created_at",
      {
        count: "exact",
      },
    )
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * 20, page * 20 - 1);
  if (own) request = request.eq("user_id", user.id);
  if (applicationStatuses.includes(query.status as (typeof applicationStatuses)[number]))
    request = request.eq("status", query.status);
  if (query.status === "interested" || query.status === "paid")
    request = request.eq("package_state", query.status);
  const { data: applications, error, count } = await request;
  if (error) throw Error("Applications unavailable");
  const base = staff ? (admin ? "/admin/applications" : "/advisor/applications") : "/dashboard/applications";
  const pageLink = (n: number) => `${base}?page=${n}&status=${encodeURIComponent(query.status || "")}`;
  return (
    <Workspace role={role} email={user.email || ""} active="applications">
      <h1>{own ? "Your applications." : "Application tracking."}</h1>
      <p>
        {own
          ? "Track your interests, packages, receipts and applications in one place."
          : "Track applicant interests, payments and application progress."}
      </p>
      <form className="filter-bar">
        <label className="field">
          Status
          <select name="status" defaultValue={query.status || ""}>
            <option value="">All statuses</option>
            <option value="interested">Interested</option>
            <option value="paid">Package paid</option>
            {applicationStatuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <button className="button button-outline" type="submit">
          Filter applications
        </button>
      </form>
      {!applications?.length ? (
        <section className="workspace-panel">
          <h2>No applications in this view.</h2>
          <p>
            {own
              ? "When your advisor shares a scholarship package, you’ll find the details and fees here."
              : "Open an applicant’s consultation to share a scholarship package."}
          </p>
          {own && (
            <Link href="/dashboard/consultations" className="text-link">
              View consultation →
            </Link>
          )}
        </section>
      ) : (
        <div className="operation-grid">
          {applications.map((a) => {
            const p = proposalSchema.safeParse(a.proposal);
            if (!p.success) throw Error("Application proposal unavailable");
            return (
              <article className="workspace-panel" key={a.id}>
                <span className="status-pill">{packageStatus(a.package_state, a.status)}</span>
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
                {a.package_state === "paid" && (
                  <p>{p.data.packageFee === 0 ? "No package fee due" : "Package payment verified"}</p>
                )}
                {(!a.package_state || a.package_state === "paid") && (
                  <p>
                    Official provider decision: <strong>{a.provider_decision}</strong>
                  </p>
                )}
                {!a.package_state && (
                  <p>
                    {a.approval === "pending"
                      ? "Waiting for applicant review"
                      : `Applicant decision: ${a.approval}`}
                  </p>
                )}
                {a.next_step && (
                  <p>
                    Next: {a.next_step}
                    {a.next_date ? ` · ${a.next_date}` : ""}
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
      {own && (
        <>
          <PackageCatalogue applicant={user.id} />
          <PreviousPackageQuote user={user.id} />
        </>
      )}
    </Workspace>
  );
}
