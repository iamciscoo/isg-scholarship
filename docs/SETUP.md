# Service setup and launch handoff

## Supabase

Use a separate Supabase project for production and development. The connected project currently has no applicant records. Public collection stays disabled until the business and provider setup is complete.

1. Keep the `private` schema out of exposed Data API schemas. Its functions are used internally for RLS, but its tables have no anonymous/authenticated grants.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and the server-only `SUPABASE_SERVICE_ROLE_KEY`. The last variable accepts the current `sb_secret_` key as well as an appropriate legacy service-role key. Prefer the current key format.
3. Enable email/password authentication and require email confirmation. Disable anonymous sign-in. Configure a short JWT lifetime (for example 10 minutes), refresh-token rotation and the session controls supported by your plan. Global sign-out revokes refresh sessions; already-issued access tokens can remain valid until expiration.
4. Configure the Auth site URL and allowlisted redirects for each environment. Local: `http://localhost:3002/auth/callback` and `http://localhost:3002/auth/callback?next=/reset-password`. Production must use its actual HTTPS origin. Never use wildcard production redirects.
5. Configure custom SMTP using a verified sending domain. Supabase owns verification/recovery email; the application Resend outbox handles assessment and staff alert messages. The default development mail restrictions are not suitable for public launch.
6. Enable TOTP MFA for staff. Both server checks and database policies require AAL2 for administrator/advisor access. Test enrollment, sign-out, next sign-in, challenge and recovery procedures before launch.
7. Configure Cloudflare Turnstile as the Supabase Auth CAPTCHA provider. Auth calls pass the CAPTCHA token to Supabase for one-time verification. Do not also consume that same token separately in the application. The guest intake validates its own Turnstile tokens server-side.

The application never lets registration metadata set a staff role. Choose a real staff account, verify its email, then promote it through a trusted SQL administrator. Replace the placeholder only after checking the user UUID belongs to the intended person:

```sql
begin;
update public.user_roles set role = 'admin'
where user_id = 'REPLACE_WITH_VERIFIED_STAFF_UUID';
insert into public.audit_logs(actor_id, action, entity_id, metadata)
values (null, 'staff.role_assigned', 'REPLACE_WITH_VERIFIED_STAFF_UUID', '{"role":"admin","source":"trusted bootstrap"}');
commit;
```

Use `advisor` for an advisor account and record the same change accurately in the audit event. No staff roles were granted automatically. Suspensions use `profiles.status='suspended'` and must be audit logged by the trusted administrator until the later staff-management module exists.

## Turnstile and intake

Create an approved Turnstile site for the actual domains. Configure `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and server-only `TURNSTILE_SECRET_KEY`. Do not put test or always-pass keys into production. The backend verifies success, hostname and action (`assessment` or `contact`). Auth uses action `auth`, with verification performed by Supabase.

Generate a random `RATE_LIMIT_SECRET` (32 bytes or more). The shared PostgreSQL limiter stores a hashed network identity, not a raw IP. Leave `TRUST_PROXY=false` until the deployment's trusted proxy is configured to replace untrusted forwarded headers. Without a trusted proxy, a conservative shared direct-client bucket is used. Tune limits with production traffic evidence.

Approve privacy/controller information, retention periods and transfer arrangements; confirm the adult-only self-service entry policy and the alternative guardian-assisted process. Confirm service descriptions, contact details, prices and service terms. Only then set `INTAKE_ENABLED=true` and rebuild/redeploy as needed. Do not collect passports, transcripts or detailed financial information through Phase 1 forms.

## Resend and worker

Verify the sending domain and configure `RESEND_API_KEY`, `RESEND_FROM_EMAIL` and approved `ISG_TEAM_EMAIL`. Configure Supabase's SMTP separately. No emails are sent merely by rendering a page.

Set a random server-only `CRON_SECRET`. Schedule an HTTPS GET to `/api/jobs/notifications` with `Authorization: Bearer <CRON_SECRET>` every minute using your hosting scheduler or a secure external scheduler. Never put the secret in a query string, Git-tracked file or browser code.

The worker leases up to 10 pending messages, uses the outbox UUID as the Resend idempotency key, and retries up to five times with backoff. A provider acceptance is recorded as `sent`; this does not prove inbox delivery. Provider delivery/bounce webhooks and WhatsApp are later-phase work. Monitor failed rows through admin delivery counts and a trusted database operator. Exhausted crashed leases become failed for review. Avoid manually replaying provider-accepted messages after the provider's idempotency retention window.

## Production deployment

Vercel: import the private GitHub repository, configure the real environment values, choose the appropriate region and deploy only after the readiness checklist. Public values require a rebuild. Docker: build with the public variables as build arguments; inject server secrets at runtime using the environment file or your secret manager. The Docker build context excludes `.env*` files. The final image runs as UID 1001 and exposes only the application.

Readiness:

- Verify assessment storage, confirmation delivery, team alert and authorized review on a separate integration project.
- Test two applicants, two advisors, MFA and suspended accounts; verify the actual hosted RLS behavior with real sessions.
- Test recovery links on another device and decide whether to support token-hash email confirmation templates for cross-device flows. The current PKCE callback requires the browser that started the flow.
- Confirm domain/canonical origin, HTTPS, Turnstile hostnames, SMTP, provider limits, auth redirect allowlists and worker scheduling.
- Approve business and privacy text, retention jobs, data-request procedures and transfer arrangements before enabling intake.
- Configure a backup plan appropriate to the Supabase subscription, and test restoration to an isolated project. Free-plan projects do not imply production backup coverage.
- Add monitoring with PII redaction. This release logs event codes, not applicant payloads. Sentry and optional analytics are not configured.
- Preserve the old live site and DNS until an authorized cutover, and review retired scholarship URLs and indexing.

## Rollback

For application code, redeploy the preceding Git commit or image. These initial migrations are additive; do not drop production tables as a rollback. Snapshot and review forward corrective migrations. A restore must be tested in isolation and checked for data written after the backup. Never run the disposable database tests against the hosted project.
