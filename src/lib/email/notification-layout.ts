export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function escapedLines(value: string) {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

export function notificationEmailHtml({
  title, summary, greeting, details, action, siteUrl, meetingUrl,
}: {
  title: string;
  summary: string;
  greeting: string;
  details: [label: string, value: string][];
  action: { label: string; url: string };
  siteUrl: string;
  meetingUrl: string;
}) {
  const detailsBlock = details.length
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0 0"><tr><td class="details" style="background:#f2f5f9;border-radius:10px;padding:14px 16px">
      ${details.map(([label, value], index) => `<p class="copy" style="margin:${index ? "8px" : "0"} 0 0;color:#25384f;font-size:14px;line-height:21px;overflow-wrap:anywhere"><strong>${escapeHtml(label)}</strong> &nbsp;${escapedLines(value)}</p>`).join("")}
      </td></tr></table>`
    : "";
  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme:light dark; supported-color-schemes:light dark; }
    @media (max-width:480px) {
      .outer { padding:16px 12px !important; }
      .content { padding:22px 20px !important; }
      .heading { font-size:26px !important; line-height:32px !important; }
    }
    @media (prefers-color-scheme:dark) {
      .background { background:#111827 !important; }
      .card { background:#1b2636 !important; border-color:#39495f !important; }
      .heading, .copy { color:#eff4fc !important; }
      .details { background:#27364a !important; }
      .action { background:#aecbff !important; color:#10284a !important; }
      .secondary { color:#b9d2ff !important; }
      .footer { color:#bdc9da !important; }
    }
  </style>
</head>
<body class="background" style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" class="background" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f5f7">
    <tr><td align="center" class="outer" style="padding:32px 18px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px">
        <tr><td class="card content" style="background:#ffffff;border:1px solid #dce2ea;border-top:4px solid #b88a35;border-radius:14px;padding:28px 32px 32px">
          <img src="${escapeHtml(new URL("/brand/email-logo.png", siteUrl).href)}" alt="International Scholarship Gateway" width="204" height="60" style="display:block;width:204px;max-width:100%;height:auto;border:0;border-radius:6px">
          <h1 class="heading" style="margin:22px 0 14px;color:#0d2c62;font-size:30px;line-height:36px;letter-spacing:-0.5px">${escapeHtml(title)}</h1>
          ${greeting ? `<p class="copy" style="margin:0 0 8px;color:#25384f;font-size:16px;line-height:24px">${escapeHtml(greeting)}</p>` : ""}
          <p class="copy" style="margin:0;color:#25384f;font-size:16px;line-height:24px">${escapedLines(summary)}</p>
          ${detailsBlock}
          <p style="margin:22px 0 0"><a class="action" href="${escapeHtml(action.url)}" style="display:inline-block;border-radius:8px;padding:13px 18px;background:#0d2c62;color:#ffffff;font-size:15px;line-height:20px;font-weight:bold;text-decoration:none">${escapeHtml(action.label)}</a></p>
          ${meetingUrl ? `<p style="margin:14px 0 0"><a class="secondary" href="${escapeHtml(meetingUrl)}" style="color:#17447e;font-size:15px;line-height:22px">Join consultation</a></p>` : ""}
        </td></tr>
        <tr><td align="center" class="footer" style="padding:16px 12px 0;color:#52637a;font-size:12px;line-height:18px">International Scholarship Gateway</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
