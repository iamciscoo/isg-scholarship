# Advisor enquiries and remote preview

About is summarized, the two homepage actions share a row on mobile/tablet, and all 15 photographic assets are now WebP. Legacy photo URLs redirect to the new files. Future avatar, receipt-image and marketing uploads decode and re-encode images as WebP. PDFs retain their document format; SVG logos/flags and the PNG Apple touch icon retain browser-compatible formats. Photo sources remain recorded in ASSETS.md.

## Enquiries and portal notifications

“Speak with an advisor” opens the contact form with Consultation selected. Contact collection is independent of consultation/payment intake. It is available when Supabase and the server key are configured unless CONTACT_ENABLED=false. Schema validation, consent, a honeypot, persistent request limits and idempotency remain. Turnstile is enforced whenever either Turnstile key is configured, failing closed if configuration is incomplete. Without Turnstile keys the rate-limited enquiry form works; configure Turnstile before broader public traffic.

Enquiries save to `/admin/enquiries`. Migration 021 sends generic events through existing email/WhatsApp queues and adds a deduplicated portal notification for each active administrator. Other account, consultation, payment and application events use the same portal delivery. Group and bell messages exclude contact contents and applicant documents. No message is reported as provider-delivered just because it was queued.

Administrators can use `/admin/inbox` or the bell. The red bubble shows the real unread count, capped visually at 99+, and disappears at zero. The bell refreshes on focus, visibility changes and every 15 seconds while visible. Marking notifications read synchronizes the counter. The full inbox shows its 20 most recent entries, with an all-unread counter and mark-all control. Applicant isolation and active-user checks remain in the database.

## ngrok and local access

The origin checks now accept the actual serving HTTP/HTTPS host instead of only the configured localhost origin. This supports changing tunnel URLs and LAN hosts. Forwarded hosts/protocols are trusted only with TRUST_PROXY=true. Unrelated cross-site mutations remain rejected; credentialed wildcard CORS is not required to visit the platform from another device. Next.js also permits the standard ngrok host patterns for development and server actions.

The existing ngrok tunnel points to localhost:3002. Use its current HTTPS URL in this optional local preview overlay:

```powershell
$env:PREVIEW_SITE_URL = 'https://YOUR-CURRENT-TUNNEL.ngrok-free.dev'
docker compose --env-file .env.local -f compose.yaml -f compose.integrations.yaml -f compose.scanning.yaml -f compose.preview.yaml up --build -d
```

This sets public links and trusted forwarding in the container without overwriting environment files. Only enable proxy trust behind an ingress that controls forwarded headers. The default Compose service remains bound to loopback; ngrok provides remote access. Supabase password-recovery redirect allowlists/SMTP and a verified Resend sender domain remain separate setup items. Consultation intake remains disabled.

## Verification

69 unit tests, 41 isolated production-browser checks, all 21 migrations and adversarial database suites, typecheck, lint and Docker production build passed. Six focused Docker browser checks passed, followed by four final advisor/photo checks. Dependency audit reports zero vulnerabilities. Live ngrok inspection confirmed an enabled enquiry button, Consultation selection, no old setup notice and WebP images. An empty validation request through ngrok returned 422, while a foreign-origin request returned 403: neither created records. The real enquiry RPC and admin inbox/read-state are tested on disposable PostgreSQL. No synthetic enquiry, account, payment, notification or provider outcome was inserted into the hosted project.

Hosted migration 021 and its trigger/grants/WebP setting were verified. The portal is ready for genuine activity; empty live notification counts are intentional. No new end-to-end provider delivery is claimed. The public production domain and DNS were not changed. Migration/rollback details are in APPLICANT-OPERATIONS-MIGRATIONS.md; previous GitHub Actions account billing restrictions are recorded in DELIVERY-2026-11-19.md.
