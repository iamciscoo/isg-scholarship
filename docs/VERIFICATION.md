Current programme/consultation checkpoint: 83 unit tests, 43 isolated production-browser tests, all 21 migrations and adversarial database suites, typecheck, lint, dependency audit and Docker build passed. Three focused browser checks also passed against the configured Docker service. Live ngrok inspection confirmed equal destination guide counts and results scrolling after streamed content loaded; the existing consultation draft showed About, Academics, Ambitions and Review, an enabled Submit button and no unavailable notice. No genuine draft was submitted or legal consent accepted during QA. See [Programme and consultation update](PROGRAMMES-CONSULTATION-UPDATE.md) for configuration and scope. Earlier checkpoints below are retained as history.

Prior advisor/preview checkpoint: 69 unit tests, 41 isolated browser tests, all 21 migrations and adversarial database suites, typecheck, lint and Docker build passed. Six focused Docker checks and four final advisor/photo checks also passed. Live ngrok accepted an empty validation request (422) while rejecting a foreign origin (403), without creating records. See [Advisor preview update](ADVISOR-PREVIEW-UPDATE.md) for scope, configuration and remaining provider limits.

November 19 UI checkpoint: all 20 migrations and adversarial SQL suites passed on disposable PostgreSQL. Migration 020 was independently reviewed, applied through the signed-in Supabase SQL dashboard after the MCP client required reconnection, and recorded transactionally in migration history. Hosted verification confirmed public marketing storage, private case storage and service-only upload registration; no gallery/test applicant data was seeded. Desktop/mobile image selection and navigation were inspected in the rebuilt Docker preview; 15 focused browser checks also passed against that container. Local-file selection in browser automation requires the Chrome extension file permission, so hosted upload completion remains a practical acceptance check. No environment files were overwritten.

# Current update

The current delivery is [applicant operations](APPLICANT-OPERATIONS.md): 19 migrations, real private scanner, consultation/payment, meetings/full forms, applications and private catalogue/public promotion separation. The records below are historical snapshots.

Current checkpoint: 61 unit tests, 35 isolated production-browser tests, all database integration suites, typecheck, ESLint and Docker production build passed. Generated application PDF text and both rendered pages were inspected. Real ClamAV scanned the generated fixture successfully. Existing-admin browser checks confirmed the new empty-state flows and 32 private-page width checks (320/390/768/1440) without horizontal overflow. No real applicant, payment or provider outcome was invented for QA. The current full dependency audit reports zero vulnerabilities, superseding the earlier tooling advisory record. Authenticated private-data RPC advisory flags are intentional role/ownership-guarded functions; raw private tables retain deny-by-default policies. Public launch configuration and actual provider acceptance remain separate from these checks.

See [account and consultation update](ACCOUNT-UX-UPDATE.md) for current registration, thirteen migrations and validation. [The earlier 18 November update](UPDATE-2026-11-18.md) records the integration setup. The Phase 1 record below is historical.

# Verification record

Observed on 17 November 2026. Launch configuration is distinguished from local and hosted checks.

## Scope and limits

Automated unit tests cover validation, consent separation, redirect safety, permissions, request limits, challenge validation and email escaping. PostgreSQL integration tests run the actual migrations and RLS on a disposable container using a test-only Supabase identity contract. Browser tests use a real isolated production build with external integration credentials disabled. These are not substitutes for testing Supabase Auth, SMTP, Turnstile and real staff sessions in a separate configured integration project.

Hosted checks performed without test applicants: the server secret can query empty profiles/leads; anonymous assessment reads and anonymous privileged rate-limit RPC calls are denied (HTTP 401 / SQL 42501). All five migration versions 202611170001–202611170005 were observed in hosted migration history. No live website deployment or DNS change was performed.

## Completed checks

- TypeScript route generation and strict type checking: passed.
- ESLint: passed with no lint warnings. ESLint 9.39.5 is pinned to satisfy the Next.js bundled plugins' peer ranges; it carries a tooling deprecation notice. ESLint 10 was rejected because those plugin peer ranges exclude it.
- Unit tests: 31 passed across four files. Includes consent, validation, redirect safety, permissions, request-size limits, Turnstile action/host verification and email escaping.
- Mutation check: reversing advisor ownership in the permission helper caused the permission tests to fail; the original implementation was restored.
- PostgreSQL: all five migrations and adversarial RLS/transaction tests passed. Covered anonymous reads/RPCs, applicant isolation, forged roles, verified-email linking, advisor assignment scope, staff MFA, suspension, restricted mutations, audit records, idempotency, shared rate limits, notification leases and exhausted-worker recovery.
- Browser tests: all nine passed on an isolated production build. Public pages/legacy redirects, assessment validation/progress, unauthenticated route protection, keyboard FAQs, widths 320/768/1024/1440, and axe WCAG A/AA checks on the homepage, assessment, contact and login pages.
- `npm audit --audit-level=high`: zero reported vulnerabilities.
- Docker: production image built from a pinned Node 22 Alpine base with a clean lockfile install. Container `isg-scholarship-web-1` is healthy on loopback port 3002 and runs as UID 1001. Homepage and health endpoint returned HTTP 200; intake returned 503 while intentionally disabled. An actual browser visit to `/admin` reached `/login` (Next.js uses a streaming redirect, so the initial HTTP status can be 200 without protected content).
- Secret isolation: `.env.local` is absent from the image, the runtime server key is present through environment configuration, and that key was not found in browser JavaScript bundles. The real environment file is Git-ignored and was created exclusively without overwriting an existing file.
- The nine browser checks also passed against the running Docker service. Screenshots are available under ignored `artifacts/`; `home-1440-viewport.png` shows the actual container-served homepage.

## Configuration still required

No live applicant, staff or marketing data was fabricated. No staff role was assigned. Supabase Auth email/SMTP, Turnstile, Resend, the notification schedule, staff bootstrap/MFA user testing, approved legal/business information, retention procedures and the final configured end-to-end acceptance test remain setup gates. `INTAKE_ENABLED=false` is retained. Later product phases are listed in ROADMAP.md.
