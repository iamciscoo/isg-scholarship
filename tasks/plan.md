# Implementation plan

1. Foundation and public site: install compatible dependencies, copy current brand assets, implement responsive public pages and legacy redirects. Verify types, build and desktop/mobile layout.
2. Assessment intake: implement four-step validated form, atomic lead/assessment/consent/outbox migration, Turnstile and shared rate limits. Verify invalid data, idempotency and denied direct anonymous reads.
3. Identity and accounts: verified registration, login, recovery, global sign-out, applicant profile and safe email linking. Verify no role escalation and cross-applicant denial.
4. Staff workspace: AAL2 MFA gate, admin lead filters/detail/stage/assignment and audit, advisor scope. Verify unauthorized/suspended/unassigned access denial.
5. Email delivery: leased outbox processing, branded confirmation/team templates, deduplication/retries, operational status. Verify failures remain retryable.
6. Package and handoff: Docker image/Compose, CI, setup and GitHub documentation, automated checks, local integration verification, initial Git commits.

External configuration remains an owner setup step; dependent operations must never return fabricated success. No production deployment or DNS migration is part of this local build.
