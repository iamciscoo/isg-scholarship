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
  awaiting_receipt: "Awaiting receipt",
  pending_verification: "Pending verification",
  verified: "Payment verified",
  rejected: "Receipt needs attention",
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
    <section className="workspace-panel payment-panel">
      <span className="status-pill">{labels[record.payment_status]}</span>
      <h2>Your consultation · TZS 50,000</h2>
      <p>
        Pay once. Your verified consultation fee is credited toward a later ISG service package. Follow-up
        questions and requests for further advisor meetings do not incur another consultation fee. Meetings
        depend on scheduling.
      </p>
      {record.payment_status !== "verified" && (
        <>
          <h3>Payment instructions</h3>
          {instructions ? (
            <p className="preserve-lines">{instructions}</p>
          ) : (
            <p className="notice">
              ISG is preparing payment instructions. Contact the team before making any payment.
            </p>
          )}
          {instructions && ["awaiting_receipt", "rejected"].includes(record.payment_status) && (
            <FileUpload kind="receipt" />
          )}
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
      {record.payment_status === "verified" && (
        <p className="notice">
          Your payment is verified. TZS 50,000 is available as a one-time credit toward your ISG package.
          Provider and university fees are separate.
        </p>
      )}
    </section>
  );
}
