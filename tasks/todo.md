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

## Applicant operations continuation

- [ ] Consultation/payment schema and private upload authorization; one fee/credit per student. Test cross-user access and repeated verification/credit.
- [ ] Payment instructions, applicant receipt/status UI and staff verification. Verify genuine pending/approved states without test production payments.
- [ ] Follow-up questions, meeting requests/history, real Meet link scheduling and email/workspace updates. Test payment/unlock gates and assigned-advisor scope.
- [ ] Full application drafts, later document/guardian fields, declaration version/time and downloadable PDF. Verify lock, prefill and private download access; compare reference files when supplied.
- [ ] Multiple applications, applicant approval, workflow/provider decision separation and dated status history. Test independent outcomes and immutable approvals.
- [ ] Admin private opportunities/packages and broad public promotions. Test anonymous data minimization and single-use consultation credit.
- [ ] Study Paths merger, homepage, help hover/tap and responsive loading/form polish. Browser/a11y checks at 320/390/768/1024/1440.
- [ ] Final independent review, database tests, Docker, docs/configuration/rollback report and Git push.
