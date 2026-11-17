# ISG platform architecture

## Delivery contract

The supplied product brief is the requirements source. Its final instruction starts with Phase 1. This delivery implements that phase with an applicant account foundation and staff MFA, and records subsequent phases in ROADMAP.md. It does not publish or migrate the existing live site.

## Modules and build order

| Module            | Responsibility                                                     | Dependencies                |
| ----------------- | ------------------------------------------------------------------ | --------------------------- |
| public-site       | Public services, pathways, process, fees and policy information    | brand assets                |
| identity          | Verified email accounts, recovery, sessions, staff MFA, suspension | Supabase Auth               |
| assessment-intake | Validated guest assessments, consent, reference, lead              | database, Turnstile         |
| lead-management   | Admin review, stage changes, advisor assignment, notes, audit      | identity, assessment-intake |
| notifications     | Durable email outbox with retries and delivery state               | assessment-intake, Resend   |
| applicant-account | Own profile and verified-email assessment linking                  | identity, assessment-intake |

Build order: public-site → assessment-intake → identity → lead-management / applicant-account → notifications → packaging and verification.

## Boundaries

Next.js App Router, strict TypeScript, React, Tailwind and owned shadcn-style primitives form one modular monolith. Server components fetch private data, server actions perform authenticated mutations, and route handlers accept public intake and worker calls. Domain validation is shared without sharing server credentials.

Supabase PostgreSQL owns profiles, roles, assessments, leads, consent, audit and the notification outbox. RLS checks current account status and verified staff MFA. Staff roles can be assigned only through a trusted database administrator, never through registration metadata. Advisors can read assigned leads only; only administrators assign staff. Applicants can read their own assessments only after verified-email linking. Sensitive writes are transactional database functions with explicit grants.

The `private` schema is not exposed through the Data API and holds internal lead notes, outbox payloads and abuse counters. Future scholarship research belongs there. No confidential scholarship dataset is shipped in public assets, seeded content, API responses or client bundles.

Intake uses a server-only service key to call a narrowly scoped atomic function. Anonymous clients have no direct table insert or select access. Each submission requires schema validation, a same-origin request, body limits, honeypot, Turnstile verification, shared database rate limiting and idempotency. A repeated request must match the original payload. A reference alone does not grant record access.

Supabase SSR uses validated users and refreshed sessions. Staff require an AAL2 TOTP session. Account status is read on every protected operation, rather than trusting role claims. Authorization is also enforced in RLS. Cookies are HttpOnly and SameSite=Lax, Secure over HTTPS.

## Threat model

Assets: applicant PII, staff credentials, confidential notes and research, consent evidence. Boundaries: browser/server, server/Supabase, server/Turnstile, worker/Resend. Abuse cases: forged admin metadata, cross-applicant enumeration, unassigned advisor access, CSRF, replay, spam, suspended sessions, and notification duplication. Mitigations are server-side role checks plus RLS, atomic intake and review, payload hashes, hashed rate-limit identities, Turnstile, bounded requests, audit history, worker leases, and provider idempotency keys.

## Design contract

Use the supplied Flight Ribbon SVG and local Manrope font. Navy #0D2C62, gold #B88A35, cream #F6F5F0. Light mode as requested. Variance 5, motion 3, density 4. Buttons use 8px corners, panels 16px, inputs 8px. The homepage uses a split photographic hero, a concise service story, navigable study pathways, a process sequence and native FAQ disclosures. No unverified testimonials, partner logos, awards or fabricated counts. Marketing imagery illustrates student life and does not depict ISG beneficiaries.

Forms have visible labels, inline validation, a keyboard-operable stepper and meaningful pending/error/success states. Mobile navigation collapses below desktop width. Protected pages show real database records or honest empty states. Missing configuration disables dependent actions with a clear explanation.

## Environment and operational model

Separate Supabase projects and credentials for development and production. Hosted Supabase is the default external backend; the local CLI can run the same stack using Docker. The application has a standalone non-root Docker image and Compose health checks. Notifications are durable and optional delivery failures never undo an assessment. Scheduling uses a secret-protected worker endpoint. Supabase handles verification and recovery email through its configured SMTP provider.

Business-owned values that are not approved (prices, legal entity, retention periods, office details) are not invented. Production collection is gated by `INTAKE_ENABLED` until business and privacy review is complete. Legal pages explain the actual implementation and explicitly require owner review before launch.
