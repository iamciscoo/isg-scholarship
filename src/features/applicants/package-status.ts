const packageLabels: Record<string, string> = {
  interested: "Interested",
  recommended: "Recommended",
  awaiting_receipt: "Payment needed",
  pending_verification: "Receipt under review",
  receipt_rejected: "New receipt needed",
  paid: "Ready to apply",
};

export function packageStatus(state: string | null, status: string) {
  return status === "Starting" && state ? packageLabels[state] || status : status;
}
