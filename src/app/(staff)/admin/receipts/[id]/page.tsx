import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { ActionForm } from "@/components/forms/action-form";
import { reviewPayment } from "@/features/consultations/payment-actions";
export default async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  const { db, user, role } = await requireStaff(true);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { data: f, error } = await db
    .from("case_files")
    .select("id,review_status,review_note,created_at")
    .eq("id", id)
    .eq("kind", "receipt")
    .maybeSingle();
  if (error) throw Error("Receipt unavailable");
  if (!f) notFound();
  return (
    <Workspace role={role} email={user.email || ""} active="payments">
      <h1>Private consultation receipt.</h1>
      <section className="workspace-panel">
        <h2>TZS 50,000 · {f.review_status === "pending" ? "Pending verification" : f.review_status}</h2>
        <p>
          Match this receipt with the actual CRDB payment before approval. Downloads require sign-in and
          authorized access.
        </p>
        <Link className="text-link" href={`/api/case-files/${f.id}`}>
          Download private receipt
        </Link>
        {f.review_status === "pending" ? (
          <ActionForm action={reviewPayment} label="Record payment review">
            <input type="hidden" name="id" value={f.id} />
            <label>
              Decision
              <select name="approve">
                <option value="true">Approve — payment received</option>
                <option value="false">Reject — needs correction</option>
              </select>
            </label>
            <label>
              Review note
              <textarea name="note" minLength={3} maxLength={1000} required />
            </label>
          </ActionForm>
        ) : (
          <p>{f.review_note}</p>
        )}
      </section>
    </Workspace>
  );
}
