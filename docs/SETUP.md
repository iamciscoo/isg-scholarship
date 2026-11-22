## Registration update

For active advisor enquiries, unread admin alerts, WebP images and ngrok testing, see [Advisor preview update](ADVISOR-PREVIEW-UPDATE.md).

For the new payment, meeting, full-form, application and opportunity workflows, use [Applicant operations setup](APPLICANT-OPERATIONS.md). This includes the private scanner overlay and the remaining provider/launch configuration.

Email confirmation is disabled in the connected Supabase project at the owner's explicit request. Registration accepts email, password and confirmation, then starts a normal authenticated session. Configure the same Sign In / Providers setting for a new Supabase project. Password recovery continues to use emailed recovery links. Never match unverified email addresses to legacy consultation records: new submissions are attached atomically to authenticated account IDs.

# Setup and launch

The main administrator signs in using their existing Supabase Auth email and password. Authenticated identity, active status and database roles protect staff data. Administrators manage roles at /admin/settings, with audited changes and last-administrator protection. The official support and notification inbox is `support@isgscholarship.org`.

Start consultation requires a registered account. /eligibility redirects to /consultation. The API checks the authenticated session and matching account email.

## Local integrations

The existing .env.local was preserved. Additional credentials are in ignored files. Run:

```powershell
docker compose --env-file .env.local -f compose.yaml -f compose.integrations.yaml up --build -d
```

The overlay reads .env.integrations.local, .env.green-api.local and .env.sender-testing.local. Recreate these through a secret manager for another environment: RESEND_API_KEY, RESEND_FROM_EMAIL, ADMIN_EMAIL_ENABLED, GREEN_API_URL, GREEN_API_INSTANCE_ID, GREEN_API_TOKEN and CRON_SECRET. Never commit credentials. The basic compose.yaml app can run without the optional files.

For production email, verify `isgscholarship.org` in Resend, set `RESEND_FROM_EMAIL="ISG <support@isgscholarship.org>"`, and enable `ADMIN_EMAIL_ENABLED`. Use the Resend dashboard to verify delivery to each test inbox after the provider accepts the message.

The existing Green API instance and configured WhatsApp group were verified with the provider's state and group lookup APIs. Use the authorized instance credential and API host from the Green API console. Keep the group ID in the database integration settings.

/admin/settings manages future admin email recipients and account roles. Alerts cover account creation, consultation receipt and lead changes. Messages contain an event notice and workspace link, without names, emails, phone numbers or academic records. The local scheduler calls /api/jobs/notifications every minute with CRON_SECRET. Hosted deployments need their own equivalent scheduler. Resend uses idempotency keys. Ambiguous or interrupted Green API requests become uncertain for manual review rather than risking duplicate messages.

## Remaining public launch setup

The basic Compose service keeps INTAKE_ENABLED=false. The optional compose.preview.yaml overlay enables authenticated consultation submissions for remote testing without overwriting environment files. Turnstile is required whenever either key is configured and fails closed on incomplete configuration; with neither key, authenticated submissions retain validation, consent and persistent rate limits. Configure Turnstile, password-recovery email, approved business/privacy information and the production HTTPS origin before broader public traffic. Supabase Auth password recovery and the admin Resend alert integration are separate services. Default Supabase development email limits are unsuitable for public launch.

Configure the Supabase site URL and callback allowlist for each environment, including /auth/callback?next=/consultation and recovery callbacks. Keep the private schema out of exposed Data API schemas. Configure proxy trust, backups and recovery procedures. No DNS or production website deployment was performed.

Migrations create empty notification recipient settings in new environments. Configure approved email addresses and a verified WhatsApp group through an authorized administrator before enabling the worker. The current hosted project was configured separately, without publishing personal recipients in source control.
