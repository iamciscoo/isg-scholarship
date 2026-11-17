export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
export function notificationTemplate(
  event: string,
  payload: { firstName?: string; reference: string },
  siteUrl: string,
) {
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
