# Delivery checklist

- [x] Public site and brand integration; responsive navigation and public links verified.
- [x] Guest intake implemented; assessment/lead/consent/outbox transaction and idempotency verified on PostgreSQL.
- [x] Auth and applicant foundation implemented; identity/ownership policies verified at the database boundary.
- [x] Staff MFA gate and scoped lead management implemented; permission denial tests passed.
- [x] Notification queue, retries, leases, deduplication and exhausted-worker recovery implemented and tested.
- [x] Unit, browser, database permission checks, typecheck, lint, production build and dependency audit passed.
- [x] Docker image built; non-root runtime, health, HTTP responses, private redirects and secret isolation verified.
- [x] Setup, current limits, roadmap, rollback and GitHub handoff documented.

Owner setup remains separate: Turnstile, Supabase Auth SMTP, Resend, staff identity/role bootstrap, final configured end-to-end acceptance, approved policies/business details and retention operations. Intake remains disabled until these are ready. Document uploads, research, applications and billing are subsequent phases from the supplied brief.
