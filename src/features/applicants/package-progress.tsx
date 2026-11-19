import Link from "next/link";
import { ActionForm } from "@/components/forms/action-form";
import { createClient } from "@/lib/supabase/server";
import { FileUpload } from "@/features/consultations/file-upload";
import { approveApplication } from "./tracking-actions";

export async function PackageProgress({
  id,
  state,
  status,
  fee,
  staff,
  admin,
}: {
  id: string;
  state: string;
  status: string;
  fee: number | undefined;
  staff: boolean;
  admin: boolean;
}) {
  const db = await createClient();
  const canUpload = status === "Starting" && ["awaiting_receipt", "receipt_rejected"].includes(state);
  const [instructions, receipt] = await Promise.all([
    !staff && canUpload
      ? db.rpc("package_payment_instructions", { p_application: id })
      : { data: null, error: null },
    !staff || admin
      ? db
          .from("case_files")
          .select("id,review_status,review_note")
          .eq("application_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null, error: null },
  ]);
  if (instructions.error || receipt.error) throw Error("Package receipt unavailable");
  return (
    <section className="workspace-panel payment-panel">
      <h2>{state === "interested" || state === "recommended" ? "Next step" : "Package payment"}</h2>
      {status === "Cancelled" ? (
        <p>This application is closed.</p>
      ) : (
        <>
          {state === "interested" && (
            <p>
              {staff
                ? "Discuss the applicant’s interest, then recommend the package from their consultation."
                : "Interest saved. Discuss this package with your assigned advisor."}
            </p>
          )}
          {state === "recommended" &&
            (staff ? (
              <p>Waiting for the applicant to confirm this package.</p>
            ) : (
              <ActionForm action={approveApplication} label="Save my decision">
                <input type="hidden" name="id" value={id} />
                <p>Confirm after you and your advisor agree to proceed.</p>
                <label>
                  Decision
                  <select name="approve" required defaultValue="">
                    <option value="">Choose your decision</option>
                    <option value="true">Confirm this package</option>
                    <option value="false">Decline this package</option>
                  </select>
                </label>
              </ActionForm>
            ))}
          {canUpload && (
            <>
              <p>
                Full ISG service fee · <strong>TZS {fee?.toLocaleString("en")}</strong>
              </p>
              {staff ? (
                <p>Waiting for the applicant to upload a receipt.</p>
              ) : (
                <>
                  {instructions.data ? (
                    <p className="preserve-lines">{instructions.data}</p>
                  ) : (
                    <p>Ask your advisor for payment instructions before sending money.</p>
                  )}
                  {state === "receipt_rejected" && receipt.data?.review_note && (
                    <p>{receipt.data.review_note}</p>
                  )}
                  <FileUpload kind="receipt" application={id} />
                </>
              )}
            </>
          )}
          {state === "pending_verification" && (
            <p>ISG is checking the receipt. The advisor can start after payment is verified.</p>
          )}
          {state === "paid" && (
            <p>{fee === 0 ? "No package fee is due." : "The full package fee has been verified."}</p>
          )}
        </>
      )}
      {receipt.data && (
        <Link
          className="text-link"
          href={admin ? `/admin/receipts/${receipt.data.id}` : `/api/case-files/${receipt.data.id}`}
        >
          {admin ? "Open payment receipt →" : "Download your receipt"}
        </Link>
      )}
    </section>
  );
}
