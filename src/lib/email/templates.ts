export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
export function notificationTemplate(
  event: string,
  payload: { firstName?: string; reference: string; meetUrl?: string; startsAt?: string },
  siteUrl: string,
) {
  const updates: Record<string, string> = {
    payment_update:
      "Your consultation payment status has changed. Open your workspace for its verification status.",
    meeting_scheduled: "Your advisor has scheduled a Google Meet consultation.",
    meeting_completed: "Your consultation is complete and your full application form is unlocked.",
    meeting_cancelled:
      "A consultation meeting has been cancelled. You can request another meeting without paying the consultation fee again.",
    consultation_reply: "Your ISG advisor replied to your consultation question.",
    document_request: "Your advisor has updated your document requests.",
    document_update: "A document review is available in your workspace.",
    application_update: "Your application has a new update.",
    opportunity_proposed:
      "Your advisor shared a scholarship package. Open Applications in your workspace to review its details and fees.",
    package_accepted:
      "Your ISG service-package quote and consultation credit are recorded in your workspace.",
  };
  if (updates[event]) {
    const meet =
      event === "meeting_scheduled" &&
      /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(payload.meetUrl || "")
        ? payload.meetUrl!
        : "";
    const start =
      payload.startsAt && !Number.isNaN(Date.parse(payload.startsAt))
        ? new Date(payload.startsAt).toISOString()
        : "";
    const url =
      siteUrl +
      (event === "document_request" || event === "document_update"
        ? "/dashboard/application"
        : event === "opportunity_proposed" || event === "application_update" || event === "package_accepted"
          ? "/dashboard/applications"
          : "/dashboard/consultations");
    const text = `${updates[event]}${meet ? `\nTime (UTC): ${start}\nGoogle Meet: ${meet}` : ""}\nYour private workspace: ${url}\nInternational Scholarship Gateway`;
    return {
      subject:
        event === "meeting_scheduled" ? "Your ISG Google Meet consultation" : "Your ISG workspace update",
      text,
      html: `<html><body style="font-family:Arial,sans-serif;color:#0d2c62"><h1>Your ISG update</h1><p>${escapeHtml(updates[event])}</p>${meet ? `<p>Time (UTC): ${escapeHtml(start)}</p><p><a href="${escapeHtml(meet)}">Join Google Meet</a></p>` : ""}<p><a href="${escapeHtml(url)}">Open your private workspace</a></p></body></html>`,
    };
  }
  const reference = escapeHtml(payload.reference);
  const name = escapeHtml(payload.firstName || "there");
  const url = escapeHtml(siteUrl);
  const applicant = event === "assessment_received";
  const subject = applicant
    ? `Your ISG assessment: ${payload.reference}`
    : event === "team_enquiry"
      ? "New ISG contact enquiry"
      : `New ISG assessment: ${payload.reference}`;
  const heading = applicant ? `A good first step, ${name}.` : "A new enquiry needs your review.";
  const body = applicant
    ? "Your initial assessment has been received securely. An ISG advisor will review it and contact you about next steps. This confirmation is not a scholarship eligibility decision or a guarantee of funding."
    : "Open the private staff workspace to review the record. Applicant information is available only after authorized sign-in.";
  const text = `${applicant ? `Hello ${payload.firstName || "there"}.` : "New ISG enquiry."}\n${body}\nReference: ${payload.reference}\n${siteUrl}${applicant ? "/login" : "/admin"}\nInternational Scholarship Gateway`;
  const html = `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f6f5f0;font-family:Arial,sans-serif;color:#172b46"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 16px"><table role="presentation" width="100%" style="max-width:560px;margin:auto;background:#fff;border-radius:12px"><tr><td style="padding:36px"><p style="color:#0d2c62;font-size:14px">INTERNATIONAL SCHOLARSHIP GATEWAY</p><h1 style="font-size:26px;color:#0d2c62">${heading}</h1><p style="font-size:15px;line-height:1.8">${body}</p><p style="background:#f6f5f0;padding:16px">Reference: <strong>${reference}</strong></p><p><a style="display:inline-block;padding:14px 20px;background:#0d2c62;color:#fff;border-radius:8px;text-decoration:none" href="${url}${applicant ? "/login" : "/admin"}">${applicant ? "Visit your ISG account" : "Open staff workspace"}</a></p><p style="font-size:12px;color:#566274;line-height:1.8">This is a service message about your enquiry. No sensitive documents should be sent by reply. Scholarship, admission and visa decisions are made by the relevant institutions.</p></td></tr></table></td></tr></table></body></html>`;
  return { subject, html, text };
}
