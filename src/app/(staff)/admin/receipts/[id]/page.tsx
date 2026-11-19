import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { ReceiptReview } from "@/features/consultations/receipt-review";
import { proposalSchema } from "@/lib/validation/opportunities";
export default async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  const { db, user, role } = await requireStaff(true);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { data: f, error } = await db
    .from("case_files")
    .select("id,user_id,application_id,review_status,review_note,study_applications(proposal)")
    .eq("id", id)
    .eq("kind", "receipt")
    .maybeSingle();
  if (error) throw Error("Receipt unavailable");
  if (!f) notFound();
  const application = f.study_applications as unknown as { proposal: unknown } | null;
  const pkg = proposalSchema.safeParse(application?.proposal).data;
  const amount = f.application_id ? pkg?.packageFee : 50000;
  return (
    <Workspace role={role} email={user.email || ""} active="payments">
      <h1>{f.application_id ? "Package payment receipt" : "Consultation payment receipt"}</h1>
      <Link
        className="text-link"
        href={f.application_id ? `/admin/applications/${f.application_id}` : `/admin/cases/${f.user_id}`}
      >
        {f.application_id ? "Open application →" : "Open consultation and assign advisor →"}
      </Link>
      <section className="workspace-panel">
        <h2>
          {amount === undefined ? "Check the package fee" : `TZS ${amount.toLocaleString("en")}`} ·{" "}
          {f.review_status === "pending" ? "Pending verification" : f.review_status}
        </h2>
        {pkg && <p>{pkg.name}</p>}
        <p>Match the receipt against the payment received before verifying it.</p>
        <ReceiptReview id={f.id} status={f.review_status} note={f.review_note} />
      </section>
    </Workspace>
  );
}
