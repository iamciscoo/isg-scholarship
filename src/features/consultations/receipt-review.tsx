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
            secondary: {
              label: "Request a new receipt",
              value: "false",
              confirmation: {
                title: "Request a new receipt?",
                description: "The applicant will be asked to upload a replacement receipt.",
              },
            },
          }}
        >
          <input type="hidden" name="id" value={id} />
        </ActionForm>
      ) : (
        <p>{note}</p>
      )}
    </>
  );
}
