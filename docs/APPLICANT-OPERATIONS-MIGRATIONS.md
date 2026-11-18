# Applicant operations: migration and recovery plan

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

Payment instructions must be supplied by an administrator; no account number is fabricated. Manual approval records a claim verification, not an automated bank integration. Google Meet links are supplied by the scheduling advisor; Calendar OAuth automation is not implied. Resend test-sender restrictions remain. GREEN-API receives generic staff-only links, never raw applicant files. A trusted malware scanner is required for PDF uploads; decoded image uploads remain available independently.
