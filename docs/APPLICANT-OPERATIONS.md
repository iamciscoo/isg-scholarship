# Applicant operations update

Implemented on the existing Next.js/Supabase platform, 18–19 November 2026. This supersedes the earlier roadmap's descriptions of consultation, documents, research and application tracking as future-only features. The existing public domain has not been redeployed.

## Applicant journey

1. Register, then complete the short consultation: contact details, education stage, study interests, broad destinations/timing and general questions. Passports, certificates, transcripts and guardian details are deferred. Known contact fields continue to sync with the profile.
2. The consultation workspace shows the one-time **TZS 50,000** fee, privately managed CRDB instructions and receipt upload. Uploaded receipts remain **Pending verification** until an administrator matches funds received. Rejected claims can be corrected; verified accounts cannot be charged another consultation fee through this workflow.
3. Verified payment unlocks follow-up questions and additional meeting requests without another consultation charge. Availability still requires confirmation. Advisors schedule real Google Meet links with dates, duration and a recorded time zone. Overlapping ISG bookings are rejected. Email is queued and the link appears in the workspace; meeting/request/message history is retained and paginated.
4. A completed consultation unlocks the full application details and document requests. Contact and study information is prefilled; drafts can be saved. The later form follows the supplied Word reference, including education institution, address and guardian/nominated contact. Guardian DOB is optional and only needed if specifically requested. Permission to share the contact's information is recorded.
5. Submitting with the declaration records its version, acceptance time, immutable answer snapshot and hash. The current acceptance is tracked explicitly: A → B → A produces the correct latest copy; consecutive identical retries do not duplicate acceptance or alerts. Applicants and authorized staff can download its PDF. Validation errors preserve entered answers and checkboxes.
6. Advisors propose actual private opportunities. Applicants see the provider, requirements, deadlines and known provider fees before approving each independent application. Approval is tied to the disclosed proposal and accepted form copy. Required documents must be approved before the Applying stage.
7. Each application has Starting, Applying, Waiting for decision, Accepted, Rejected, Cancelled and Completed workflow states. Official provider decisions, evidence/date, next steps and dated history remain separate. Only the applicant confirms commitment to an accepted place. Closing other workflows is an explicit choice and does not pretend to withdraw from external providers automatically.

## Staff controls

| Page                                                  | Purpose                                                                                            |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `/admin/settings`                                     | Payment instructions, notification recipients and account roles                                    |
| `/admin/payments`                                     | Paginated pending/all receipt claims and audited manual verification                               |
| `/admin/receipts/[id]`                                | Administrator-only receipt review linked from staff alerts                                         |
| `/admin/consultations`                                | Existing lead inbox, assignments and access to case support                                        |
| `/admin/cases/[user_id]` / `/advisor/cases/[user_id]` | Authorized meetings, follow-ups, declarations, documents and new proposals                         |
| `/admin/declarations/[id]`                            | Immutable submitted form and private PDF review                                                    |
| `/admin/applications` / `/advisor/applications`       | Scoped application tracking and history                                                            |
| `/admin/opportunities`                                | Private named catalogue, source, deadline, requirements, fees, image and staff-only research notes |
| `/admin/promotions`                                   | Separately authored broad public destinations, levels, fields, funding types and eligibility       |
| `/admin/packages`                                     | ISG package scope/prices and explicit public visibility                                            |

No example students, opportunities, fees, payments or outcomes are seeded in development or production. Administrators must enter approved research, package scope and prices. Public programme-area guides are educational content, not a scholarship inventory. University Life is merged into Study Paths; legacy links redirect there. Home degree cards select the relevant level filter. Approved Pexels/campus photos retain their existing provenance in ASSETS.md.

## Fees and notifications

One consultation entitlement exists per account. A verified TZS 50,000 payment can be allocated once to an ISG service-package quote. Package prices include that fee and are at least TZS 50,000. The displayed quote version is checked under a database lock before acceptance: stale prices or scope are rejected. Accepted name, scope, gross fee, credit and balance are immutable. Accepting a quote does **not** mark its remaining balance paid. Provider/university charges are disclosed separately in the private opportunity proposal.

The existing durable Resend and GREEN-API workers handle the new events. Applicant emails include actual scheduled Meet links; document updates link to the application form. Staff alerts carry generic notices and authenticated workspace links. Raw receipts and applicant documents are **not** posted to the group. Receipt media sharing is not enabled; the implemented privacy-preserving fallback is an administrator-only receipt link, without public signed URLs. Each distinct form acceptance has its own alert identity; retries remain deduplicated.

## Private files and Docker

The `case-files` bucket is private. Browsers have no direct object upload/download policy. The authenticated server checks ownership/assignment and current account status, bounds uploads, verifies content and registers metadata. Images are decoded and re-encoded; PDF files require a successful ClamAV result and fail closed if scanning is unavailable. Downloads require metadata RLS on every request and use attachment/no-store/nosniff headers. Applicants cannot approve receipts or mutate file review/declaration/payment records directly.

Run the configured preview, integrations and private scanner:

```powershell
docker compose --env-file .env.local -f compose.yaml -f compose.integrations.yaml -f compose.scanning.yaml up --build -d
```

The pinned official scanner image runs as `clamav`, has no published host port and persists signature updates in a named volume. Allocate approximately 4 GiB for it. `CLAMAV_HOST=scanner` and port 3310 come from the overlay; no existing environment file was overwritten. The basic image-upload flow can run without that overlay, but raw PDF uploads then remain unavailable. The real scanner successfully checked the generated test PDF. These controls are not a promise that any malware scanner detects every threat.

## Verification and migration record

All 19 migrations ran successfully against disposable PostgreSQL, including adversarial ownership, receipt approval, draft/unlock, booking overlap, declaration compatibility/history, private catalogue isolation, independent outcomes and stale-price/single-credit checks. Hosted migrations 014–019 were applied after review. Supabase MCP assigns timestamps automatically; its migration history entries were aligned to the exact reviewed repository versions after a same-second metadata collision rolled back one attempt. History was verified before continuing; no business records were fabricated or replaced.

Independent payment, meeting/form and application/catalogue reviews passed after fixing pagination, native action resets, A→B→A acceptance selection, alert deduplication, stale quotes and degree links. The PDF was extracted and both pages visually inspected. Unit, type/lint, browser, Docker and hosted checks are recorded in VERIFICATION.md. Supabase's advisor reports intentionally protected private tables without browser policies and deliberately authenticated security-definer RPCs; these use explicit role/ownership guards and empty search paths. The existing leaked-password-protection setting remains a launch review item.

## Required owner setup and limits

- Public intake remains disabled pending Turnstile, final service/privacy/retention arrangements and the production HTTPS origin. No `.env` file was overwritten to enable it.
- Resend's test sender currently permits only the approved account-owner recipient. Verify the sender domain to deliver student emails. Supabase recovery-email delivery is a separate configuration.
- Google Meet scheduling uses advisor-created links. Automatic Google Calendar creation/invitation/free-busy integration is not implemented or simulated.
- Enter real private opportunities, broad promotions and package scope/prices through the admin pages. No price or scholarship inventory was invented.
- Physical bank settlement, real applicant receipt approval, live provider submissions and actual admission decisions were not simulated or tested against production. Automated workflow tests use disposable fixtures; private browser QA used the existing administrator without saving fabricated applicant data.
- The current configured scanner and notification worker run locally. A deployment needs equivalent private scanner connectivity, scheduling, secrets, backups and monitoring. Domain/DNS/public-site deployment is separate.

Practical next improvements: approve refund/retention procedures; configure authenticated provider email delivery; optionally connect Google Calendar for real availability and invitations; add staff-reviewed receipt redaction before considering group media attachments. See APPLICANT-OPERATIONS-MIGRATIONS.md for recovery planning.
