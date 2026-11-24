import { notificationEmailHtml } from "./notification-layout";

export type NotificationDetails = {
  firstName?: string;
  applicantName?: string;
  registeredEmail?: string;
  reference?: string;
  status?: string;
  nextStep?: string;
  studyField?: string;
  destination?: string;
  documentName?: string;
  applicationName?: string;
  startsAt?: string;
  meetUrl?: string;
  path?: string;
};

const consultation = "/dashboard/consultations";
const application = "/dashboard/application";
const packages = "/dashboard/applications";
const eventCopy: Record<string, [string, string, string]> = {
  account_notification_published: [
    "New account message",
    "Sign in to your ISG account and open Notifications to read your new message.",
    "/dashboard",
  ],
  consultation_stage_update: [
    "Consultation status updated",
    "Open Consultations to see the latest status and any next steps.",
    consultation,
  ],
  meeting_scheduled: ["Consultation scheduled", "Your advisor scheduled your consultation.", consultation],
  meeting_completed: ["Consultation completed", "Open your application to see the next step.", application],
  meeting_cancelled: [
    "Consultation cancelled",
    "You can request another meeting in Consultations.",
    consultation,
  ],
  meeting_requested: ["Consultation meeting requested", "Your advisor will confirm a time.", consultation],
  whatsapp_call_requested: [
    "WhatsApp consultation requested",
    "Open Consultations to see the call request.",
    consultation,
  ],
  whatsapp_call_cancelled: [
    "WhatsApp consultation request cancelled",
    "Open Consultations if you need to arrange another call.",
    consultation,
  ],
  consultation_reply: ["Advisor reply", "Your advisor replied to your consultation question.", consultation],
  advisor_assigned: ["Advisor assigned", "ISG will contact you on WhatsApp.", consultation],
  application_unlocked: [
    "Application ready to complete",
    "You can now complete your scholarship application and upload your documents.",
    application,
  ],
  full_application_submitted: [
    "Scholarship application received",
    "ISG received your application for review.",
    application,
  ],
  full_application_review: [
    "Scholarship application update",
    "Your advisor updated your application.",
    application,
  ],
  full_application_information: [
    "More application information needed",
    "Your advisor needs information from you to continue.",
    application,
  ],
  package_recommended: [
    "Scholarship package assigned",
    "Open Applications for the package fee and receipt upload.",
    packages,
  ],
  package_payment_update: [
    "Scholarship package receipt reviewed",
    "Open Applications to see the payment details.",
    packages,
  ],
  document_request: [
    "Application document requested",
    "Review the requested document and any instructions.",
    application,
  ],
  document_update: [
    "Application document reviewed",
    "Open the application to see the document review.",
    application,
  ],
  application_update: [
    "Application progress update",
    "Your advisor updated your application's progress.",
    packages,
  ],
  opportunity_proposed: [
    "Scholarship package shared",
    "Open Applications to review the details and fees.",
    packages,
  ],
  package_accepted: [
    "Scholarship package quote accepted",
    "Your quote and consultation credit are recorded in Applications.",
    packages,
  ],
};

function receiptCopy(status?: string): [string, string, string] {
  if (status === "Verified")
    return ["Consultation receipt approved", "ISG will contact you on WhatsApp.", consultation];
  if (status === "Rejected")
    return [
      "New consultation receipt needed",
      "Open Consultations to read the feedback and upload a replacement receipt.",
      consultation,
    ];
  if (status === "Pending verification")
    return ["Consultation receipt received", "Your receipt is with the ISG team for review.", consultation];
  return ["Consultation payment update", "Open Consultations for the latest payment details.", consultation];
}

function applicationReceiptCopy(status?: string): [string, string, string] {
  if (status === "Verified")
    return ["Application receipt approved", "Your package payment was verified. Open Applications for the next step.", packages];
  if (status === "Rejected")
    return ["New application receipt needed", "Open the application to read the feedback and upload a replacement receipt.", packages];
  return eventCopy.package_payment_update;
}

function workspacePath(value: string | undefined, fallback: string) {
  return value &&
    /^\/dashboard(?:\/(?:consultations|application|applications(?:\/[0-9a-f-]{36})?))?$/.test(value)
    ? value
    : fallback;
}

function meetingLink(value?: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch {
    return "";
  }
}

export function notificationTemplate(event: string, payload: NotificationDetails, siteUrl: string) {
  const assessment = event === "assessment_received";
  const staff = event === "team_assessment" || event === "team_enquiry";
  const [title, summary, fallback] = assessment
    ? [
        "Consultation received",
        "Your consultation has been received. Open Consultations for payment instructions and to upload your receipt. This confirmation is not a scholarship eligibility decision or a guarantee of funding.",
        consultation,
      ]
    : staff
      ? ["New ISG enquiry", "Open the staff workspace to review the record.", "/admin"]
      : event === "payment_update"
        ? receiptCopy(payload.status)
        : event === "package_payment_update"
          ? applicationReceiptCopy(payload.status)
          : eventCopy[event] || ["Workspace update", "Open your ISG workspace for details.", "/dashboard"];
  const path = staff ? fallback : workspacePath(payload.path, fallback);
  const opensDocuments = path === application && (event === "document_request" || event === "document_update");
  const url = new URL(path + (opensDocuments ? "#application-documents" : ""), siteUrl).href;
  const name = payload.firstName || payload.applicantName || "there";
  const meet = event === "meeting_scheduled" ? meetingLink(payload.meetUrl) : "";
  const time =
    payload.startsAt && !Number.isNaN(Date.parse(payload.startsAt))
      ? new Date(payload.startsAt).toISOString().replace("T", " ").slice(0, 16) + " UTC"
      : "";
  const greeting = staff ? "" : `Hello ${name},`;
  const fields: [string, string | undefined | false][] = [
    ["Reference", payload.reference],
    ["Status", !staff && payload.status],
    ["Document", !staff && payload.documentName],
    ["Application", !staff && payload.applicationName],
    ["Next step", !staff && payload.nextStep],
    ["Time", event === "meeting_scheduled" && time],
  ];
  const details = fields.filter((entry): entry is [string, string] => Boolean(entry[1]));
  const label = staff ? "Open staff workspace" : opensDocuments ? "Open application documents" : "Open your ISG workspace";
  return {
    subject: assessment && payload.reference ? `ISG ${title} · ${payload.reference}` : `ISG ${title}`,
    text: [
      greeting,
      summary,
      ...details.map(([key, value]) => `${key}: ${value}`),
      meet && `Join consultation: ${meet}`,
      `${label}: ${url}`,
      "International Scholarship Gateway",
    ]
      .filter(Boolean)
      .join("\n"),
    html: notificationEmailHtml({
      title, summary, greeting, details, action: { label, url }, siteUrl, meetingUrl: meet,
    }),
  };
}
