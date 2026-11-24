import { getWorkspaceText } from "@/lib/i18n/server";

import { Text } from "@/lib/i18n/workspace-text";
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
  applicant,
}: {
  id: string;
  state: string;
  status: string;
  fee: number | undefined;
  staff: boolean;
  admin: boolean;
  testPackage: boolean;
  applicant?: string;
}) {
  const translate = await getWorkspaceText();
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
      <h2>
        <Text>{"Package payment"}</Text>
      </h2>
      {status === "Cancelled" ? (
        <p>
          <Text>{"This application is closed."}</Text>
        </p>
      ) : (
        <>
          {canUpload && (
            <>
              <p>
                <Text>{"Full ISG service fee ·"}</Text>{" "}
                <strong>
                  <Text>{"TZS"}</Text> {fee?.toLocaleString("en")}
                </strong>
              </p>
              {staff && !admin ? (
                <p>
                  <Text>{"Waiting for the applicant to upload a receipt."}</Text>
                </p>
              ) : (
                <>
                  {testPackage ? (
                    <p className="notice">
                      <Text>{"Preview test only. Upload a sample receipt. Do not send money."}</Text>
                    </p>
                  ) : instructions.data ? (
                    <p className="preserve-lines">{instructions.data}</p>
                  ) : (
                    <p>
                      {admin
                        ? translate("Upload the receipt, then open it to verify payment.")
                        : translate("Ask your advisor for payment instructions before sending money.")}
                    </p>
                  )}
                  {state === "receipt_rejected" && receipt.data?.review_note && (
                    <p>{receipt.data.review_note}</p>
                  )}
                  <FileUpload kind="receipt" application={id} applicant={admin ? applicant : undefined} />
                </>
              )}
            </>
          )}
          {state === "pending_verification" && (
            <p>
              <Text>{"ISG is checking your receipt. Your application form opens after verification."}</Text>
            </p>
          )}
          {state === "paid" && (
            <p>
              {fee === 0
                ? translate("No package fee is due.")
                : translate("The full package fee has been verified.")}
            </p>
          )}
        </>
      )}
      {receipt.data && (
        <div className="receipt-actions">
          <Link
            className="text-link"
            href={admin ? `/admin/receipts/${receipt.data.id}` : `/api/case-files/${receipt.data.id}`}
          >
            {admin ? translate("Open payment receipt →") : translate("Download your receipt")}
          </Link>
          {(!staff || admin) && (
            <details className="package-gallery">
              <summary>
                <Text>{"Preview receipt"}</Text>
              </summary>
              <ReceiptPreview id={receipt.data.id} mime={receipt.data.mime} />
            </details>
          )}
        </div>
      )}
    </section>
  );
}
