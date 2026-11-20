import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { Button } from "@/components/ui/button";

const filters = {
  all: "All payments",
  awaiting_receipt: "Awaiting upload",
  pending_verification: "Pending verification",
  rejected: "Replacement requested",
  verified: "Verified",
} as const;
type Status = keyof typeof filters;
type Payment = {
  id: string;
  user_id: string;
  kind: "consultation" | "package";
  title: string;
  amount: number;
  applicant: string;
  state: Exclude<Status, "all">;
  updated_at: string;
  receipt_id: string | null;
  receipt_status: "pending" | "rejected" | "approved" | null;
};
type Page = { count: number; items: Payment[] };

export default async function Payments({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { db, user, role } = await requireStaff(true);
  const query = await searchParams;
  const savedStatus = query.status === "pending" ? "pending_verification" : query.status;
  const status: Status = savedStatus && Object.hasOwn(filters, savedStatus) ? (savedStatus as Status) : "all";
  const requestedPage = Math.min(100000, Math.max(1, Number.parseInt(query.page || "1", 10) || 1));
  const read = async (page: number) => {
    const { data, error } = await db.rpc("admin_payment_overview", { p_status: status, p_page: page });
    if (error || !data) throw Error("Payments unavailable");
    return data as Page;
  };
  const first = await read(requestedPage);
  const totalPages = Math.max(1, Math.ceil(first.count / 20));
  const page = Math.min(requestedPage, totalPages);
  const { count, items } = page === requestedPage ? first : await read(page);
  const pageLink = (number: number) => `/admin/payments?status=${status}&page=${number}`;
  return (
    <Workspace role={role} email={user.email || ""} active="payments">
      <h1>Payments</h1>
      <p>Track consultation and scholarship package fees from receipt upload through verification.</p>
      <form className="filter-bar" action="/admin/payments" method="get">
        <label className="field">
          Payment status
          <select name="status" defaultValue={status} key={status}>
            {Object.entries(filters).map(([key, value]) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <Button size="sm">Apply filter</Button>
      </form>
      {!items.length && (
        <section className="workspace-panel">
          <h2>{status === "all" ? "No payments yet" : "No payments at this stage"}</h2>
          {status !== "all" && (
            <Link href="/admin/payments" className="text-link">
              View all payments →
            </Link>
          )}
        </section>
      )}
      <div className="operation-grid">
        {items.map((p) => (
          <article className="workspace-panel" key={`${p.kind}:${p.id}`}>
            <span className="status-pill">
              {p.amount === 0 && p.state === "verified" ? "No fee due" : filters[p.state]}
            </span>
            <h2>
              {p.applicant} · TZS {p.amount.toLocaleString("en")}
            </h2>
            <p>{p.title}</p>
            <div className="workspace-action-row">
              {p.receipt_id && (
                <Link className="text-link" href={`/admin/receipts/${p.receipt_id}`}>
                  {p.receipt_status === "pending" ? "Review receipt →" : "View receipt →"}
                </Link>
              )}
              <Link
                className="text-link"
                href={p.kind === "package" ? `/admin/applications/${p.id}` : `/admin/cases/${p.user_id}`}
              >
                {p.kind === "package" ? "Open application →" : "Open consultation →"}
              </Link>
            </div>
          </article>
        ))}
      </div>
      <nav className="pagination" aria-label="Payment pages">
        <span>
          {count} payments · Page {page} of {totalPages}
        </span>
        <div className="flex gap-5">
          {page > 1 && <Link href={pageLink(page - 1)}>Previous</Link>}
          {page < totalPages && <Link href={pageLink(page + 1)}>Next</Link>}
        </div>
      </nav>
    </Workspace>
  );
}
