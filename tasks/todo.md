# Delivery checklist

## November 23 dashboard improvements

- [x] Translate dashboard interface, statuses and controls in all six languages; preserve entered data.
- [x] Resolve completed/superseded automated notification contexts with safe backfill and database tests.
- [x] Compact mobile summaries, filters and applicant/user lists; consultation status first.
- [x] Dirty-form bottom banner with Cancel and Save, real validation and failure recovery.
- [x] Verify responsive/RTL/browser, unit/database/build checks; review, commit, push and verify deployment.

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

- [x] Consultation/payment schema and private upload authorization; one fee/credit per student. Test cross-user access and repeated verification/credit.
- [x] Payment instructions, applicant receipt/status UI and staff verification. Verify genuine pending/approved states without test production payments.
- [x] Follow-up questions, meeting requests/history, real Meet link scheduling and email/workspace updates. Test payment/unlock gates and assigned-advisor scope.
- [x] Full application drafts, later document/guardian fields, declaration version/time and downloadable PDF. Lock/prefill/private download verified; supplied references reviewed.
- [x] Multiple applications, applicant approval, workflow/provider decision separation and dated status history. Independent outcomes and immutable approvals verified.
- [x] Admin private opportunities/packages and broad public promotions. Anonymous data minimization and single-use consultation credit verified.
- [x] Study Paths merger, homepage, help hover/tap and responsive loading/form polish. Browser/a11y checks at 320/390/768/1024/1440.
- [x] Final independent review, database tests, Docker and docs/configuration/rollback report.
- [x] Git push and remote revision verification. Code checkpoint 5e9614d matched origin/main; GitHub Actions stopped before any steps due to the account billing lock. See docs/DELIVERY-2026-11-19.md.

## November 19 UI continuation

- [x] Larger destination flags, shorter hero copy, remove plaque line, logo feedback and home scroll behavior.
- [x] Login/register fit with accessible short-screen scrolling and compact mobile composition; no auth behavior regressions.
- [x] Fixed desktop workspace sidebar/header with content scrolling and explicit link prefetch; mobile swipe rows and tighter section spacing.
- [x] Original-site image references, thumbnail choices and safe public marketing image uploads; admin homepage image selection.
- [x] Styled progressive-enhancement select pickers and final mobile/desktop/browser/security review; complete final verification/push above.

## Managed programmes and consultation simplification — 23 November

- [x] Five clear stage options with legacy state/history compatibility.
- [x] Combined admin package/programme navigation and programme create/edit/publication/delete controls.
- [x] Preserve all 60 editorial guides and derive homepage country availability from published records.
- [x] Compact filters, flag destination dropdown, removed country notice and visible press/reduced-motion feedback.
- [x] Unit, migration/permission, production build/typecheck, lint, audit, independent review and three focused production-browser checks.
- [ ] Apply hosted migration 056, then merge the feature branch into production main. Browser URL approval review currently blocks dashboard automation.
