import Link from "next/link";
import { usdLabel } from "@/lib/format";
import { FileUpload } from "./file-upload";
import { ReceiptPreview } from "./receipt-preview";
import { receiptLabels } from "./progress";
export type ConsultationCase = {
  user_id: string;
  lead_id: string;
  payment_status: string;
  verified_at: string | null;
  completed_at: string | null;
  fee_tzs: number;
};
export type CaseFile = {
  id: string;
  user_id: string;
  kind: string;
  mime: string;
  category: string;
  review_status: string;
  review_note: string;
  created_at: string;
  original_name?: string;
};
const nextStep: Record<string, string> = {
  awaiting_receipt: "Pay using the instructions below, then upload your receipt.",
  pending_verification: "We’ll review your receipt and update this page.",
  rejected: "Check the feedback below and upload a replacement receipt.",
  verified: "Your consultation payment is confirmed.",
};
export function PaymentPanel({
  record,
  instructions,
  files,
}: {
  record: ConsultationCase;
  instructions: string;
  files: CaseFile[];
}) {
  const receipts = files.filter((f) => f.kind === "receipt");
  return (
    <section className="workspace-panel payment-panel" id="consultation-payment">
      <span className="status-pill">{receiptLabels[record.payment_status]}</span>
      <h2>
        Consultation fee · TZS {record.fee_tzs.toLocaleString("en")}{" "}
        <span className="fee-usd">{usdLabel(record.fee_tzs)}</span>
      </h2>
      <p>{nextStep[record.payment_status]}</p>
      {["awaiting_receipt", "rejected"].includes(record.payment_status) && (
        <>
          {instructions ? (
            <p className="preserve-lines">{instructions}</p>
          ) : (
            <p className="notice">
              ISG is preparing payment instructions. Contact the team before making any payment.
            </p>
          )}
          {(instructions || record.payment_status === "rejected") && <FileUpload kind="receipt" />}
        </>
      )}
      {!!receipts.length && (
        <ul className="case-file-list">
          {receipts.map((f, index) => (
            <li key={f.id}>
              <Link href={`/api/case-files/${f.id}`}>Download your receipt</Link>
              <span>{f.review_status === "pending" ? "Pending verification" : f.review_status}</span>
              {f.review_note && <p>{f.review_note}</p>}
              {index === 0 && (
                <details className="package-gallery">
                  <summary>Preview receipt</summary>
                  <ReceiptPreview id={f.id} mime={f.mime} />
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
