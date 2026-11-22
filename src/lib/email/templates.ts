export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export type NotificationDetails = {
  firstName?: string;
  applicantName?: string;
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
  advisor_assigned: [
    "Advisor assigned",
    "Open Consultations to see your advisor and request a meeting.",
    consultation,
  ],
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
    "Scholarship package recommended",
    "Open Applications to review the package.",
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
    return [
      "Consultation receipt approved",
      "Open Consultations to find your advisor and meeting options.",
      consultation,
    ];
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
        : eventCopy[event] || ["Workspace update", "Open your ISG workspace for details.", "/dashboard"];
  const url = siteUrl + (staff ? fallback : workspacePath(payload.path, fallback));
  const name = payload.firstName || payload.applicantName || "there";
  const meet = event === "meeting_scheduled" ? meetingLink(payload.meetUrl) : "";
  const time =
    payload.startsAt && !Number.isNaN(Date.parse(payload.startsAt))
      ? new Date(payload.startsAt).toISOString().replace("T", " ").slice(0, 16) + " UTC"
      : "";
  const lines = [
    staff ? "" : `Hello ${name},`,
    summary,
    payload.reference && `Reference: ${payload.reference}`,
    !staff && payload.status && `Status: ${payload.status}`,
    !staff && payload.documentName && `Document: ${payload.documentName}`,
    !staff && payload.applicationName && `Application: ${payload.applicationName}`,
    !staff && payload.nextStep && `Next step: ${payload.nextStep}`,
    event === "meeting_scheduled" && time && `Time: ${time}`,
  ].filter((line): line is string => Boolean(line));
  const label = staff ? "Open staff workspace" : "Open your ISG workspace";
  return {
    subject: assessment && payload.reference ? `ISG ${title} · ${payload.reference}` : `ISG ${title}`,
    text: [
      ...lines,
      meet && `Join consultation: ${meet}`,
      `${label}: ${url}`,
      "International Scholarship Gateway",
    ]
      .filter(Boolean)
      .join("\n"),
    html: `<!doctype html><html lang="en"><body style="background:#f6f5f0;font-family:Arial,sans-serif;color:#0d2c62;padding:24px"><main style="max-width:560px;margin:auto;background:#fff;padding:24px;border-radius:12px"><h1>${escapeHtml(title)}</h1>${lines.map((line) => `<p>${escapeHtml(line).replace(/\n/g, "<br>")}</p>`).join("")}${meet ? `<p><a href="${escapeHtml(meet)}">Join consultation</a></p>` : ""}<p><a href="${escapeHtml(url)}">${label}</a></p><p>International Scholarship Gateway</p></main></body></html>`,
  };
}
