import Link from "next/link";
import { ActionForm } from "@/components/forms/action-form";
import { reviewPayment } from "./payment-actions";

export function ReceiptReview({ id, status, note }: { id: string; status: string; note: string }) {
  return (
    <>
      <Link className="text-link" href={`/api/case-files/${id}`}>
        Download receipt
      </Link>
      {status === "pending" ? (
        <ActionForm action={reviewPayment} label="Save payment decision">
          <input type="hidden" name="id" value={id} />
          <label>
            Decision
            <select name="approve" defaultValue="" required>
              <option value="">Choose a decision</option>
              <option value="true">Verify payment received</option>
              <option value="false">Request a new receipt</option>
            </select>
          </label>
          <label>
            Feedback to the applicant (optional)
            <textarea name="note" maxLength={1000} />
          </label>
        </ActionForm>
      ) : (
        <p>{note}</p>
      )}
    </>
  );
}
