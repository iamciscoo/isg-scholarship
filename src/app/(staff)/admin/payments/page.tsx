import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { ActionForm } from "@/components/forms/action-form";
import { Button } from "@/components/ui/button";
import { reviewPayment } from "@/features/consultations/payment-actions";
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
      "id,user_id,review_status,review_note,created_at,consultation_cases(profiles!consultation_cases_user_id_fkey(first_name,last_name))",
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
      <h1>Consultation payments.</h1>
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
          <p>Applicants can upload a receipt after submitting their consultation.</p>
        </section>
      ) : (
        files.map((f) => {
          const relation = f.consultation_cases as unknown as {
            profiles: { first_name: string; last_name: string };
          };
          const name =
            [relation?.profiles?.first_name, relation?.profiles?.last_name].filter(Boolean).join(" ") ||
            "Applicant";
          return (
            <section className="workspace-panel" key={f.id}>
              <span className="status-pill">
                {f.review_status === "pending" ? "Pending verification" : f.review_status}
              </span>
              <h2>{name} · TZS 50,000</h2>
              <p>
                {new Date(f.created_at).toLocaleString("en-GB", { timeZone: "Africa/Dar_es_Salaam" })} EAT
              </p>
              <Link href={`/api/case-files/${f.id}`} className="text-link">
                Download private receipt
              </Link>
              {f.review_status === "pending" ? (
                <ActionForm action={reviewPayment} label="Record payment review">
                  <input type="hidden" name="id" value={f.id} />
                  <label>
                    Decision
                    <select name="approve" required>
                      <option value="">Choose a decision</option>
                      <option value="true">Approve — payment received</option>
                      <option value="false">Reject — needs correction</option>
                    </select>
                  </label>
                  <label>
                    Review note
                    <textarea name="note" minLength={3} maxLength={1000} required />
                  </label>
                  <p>Do not include bank account numbers or other sensitive financial details in the note.</p>
                </ActionForm>
              ) : (
                <p>{f.review_note}</p>
              )}
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
