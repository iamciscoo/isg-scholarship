# ISG Scholarship Platform

Phase 1 of International Scholarship Gateway's advisory platform: a branded public website, guest eligibility intake, verified applicant accounts, and an MFA-protected lead workspace. Built with Next.js App Router, React, strict TypeScript, Tailwind, Supabase and Resend.

The current live website has not been replaced. This repository contains no invented clients, awards, testimonials, private scholarship inventory or prices.

## Run locally

Requirements: Node.js 22, npm 10.9.8, and Docker Desktop for container/database checks.

```powershell
npm ci --ignore-scripts
npm run dev -- --port 3002
```

Open [localhost:3002](http://localhost:3002). Marketing pages work without external services. Dependent forms clearly remain unavailable until their required configuration is present. This is intentional; there is no simulated successful submission.

On a fresh checkout only, create `.env.local` from `.env.example`. Never overwrite an existing environment file. Public variables are compiled into the client and require a rebuild when changed. Server secrets must never use the `NEXT_PUBLIC_` prefix.

## Supabase connection

Project: `mfqkzausvpplknvyhywg` ([dashboard](https://supabase.com/dashboard/project/mfqkzausvpplknvyhywg)). All five migrations are applied and recorded in `supabase_migrations.schema_migrations`. The bootstrap used an empty-schema guard and transaction; migration 005 adds tested recovery for exhausted notification leases.

Codex MCP was added and OAuth authentication verified. A running Codex chat may need its tool connection refreshed before the new server appears. CLI verification: `codex mcp list`.

For another environment, apply the SQL migrations in filename order, using the Supabase CLI migration workflow. Keep `private` out of exposed Data API schemas. Do not run the test fixtures against hosted Supabase. Instructions, role bootstrap and auth settings: [SETUP.md](docs/SETUP.md).

## Docker

The application runs as a non-root user in a multistage standalone image. PostgreSQL, Auth and Storage remain managed by Supabase; Docker Compose does not replace those services. For a fully local backend, run the official Supabase CLI stack separately and configure its local URL and keys.

After configuring `.env.local`:

```powershell
docker compose --env-file .env.local up --build -d
docker compose ps
docker compose logs --tail 50 web
```

The default address is [localhost:3002](http://localhost:3002). Stop the dev server first if it uses the same port. `APP_PORT` controls the host port; set `NEXT_PUBLIC_SITE_URL` to the same address. Compose binds to loopback by default. Put a trusted HTTPS reverse proxy in front for public self-hosting. Never expose the development server directly.

To stop the application: `docker compose down`. No hosted Supabase data is removed. Runtime health is available at `/api/health`.

## Verification

```powershell
npm run typecheck
npm run lint
npm test
npm run test:db
npx playwright install chromium
npm run test:e2e
npm run build
npm audit --audit-level=high
```

The database test creates an isolated, disposable PostgreSQL 17 container with a minimal test-only Supabase identity contract, applies the actual migrations, and tests transactions and RLS adversarially. It does not contact the hosted project or prove hosted Auth/SMTP delivery. Test data never enters development or production.

Browser tests build an isolated production instance on port 3004 with external integration credentials disabled. On Windows they can use installed Chrome; CI uses Playwright Chromium. Screenshots are written to ignored `artifacts/`. Full configured authentication, Turnstile, email and staff MFA browser flows require the remaining provider setup and are not claimed verified until run against a separate integration environment.

To run the same browser checks against the local Docker service while intake is still disabled:

```powershell
$env:PLAYWRIGHT_BASE_URL='http://localhost:3002'
npm run test:e2e
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

## Finish GitHub setup

This folder is already a Git repository on `main`, with local commits. Create a **private, empty** repository on GitHub, with no generated README, license or `.gitignore`, then:

```powershell
git remote add origin https://github.com/YOUR-USERNAME/isg-scholarship.git
git push -u origin main
```

If `origin` already exists, inspect `git remote -v` before changing it. Review the staged/tracked files before pushing; `.env.local` is ignored. GitHub Actions will run type, lint, unit, database, audit, build and browser checks. No GitHub repository has been created or pushed automatically.

## What is included

- New Flight Ribbon brand, self-hosted Manrope, locally stored Pexels imagery and responsive public pages.
- Four-step assessment with validation, consent separation, adult confirmation, Turnstile, body limits, shared rate limits, idempotency and transactional lead creation.
- Supabase verified-email registration, sign-in, recovery, global sign-out, account suspension checks, applicant contact profile and safe assessment linking.
- Staff TOTP MFA gate, scoped advisor access, lead filters/detail/review, admin assignment, private review history and audit records.
- Contact enquiry storage and a restricted admin inbox.
- Durable Resend outbox with leases, retries, deduplication and operational delivery counts.
- CSP nonces, security headers, server-side authorization, RLS, legacy redirects, sitemap and robots metadata.

## Remaining setup and later phases

Turnstile, Supabase Auth email/SMTP, Resend, staff account selection, approved business details and privacy/terms review remain owner setup steps. `INTAKE_ENABLED=false` remains the default until those gates are satisfied. [SETUP.md](docs/SETUP.md) lists every configuration item. [ROADMAP.md](docs/ROADMAP.md) distinguishes Phase 1 from document management, research, applications, consultations, billing and later integrations. [ARCHITECTURE.md](docs/ARCHITECTURE.md) records permissions and trust boundaries; [VERIFICATION.md](docs/VERIFICATION.md) records checks and their limits.
