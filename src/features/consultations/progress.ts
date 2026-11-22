import { fullApplicationStatusLabel } from "@/lib/validation/application-review";

type CaseProgress = {
  payment_status: string;
  completed_at: string | null;
  current_declaration_id: string | null;
  application_status: string | null;
};

export const receiptLabels: Record<string, string> = {
  awaiting_receipt: "Payment needed",
  pending_verification: "Receipt under review",
  verified: "Receipt approved",
  rejected: "Receipt rejected",
};

export function consultationProgress(
  consultation: CaseProgress | null,
  { hasDraft = false, hasCall = false, hasMeeting = false } = {},
) {
  const payment = consultation?.payment_status;
  const application = consultation?.current_declaration_id
    ? fullApplicationStatusLabel(consultation.application_status || "submitted")
    : consultation?.completed_at
      ? "Unlocked"
      : "Locked";
  const stages = {
    consultation: !consultation
      ? hasDraft ? "Draft" : "Not started"
      : consultation.completed_at
        ? "Complete"
        : payment === "verified" ? "Approved" : "Submitted",
    receipt: payment ? receiptLabels[payment] : "Not due",
    application,
  };
  const consultationUrl = "/dashboard/consultations";
  const applicationUrl = "/dashboard/application";
  const step = (stage: string, action: string, href: string, label: string) => ({ ...stages, stage, action, href, label });
  if (!consultation) {
    const label = hasDraft ? "Continue consultation" : "Start consultation";
    return step("Consultation", `${label} to tell ISG about your study goals.`, "/consultation", label);
  }
  if (payment === "awaiting_receipt" || payment === "rejected")
    return step(
      "Payment", payment === "rejected" ? "Read the feedback and upload a replacement receipt." : "Pay the consultation fee and upload your receipt.",
      `${consultationUrl}#consultation-payment`, "Upload receipt",
    );
  if (payment === "pending_verification")
    return step("Receipt review", "ISG is reviewing your receipt.", `${consultationUrl}#consultation-payment`, "View receipt");
  if (!consultation.completed_at)
    return step(
      "Advisor consultation",
      hasMeeting ? "Check the time and join your scheduled meeting." : hasCall ? "Confirm a time for your WhatsApp call." : "Request a WhatsApp call or online meeting.",
      consultationUrl, "Open consultation",
    );
  if (!consultation.current_declaration_id)
    return step("Scholarship application", "Complete the form and attach your documents.", applicationUrl, "Open application");
  if (consultation.application_status === "needs_information")
    return step("Information requested", "Review ISG’s request and add the missing information.", applicationUrl, "Respond to request");
  return step(
    application,
    ["approved", "declined"].includes(consultation.application_status || "")
      ? "Open your application for ISG’s decision and next steps."
      : "Check your application for progress updates from ISG.",
    applicationUrl, "View application",
  );
}
