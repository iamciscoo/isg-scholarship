export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function escapedLines(value: string) {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

const NAVY = "#0d2c62";
const GOLD = "#b88a35";
const INK = "#1f3145";
const MUTED = "#5b6b80";
const LINE = "#e3e8f0";
const SURFACE = "#f6f8fb";

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
  const site = new URL(siteUrl);
  const brand = escapeHtml(site.host.replace(/^www\./, ""));
  const logo = escapeHtml(new URL("/brand/email-logo.png", siteUrl).href);
  const detailsBlock = details.length
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border:1px solid ${LINE};border-radius:12px;background:${SURFACE};margin:0 0 26px">
        ${details
          .map(
            ([label, value], index) => `<tr>
          <td style="padding:${index ? "12px" : "16px"} 18px ${index === details.length - 1 ? "16px" : "12px"};${index ? `border-top:1px solid ${LINE};` : ""}font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
            <div style="font-size:11px;line-height:16px;letter-spacing:1.1px;text-transform:uppercase;color:${MUTED};font-weight:700">${escapeHtml(label)}</div>
            <div style="margin-top:4px;font-size:15px;line-height:23px;color:${INK};overflow-wrap:anywhere">${escapedLines(value)}</div>
          </td>
        </tr>`,
          )
          .join("")}
      </table>`
    : "";
  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme:light dark; supported-color-schemes:light dark; }
    body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
    a { text-decoration:none; }
    @media (max-width:520px) {
      .outer { padding:18px 12px !important; }
      .content { padding:26px 22px 30px !important; }
      .heading { font-size:24px !important; line-height:31px !important; }
      .button-cell a { display:block !important; text-align:center !important; }
      .brand-host { display:none !important; }
    }
    @media (prefers-color-scheme:dark) {
      .background { background:#0f1620 !important; }
      .card { background:#182231 !important; border-color:#2c3a4d !important; }
      .heading, .copy { color:#eef3fa !important; }
      .details-label { color:#c2a05a !important; }
      .action { background:#a8c6ff !important; color:#0d2143 !important; }
      .secondary { color:#a8c6ff !important; }
      .footer, .footer a { color:#9fb0c6 !important; }
    }
  </style>
</head>
<body class="background" style="margin:0;padding:0;background:#eef1f6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <div style="display:none;font-size:1px;color:#eef1f6;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${escapeHtml(summary)}</div>
  <table role="presentation" class="background" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eef1f6">
    <tr>
      <td align="center" class="outer" style="padding:36px 16px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px">
          <tr>
            <td class="card" style="background:#ffffff;border:1px solid ${LINE};border-radius:16px;overflow:hidden">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background:${NAVY};padding:20px 28px;border-bottom:3px solid ${GOLD}">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="left">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="background:#ffffff;border-radius:10px;padding:7px 12px">
                                <img src="${logo}" alt="International Scholarship Gateway" width="168" height="49" style="display:block;width:168px;max-width:100%;height:auto">
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td class="brand-host" align="right" style="font-size:11px;line-height:16px;letter-spacing:1.4px;text-transform:uppercase;color:#c9d7ee;font-weight:700;white-space:nowrap">
                          ${brand}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="content" style="padding:32px 32px 34px">
                    <p class="details-label" style="margin:0 0 10px;font-size:11px;line-height:16px;letter-spacing:1.4px;text-transform:uppercase;color:${GOLD};font-weight:700">ISG account update</p>
                    <h1 class="heading" style="margin:0 0 16px;color:${NAVY};font-size:27px;line-height:34px;letter-spacing:-0.4px;font-weight:700">${escapeHtml(title)}</h1>
                    ${greeting ? `<p class="copy" style="margin:0 0 10px;color:${INK};font-size:16px;line-height:25px">${escapeHtml(greeting)}</p>` : ""}
                    <p class="copy" style="margin:0 0 24px;color:${MUTED};font-size:16px;line-height:26px">${escapedLines(summary)}</p>
                    ${detailsBlock}
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px">
                      <tr>
                        <td class="button-cell" align="center" bgcolor="${NAVY}" style="border-radius:10px;background:${NAVY}">
                          <a class="action" href="${escapeHtml(action.url)}" style="display:inline-block;padding:15px 26px;background:${NAVY};color:#ffffff;font-size:15px;line-height:20px;font-weight:700;letter-spacing:0.2px;border-radius:10px">${escapeHtml(action.label)}</a>
                        </td>
                      </tr>
                    </table>
                    ${
                      meetingUrl
                        ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px">
                            <tr>
                              <td style="border:1px solid ${LINE};border-radius:10px">
                                <a class="secondary" href="${escapeHtml(meetingUrl)}" style="display:inline-block;padding:12px 22px;color:${NAVY};font-size:14px;line-height:20px;font-weight:700">Join consultation</a>
                              </td>
                            </tr>
                          </table>`
                        : ""
                    }
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:26px;border-top:1px solid ${LINE}">
                      <tr>
                        <td style="padding-top:16px;font-size:12px;line-height:19px;color:${MUTED}">
                          This is an automated message about your International Scholarship Gateway account. Open your workspace for the full record.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="footer" align="center" style="padding:20px 8px 0;font-size:12px;line-height:20px;color:${MUTED}">
              <strong style="color:${NAVY};font-weight:700">International Scholarship Gateway</strong><br>
              <a class="footer" href="${escapeHtml(site.href)}" style="color:${MUTED}">${brand}</a>
              &nbsp;·&nbsp;
              <a class="footer" href="mailto:support@isgscholarship.org" style="color:${MUTED}">support@isgscholarship.org</a>
              &nbsp;·&nbsp;
              <a class="footer" href="https://wa.me/79282120121" style="color:${MUTED}">WhatsApp</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
