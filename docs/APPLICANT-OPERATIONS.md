# Applicant operations update

The catalogue and fee sections below record the earlier rollout. [Scholarship packages](SCHOLARSHIP-PACKAGES-MIGRATION.md) now combine opportunity details and ISG fees in the applicant’s application. The consultation fee is separate for new packages.

Implemented on the existing Next.js/Supabase platform, 18–19 November 2026. This supersedes the earlier roadmap's descriptions of consultation, documents, research and application tracking as future-only features. The existing public domain has not been redeployed.

## Applicant journey

1. Register and submit the short consultation form.
2. Upload the consultation receipt. An admin approves it or requests a replacement.
3. ISG contacts the applicant directly on WhatsApp using the saved number.
4. An admin assigns a package. The applicant pays its listed fee and uploads a package receipt.
5. Package payment verification opens the application form and document uploads. The form follows the supplied Word reference.
6. The applicant submits their details and files. Admins review the submission and update one application status, with an optional note visible to the applicant.

Meeting requests, meeting scheduling, applicant package selection and package acceptance controls are retired. The database denies these earlier mutation entry points. Each applicant has one active assigned package.

After package payment is verified, authorized staff can enter application details and upload files on the applicant’s behalf from the consultation or application page. Staff submissions record the staff account and are labelled as staff records in the dashboard and PDF. They do not record an applicant electronic signature. Application fields appear before document uploads, and consultation uploads are limited to payment receipts.

## Staff controls

| Page                                                                          | Purpose                                                                                            |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `/admin/settings`                                                             | Payment instructions, notification recipients and account roles                                    |
| `/admin/payments`                                                             | Paginated pending/all receipt claims and audited manual verification                               |
| `/admin/receipts/[id]`                                                        | Administrator-only receipt review linked from staff alerts                                         |
| `/admin/consultations`                                                        | Existing lead inbox, assignments and access to case support                                        |
| `/admin/cases/[user_id]` / `/advisor/cases/[user_id]`                         | Applicant WhatsApp contact, consultation review and package assignment                             |
| `/admin/declarations/[id]`                                                    | Immutable submitted form and private PDF review                                                    |
| `/admin/cases/[user_id]/application` / `/advisor/cases/[user_id]/application` | Staff entry of applicant details and documents after package payment verification                  |
| `/admin/applications` / `/advisor/applications`                               | Scoped application tracking and history                                                            |
| `/admin/opportunities`                                                        | Private named catalogue, source, deadline, requirements, fees, image and staff-only research notes |
| `/admin/promotions`                                                           | Separately authored broad public destinations, levels, fields, funding types and eligibility       |
| `/admin/packages`                                                             | ISG package scope/prices and explicit public visibility                                            |

No example students, opportunities, fees, payments or outcomes are seeded in development or production. Administrators must enter approved research, package scope and prices. Public programme-area guides are educational content, not a scholarship inventory. University Life is merged into Study Paths; legacy links redirect there. Home degree cards select the relevant level filter. Approved Pexels/campus photos retain their existing provenance in ASSETS.md.

## Fees and notifications

One consultation entitlement exists per account. A verified TZS 50,000 payment can be allocated once to an ISG service-package quote. Package prices include that fee and are at least TZS 50,000. The displayed quote version is checked under a database lock before acceptance: stale prices or scope are rejected. Accepted name, scope, gross fee, credit and balance are immutable. Accepting a quote does **not** mark its remaining balance paid. Provider/university charges are disclosed separately in the private opportunity proposal.

The existing durable Resend and GREEN-API workers handle the new events. Applicant emails include actual scheduled Meet links; document updates link to the application form. Staff alerts carry generic notices and authenticated workspace links. Raw receipts and applicant documents are **not** posted to the group. Receipt media sharing is not enabled; the implemented privacy-preserving fallback is an administrator-only receipt link, without public signed URLs. Each distinct form acceptance has its own alert identity; retries remain deduplicated.

## Private files and Docker

The `case-files` bucket is private. Browsers have no direct object upload or download policy. The authenticated server checks ownership and current account status, verifies content, and registers receipt, consultation support and application document metadata. The upload limit is 4 MB per file to fit Vercel's request limit. The browser sends selected files individually and retries failed files separately. Images are decoded and re-encoded. PDF downloads require metadata RLS and use attachment, no-store and nosniff headers. Applicants cannot approve receipts or directly change document reviews, declarations or payment records.

With ClamAV configured, a passing scan preserves the original PDF, including any digital signature. Without ClamAV, the service renders up to 20 pages and saves a new image-only PDF for review. This keeps the visible pages and drops interactive elements, embedded files, searchable text and cryptographic signatures. Applicants should keep any digitally signed original. A malformed, unreadable or oversized PDF is rejected with instructions to retry or split the file.

Run the configured preview, integrations and private scanner:

```powershell
docker compose --env-file .env.local -f compose.yaml -f compose.integrations.yaml -f compose.scanning.yaml up --build -d
```

The pinned official scanner image runs as `clamav`, has no published host port and persists signature updates in a named volume. Allocate approximately 4 GiB for it. `CLAMAV_HOST=scanner` and port 3310 come from the overlay. When the scanner is configured, uploads require a successful scan before the PDF is stored. The PDFium renderer reads PDFs locally in WebAssembly when there is no scanner configuration.

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

## November 19 UI continuation

Destination links now include larger flags, the hero copy is shorter and its decorative dashed line is removed. The logo returns home and returns to the top when already on the homepage, respecting reduced motion and modifier clicks. Login and registration use a compact mobile layout, preserve fields after errors and allow scrolling on short viewports without clipping controls.

Workspace navigation lives in persistent layouts, explicitly prefetches tabs and shows loading content while page-level authorization runs. On desktop the sidebar and header remain in place while the selected tab scrolls. Mobile navigation and selected card rows scroll horizontally; filters and checkboxes retain native form semantics. Select pickers gain styled options where the browser supports them, with normal native controls as fallback.

`/admin/website` manages the homepage photograph. Opportunity/promotion image choices include thumbnails and a public marketing-image uploader. Choose/upload an image, then explicitly save the surrounding form; uploading does not itself publish a promotion or replace the homepage hero. The separate public `marketing-images` bucket is never used for private receipts/documents. Migration 020 and rollback guidance are in APPLICANT-OPERATIONS-MIGRATIONS.md.

Validation: 35 isolated production browser tests passed. Real-admin Docker checks confirmed one active navigation item, fixed desktop chrome, mobile navigation swiping and no horizontal overflow. At 390×844 the registration submit button fits within the viewport. Browser-driven file selection was blocked by the Chrome extension's local-file permission; the upload handler is covered separately with actual image decoding and mocked storage/authorization in unit tests. A real hosted upload has not been claimed as verified.
