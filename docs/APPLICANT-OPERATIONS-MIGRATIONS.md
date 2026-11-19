# Applicant operations: migration and recovery plan

## Enquiries, staff inbox and WebP migration 021

Before hosted changes, run the full migration chain and role/isolation/idempotency tests on disposable PostgreSQL. Inspect hosted migration history and counts of existing enquiries, notifications and legacy image paths. Migration 021 adds an enquiry trigger and extends the existing private admin-event function to create individual admin inbox messages. Messages contain generic text and authenticated workspace links, never enquiry text or applicant documents. Existing read-state/RLS rules apply; only active admins receive new staff alerts. No historical events or test records are seeded.

The same migration normalizes stored local photo references to their verified WebP counterparts and restricts new local marketing choices to WebP. Legacy JPG URLs redirect to the converted photos. Public upload, avatar and private image handlers already re-encode validated content as WebP; PDFs retain their document format. Apple’s touch icon stays PNG and vector logos/flags stay SVG for compatibility.

Rollback the application first. Retain notifications/read history and source data; disable the new enquiry trigger and restore the prior queue function from migration 009 if staff alert writes must stop. Keep the WebP files and legacy redirects; do not delete business records or reverse image paths to files no longer served. No environment file will be overwritten. Consultation intake remains disabled; advisor enquiry collection is separately controlled by CONTACT_ENABLED.

Baseline: main a873959; hosted migrations 001–013 verified on 18 November 2026. Read-only preflight found two accounts and zero submitted consultations. No real accounts or environment files may be replaced for QA.

## Before applying

1. Review SQL and run migrations plus adversarial tests on disposable PostgreSQL. Record application/build checks.
2. Confirm hosted migration history still matches baseline. Export schema/data through the hosting backup mechanism before public intake; this preview has no consultation/payment data.
3. Apply additive migrations in order with Supabase MCP; no table drops, no synthetic data, no automatic payment verification. Private data tables deny anonymous access, use RLS and narrow security-definer functions with empty search paths and explicit grants.
4. Verify migration history, grants and security advisors after deployment. Preserve `INTAKE_ENABLED=false` until external launch configuration is ready.

## Rollback

Revert the application slice first. New tables can remain safely dormant with RLS, and new storage buckets remain private. Suspend new writes by revoking EXECUTE on the affected workflow RPCs and disabling intake; leave read/export access to authorized operators. Do not delete receipts, declarations, financial audit or application history.

Only in an empty disposable environment may new slice tables/functions/policies be dropped in reverse dependency order. For populated hosted data, restore from a verified backup to a separate recovery project, reconcile new receipts/approvals, then issue a forward repair migration. Never roll back financial verification or applicant declarations by deleting history. Legacy academic columns made nullable should stay nullable unless every row satisfies an explicit preflight check before restoring constraints.

## External configuration

## November 19 marketing-image migration plan

Migration 020 adds a public marketing gallery and a single public homepage-image setting. It uses a separate Storage bucket from receipts/documents. Only an active administrator can upload through the server; content is bounded, decoded and re-encoded before publication. Original filenames and EXIF metadata are discarded. Public image reads are intentional. Existing opportunity/promotion image constraints are widened to permit registered marketing-image IDs, without widening private data access.

Test 020 and public/private role boundaries on disposable PostgreSQL before applying. Revert the UI first for rollback; retain uploaded assets and disable the new write RPCs. Restore the old image constraint only after checking that no row uses a registered gallery path. Do not delete uploaded business assets or private application data as a rollback shortcut.

Payment instructions must be supplied by an administrator; no account number is fabricated. Manual approval records a claim verification, not an automated bank integration. Google Meet links are supplied by the scheduling advisor; Calendar OAuth automation is not implied. Resend test-sender restrictions remain. GREEN-API receives generic staff-only links, never raw applicant files. A trusted malware scanner is required for PDF uploads; decoded image uploads remain available independently.
