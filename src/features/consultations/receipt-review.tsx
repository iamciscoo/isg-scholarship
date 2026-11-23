import { Text } from "@/lib/i18n/workspace-text";
import { ActionForm } from "@/components/forms/action-form";
import { reviewPayment } from "./payment-actions";

export function ReceiptReview({ id, status, note }: { id: string; status: string; note: string }) {
  return (
    <>
      {status === "pending" ? (
        <ActionForm
          action={reviewPayment}
          decisions={{
            name: "approve",
            primary: { label: "Verify payment received", value: "true" },
            secondary: { label: "Request a new receipt", value: "false" },
          }}
        >
          <input type="hidden" name="id" value={id} />
          <label>
            <Text>{"Feedback to the applicant (optional)"}</Text>
            <textarea name="note" maxLength={1000} />
          </label>
        </ActionForm>
      ) : (
        <p>{note}</p>
      )}
    </>
  );
}
