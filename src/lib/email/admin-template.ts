import type { NotificationDetails } from "./templates";

const titles: Record<string, string> = {
  "account.verified": "Account verified",
  "account.created": "New student account",
  "enquiry.received": "New advisor enquiry",
  "consultation.received": "Consultation submitted",
  "consultation.support_received": "Consultation supporting file received",
  "lead.updated": "Consultation updated",
  "payment.receipt_received": "Payment receipt to review",
  "payment.reviewed": "Payment receipt reviewed",
  "meeting.requested": "Consultation meeting requested",
  "meeting.scheduled": "Consultation meeting scheduled",
  "meeting.completed": "Consultation meeting completed",
  "whatsapp_call.requested": "WhatsApp consultation requested",
  "whatsapp_call.cancelled": "WhatsApp consultation request cancelled",
  "consultation.follow_up": "Consultation follow-up",
  "application.unlocked": "Scholarship application unlocked",
  "application.form_received": "Scholarship application received",
  "application.document_received": "Application document received",
  "application.information_received": "Requested application information received",
  "application.updated": "Application progress updated",
  "application.reviewed": "Scholarship application reviewed",
  "package.accepted": "Scholarship package quote accepted",
};

function staffPath(event: string, id: string, path?: string) {
  if (event.startsWith("account.")) return /^[0-9a-f-]{36}$/i.test(id) ? `/admin/users/${id}` : "/admin/users";
  if (
    path &&
    /^\/admin\/(?:inbox|enquiries|settings|consultations|payments|applications|(?:receipts|cases|declarations|applications)\/[0-9a-f-]{36})$/.test(
      path,
    )
  )
    return path;
  if (event === "application.form_received") return `/admin/declarations/${id}`;
  if (event === "enquiry.received") return "/admin/enquiries";
  if (event === "payment.receipt_received") return `/admin/receipts/${id}`;
  if (event === "payment.reviewed") return "/admin/payments";
  if (event.startsWith("application.") || event.startsWith("package.")) return "/admin/applications";
  return "/admin/consultations";
}

export function adminAlertTemplate(event: string, id: string, details: NotificationDetails, baseUrl: string) {
  const title = event === "payment.receipt_received" && details.applicationName
    ? "Application payment receipt to review"
    : titles[event] || "ISG workspace update";
  const applicant = (details.applicantName || details.firstName)?.replace(/[\r\n\t]+/g, " ").trim();
  const text = [
    title,
    applicant && `Applicant: ${applicant}`,
    event.startsWith("account.") && details.registeredEmail && `Registered email: ${details.registeredEmail}`,
    details.reference && `Consultation reference: ${details.reference}`,
    details.status && `Status: ${details.status}`,
    details.applicationName && `Application: ${details.applicationName}`,
    details.studyField && `Study field: ${details.studyField}`,
    details.destination && `Destination: ${details.destination}`,
    details.documentName && `Document: ${details.documentName}`,
    details.startsAt && `Scheduled: ${details.startsAt}`,
    details.nextStep && `Next step: ${details.nextStep}`,
    `Open ISG: ${baseUrl}${staffPath(event, id, details.path)}`,
  ]
    .filter(Boolean)
    .join("\n");
  return { subject: `ISG · ${title}`, text };
}
