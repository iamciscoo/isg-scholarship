import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { ReceiptReview } from "@/features/consultations/receipt-review";
import { Button } from "@/components/ui/button";
import { proposalSchema } from "@/lib/validation/opportunities";
type Query = { page?: string | string[]; status?: string | string[] };
const pageSize = 20;
export default async function Payments({ searchParams }: { searchParams: Promise<Query> }) {
  const { db, user, role } = await requireStaff(true);
  const query = await searchParams;
  const status = query.status === "all" ? "all" : "pending";
  const requestedPage =
    typeof query.page === "string" && /^\d+$/.test(query.page) && Number.isSafeInteger(Number(query.page))
      ? Math.max(1, Number(query.page))
      : 1;
  let countQuery = db.from("case_files").select("id", { count: "exact", head: true }).eq("kind", "receipt");
  if (status === "pending") countQuery = countQuery.eq("review_status", "pending");
  const { count, error: countError } = await countQuery;
  if (countError) throw Error("Payment receipts unavailable");
  const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize));
  const page = Math.min(requestedPage, totalPages);
  let filesQuery = db
    .from("case_files")
    .select(
      "id,user_id,application_id,review_status,review_note,created_at,study_applications(proposal),consultation_cases(profiles!consultation_cases_user_id_fkey(first_name,last_name))",
    )
    .eq("kind", "receipt");
  if (status === "pending") filesQuery = filesQuery.eq("review_status", "pending");
  const { data: files, error } = await filesQuery
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw Error("Payment receipts unavailable");
  const pageLink = (value: number) => `/admin/payments?status=${status}&page=${value}`;
  return (
    <Workspace role={role} email={user.email || ""} active="payments">
      <h1>Payments</h1>
      <p>
        Review the receipt against the actual payment received before approving. A receipt upload is a claim,
        not a confirmed payment.
      </p>
      <form className="filter-bar">
        <div className="field">
          <label htmlFor="receipt-status">Receipt status</label>
          <select name="status" id="receipt-status" defaultValue={status} key={status}>
            <option value="pending">Pending verification</option>
            <option value="all">All statuses</option>
          </select>
        </div>
        <Button size="sm">Apply filter</Button>
      </form>
      {!files?.length ? (
        <section className="workspace-panel">
          <h2>{status === "pending" ? "No receipts awaiting verification." : "No receipts yet."}</h2>
          <p>Consultation and scholarship package receipts appear here.</p>
        </section>
      ) : (
        files.map((f) => {
          const relation = f.consultation_cases as unknown as {
            profiles: { first_name: string; last_name: string };
          };
          const name =
            [relation?.profiles?.first_name, relation?.profiles?.last_name].filter(Boolean).join(" ") ||
            "Applicant";
          const application = f.study_applications as unknown as { proposal: unknown } | null;
          const pkg = proposalSchema.safeParse(application?.proposal).data;
          const amount = f.application_id ? pkg?.packageFee : 50000;
          return (
            <section className="workspace-panel" key={f.id}>
              <span className="status-pill">
                {f.review_status === "pending" ? "Pending verification" : f.review_status}
              </span>
              <h2>
                {name} · {amount === undefined ? "Check package fee" : `TZS ${amount.toLocaleString("en")}`}
              </h2>
              <p>{pkg?.name || "Consultation fee"}</p>
              <p>
                {new Date(f.created_at).toLocaleString("en-GB", { timeZone: "Africa/Dar_es_Salaam" })} EAT
              </p>
              <ReceiptReview id={f.id} status={f.review_status} note={f.review_note} />
              <Link
                className="text-link"
                href={
                  f.application_id ? `/admin/applications/${f.application_id}` : `/admin/cases/${f.user_id}`
                }
              >
                {f.application_id ? "Open application →" : "Open consultation →"}
              </Link>
            </section>
          );
        })
      )}
      <nav className="pagination" aria-label="Receipt pages">
        <span>
          {count || 0} receipts · Page {page} of {totalPages}
        </span>
        <div className="flex gap-5">
          {page > 1 && <Link href={pageLink(page - 1)}>Previous</Link>}
          {page < totalPages && <Link href={pageLink(page + 1)}>Next</Link>}
        </div>
      </nav>
    </Workspace>
  );
}
