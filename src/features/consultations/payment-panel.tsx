import Link from "next/link";
import { usdLabel } from "@/lib/format";
import { FileUpload } from "./file-upload";
import { ReceiptPreview } from "./receipt-preview";
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
};
const labels: Record<string, string> = {
  awaiting_receipt: "Payment needed",
  pending_verification: "Pending verification",
  verified: "Payment verified",
  rejected: "New receipt needed",
};
const nextStep: Record<string, string> = {
  awaiting_receipt: "Pay using the instructions below, then upload your receipt.",
  pending_verification: "We’ll review your receipt and update this page.",
  rejected: "Check the feedback below and upload a replacement receipt.",
  verified: "You can now request a meeting with your advisor.",
};
export function PaymentPanel({
  record,
  instructions,
  files,
  advisor,
}: {
  record: ConsultationCase;
  instructions: string;
  files: CaseFile[];
  advisor: string | null;
}) {
  const receipts = files.filter((f) => f.kind === "receipt");
  return (
    <section className="workspace-panel payment-panel">
      <span className="status-pill">{labels[record.payment_status]}</span>
      <h2>
        Consultation fee · TZS {record.fee_tzs.toLocaleString("en")}{" "}
        <span className="fee-usd">{usdLabel(record.fee_tzs)}</span>
      </h2>
      <p>
        {record.payment_status === "verified" && !advisor
          ? "ISG will assign an advisor. Then you can request a meeting or send a message."
          : record.completed_at
            ? "Your consultation is complete. Follow-up questions are included."
            : nextStep[record.payment_status]}
      </p>
      {["awaiting_receipt", "rejected"].includes(record.payment_status) && (
        <>
          <h3>Payment instructions</h3>
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
