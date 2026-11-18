# Implementation plan

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

References: the Consultation PDF and Scholarship Application Word file are not present among current attachments or relevant Downloads; the owner has been asked for their paths. Implement only explicitly requested field categories until the originals can be reviewed. Do not claim exact reference parity without them.

Security: raw receipts and applicant documents never go to group messages. Staff notifications use an authenticated staff receipt route, without PII or public/signed bearer links. Decode/reencode accepted images; PDF uploads require a configured malware scanner and fail closed. Serve private files as attachments with no-store, nosniff and authorization on every request.

Migration/rollback plan: see docs/APPLICANT-OPERATIONS-MIGRATIONS.md before hosted changes. Existing 13 hosted migrations and clean main a873959 verified; zero submitted consultations, two real accounts. Preserve real data and environment files. All schema changes additive except nullable legacy academic columns; backups and explicit grants/RLS required. Do not run destructive down migrations on populated tables.
