import { getWorkspaceText } from "@/lib/i18n/server";

import { Text } from "@/lib/i18n/workspace-text";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { ReceiptReview } from "@/features/consultations/receipt-review";
import { ReceiptPreview } from "@/features/consultations/receipt-preview";
import { proposalSchema } from "@/lib/validation/opportunities";
export default async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  const { db, user, role } = await requireStaff(true);
  const translate = await getWorkspaceText();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { data: f, error } = await db
    .from("case_files")
    .select("id,user_id,application_id,mime,review_status,review_note,study_applications(proposal)")
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
      <h1>
        {f.application_id ? translate("Package payment receipt") : translate("Consultation payment receipt")}
      </h1>
      <div className="page-links">
        <Link className="text-link" href="/admin/payments">
          <Text>{"← All payments"}</Text>
        </Link>
        <Link
          className="text-link"
          href={f.application_id ? `/admin/applications/${f.application_id}` : `/admin/cases/${f.user_id}`}
        >
          {f.application_id
            ? translate("Open application →")
            : translate("Open consultation and assign advisor →")}
        </Link>
      </div>
      <section className="workspace-panel">
        <h2>
          {amount === undefined ? translate("Check the package fee") : `TZS ${amount.toLocaleString("en")}`} ·{" "}
          {f.review_status === "pending" ? translate("Pending verification") : f.review_status}
        </h2>
        {pkg && <p>{pkg.name}</p>}
        <p>
          <Text>{"Match the receipt against the payment received before verifying it."}</Text>
        </p>
        <ReceiptPreview id={f.id} mime={f.mime} />
        <ReceiptReview id={f.id} status={f.review_status} note={f.review_note} />
      </section>
    </Workspace>
  );
}
