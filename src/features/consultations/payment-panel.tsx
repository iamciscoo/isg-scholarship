import Link from "next/link";
import { FileUpload } from "./file-upload";
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
      <h2>Consultation fee · TZS {record.fee_tzs.toLocaleString("en")}</h2>
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
          {instructions && <FileUpload kind="receipt" />}
        </>
      )}
      {!!receipts.length && (
        <ul className="case-file-list">
          {receipts.map((f) => (
            <li key={f.id}>
              <Link href={`/api/case-files/${f.id}`}>Download your receipt</Link>
              <span>{f.review_status === "pending" ? "Pending verification" : f.review_status}</span>
              {f.review_note && <p>{f.review_note}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
