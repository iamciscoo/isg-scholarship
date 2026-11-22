import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FileUpload } from "@/features/consultations/file-upload";
import { ReceiptPreview } from "@/features/consultations/receipt-preview";

export async function PackageProgress({
  id,
  state,
  status,
  fee,
  staff,
  admin,
  testPackage,
}: {
  id: string;
  state: string;
  status: string;
  fee: number | undefined;
  staff: boolean;
  admin: boolean;
  testPackage: boolean;
}) {
  const db = await createClient();
  const canUpload = status === "Starting" && ["awaiting_receipt", "receipt_rejected"].includes(state);
  const [instructions, receipt] = await Promise.all([
    !staff && canUpload && !testPackage
      ? db.rpc("package_payment_instructions", { p_application: id })
      : { data: null, error: null },
    !staff || admin
      ? db
          .from("case_files")
          .select("id,mime,review_status,review_note")
          .eq("application_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null, error: null },
  ]);
  if (instructions.error || receipt.error) throw Error("Package receipt unavailable");
  return (
    <section className="workspace-panel payment-panel">
      <h2>Package payment</h2>
      {status === "Cancelled" ? (
        <p>This application is closed.</p>
      ) : (
        <>
          {canUpload && (
            <>
              <p>
                Full ISG service fee · <strong>TZS {fee?.toLocaleString("en")}</strong>
              </p>
              {staff ? (
                <p>Waiting for the applicant to upload a receipt.</p>
              ) : (
                <>
                  {testPackage ? (
                    <p className="notice">Preview test only. Upload a sample receipt. Do not send money.</p>
                  ) : instructions.data ? (
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
            <p>ISG is checking your receipt. Your application form opens after verification.</p>
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
      {receipt.data && !staff && (
        <details className="package-gallery">
          <summary>Preview receipt</summary>
          <ReceiptPreview id={receipt.data.id} mime={receipt.data.mime} />
        </details>
      )}
    </section>
  );
}
