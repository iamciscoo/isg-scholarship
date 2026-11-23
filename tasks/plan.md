# Implementation plan

## November 23 dashboard improvements

Use the existing locale cookie/provider and dictionaries for explicit dashboard UI translations; preserve submitted enum values and user-authored content. Automatically resolve only identifiable automated notifications in the same workflow context, retaining history and manual announcements. Keep the ISG palette and typography, use three compact mobile summary cards, primary filters with expandable advanced fields, and applicant cards on narrow screens. Move consultation status before details. Register dirty forms with one bottom save banner that cancels or submits the selected form without bypassing native validation.

Verification: translation completeness and status tests, adversarial notification-context database checks, dirty/cancel/save/error browser behavior, responsive lists at 320/390/768/1440 and Arabic RTL, full build/lint/unit checks. Apply only the additive tested notification migration to production; retain current live applicant data.

1. Foundation and public site: install compatible dependencies, copy current brand assets, implement responsive public pages and legacy redirects. Verify types, build and desktop/mobile layout.
2. Assessment intake: implement four-step validated form, atomic lead/assessment/consent/outbox migration, Turnstile and shared rate limits. Verify invalid data, idempotency and denied direct anonymous reads.
3. Identity and accounts: verified registration, login, recovery, global sign-out, applicant profile and safe email linking. Verify no role escalation and cross-applicant denial.
4. Staff workspace: AAL2 MFA gate, admin lead filters/detail/stage/assignment and audit, advisor scope. Verify unauthorized/suspended/unassigned access denial.
5. Email delivery: leased outbox processing, branded confirmation/team templates, deduplication/retries, operational status. Verify failures remain retryable.
6. Package and handoff: Docker image/Compose, CI, setup and GitHub documentation, automated checks, local integration verification, initial Git commits.

External configuration remains an owner setup step; dependent operations must never return fabricated success. No production deployment or DNS migration is part of this local build.

## November 18 continuation: applicant operations

Reuse the existing Next/Supabase identity, leads, draft persistence, workspace and durable notification workers. Build vertical slices in the requested order: consultation/payment, meetings/full form, independent applications, private opportunities/public promotions, website polish. The owner's numbered request authorizes this sequence; no restart or environment replacement.

1. Add a single consultation account per student, fixed TZS 50,000 entitlement, admin-managed payment instructions, receipt claims and audited admin verification. One verified payment covers unlimited follow-ups and scheduling requests; credit is consumable once against a later package.
2. Store meeting history with real advisor-supplied Google Meet links, workspace messages, durable email notifications, completion/unlock, full-form drafts, document requests and declaration snapshots. No invented Meet links or automatic provider decisions.
3. Track independent applications, applicant opportunity approval, ISG workflow history and separate official decision evidence. Do not submit to external providers automatically.
4. Keep named opportunities in the private schema. Publish only separately authored broad promotion fields. Admin-managed package prices identify ISG and provider fees separately.
5. Merge university content into Study Paths, add filters and images, refresh hero and help affordance; verify responsive/a11y behavior.

Verification per slice: PostgreSQL adversarial authorization/transition tests, focused validation tests, typecheck/lint/build and real browser checks. Test identities stay in disposable databases. Document external limits honestly.

References reviewed: `C:/Users/Administrator/Downloads/ISG CONSULTATION FORM .pdf` (two pages) and `C:/Users/Administrator/Downloads/ISG_Scholarship_Application_Form.docx`. Initial consultation covers current stage, education and goals, broad destinations/language/timing and general questions. Application stage covers requested documents, contact/study interests, guardian/nominated contact, address, education institution and programme details. Guardian DOB is optional and only requested when needed. Replace handwritten signature with a versioned declaration snapshot. Fee/account details are managed privately; owner confirmed CRDB Bank in chat.

Security: raw receipts and applicant documents never go to group messages. Staff notifications use an authenticated staff receipt route, without PII or public/signed bearer links. Decode/reencode accepted images; PDF uploads require a configured malware scanner and fail closed. Serve private files as attachments with no-store, nosniff and authorization on every request.

Migration/rollback plan: see docs/APPLICANT-OPERATIONS-MIGRATIONS.md before hosted changes. Existing 13 hosted migrations and clean main a873959 verified; zero submitted consultations, two real accounts. Preserve real data and environment files. All schema changes additive except nullable legacy academic columns; backups and explicit grants/RLS required. Do not run destructive down migrations on populated tables.

November 19 completion: the requested UI continuation is implemented with persistent workspace layouts, compact auth, larger flags, mobile swipe rows, styled select enhancement and a separate public marketing gallery/homepage image setting. All 20 migrations/permission suites, 61 unit tests, 35 isolated browser checks and 15 Docker checks passed, alongside typecheck/lint/build and zero reported audit vulnerabilities. Independent review passed. Live browser file selection remains limited by extension permissions; no hosted upload success was fabricated. Final push/remote revision verification follows.

## November 23 managed programmes and five consultation stages

Preserve the 60 original public study guides in the existing study_promotions catalogue, with explicit country arrays and existing publication controls. Manage packages and programmes under one admin navigation entry; keep private package data separate from public programme fields. The homepage and study-path country list derive only from published programmes, with no hardcoded fallback. Keep New, Under review, Needs information, Completed and Closed as the five consultation choices; retain legacy enum/audit history and normalize older writes.

Use side-by-side level/field filters, a keyboard-accessible destination dropdown with flags, and remove the selected-country notice. Add delegated press feedback without delaying actions; disable motion when reduced motion is requested. Verify migration authorization/compatibility/data retention, six-language copy, mobile layout, save/cancel, create/edit/unpublish/delete and last-country disappearance in isolated production browser tests.

Hosted migration 056 must be applied before merging this feature branch into production main. Browser automation was rejected by the automatic URL approval review, so this continuation does not apply live SQL or deploy the new application. No real consultation, application, account or environment records are reset.
