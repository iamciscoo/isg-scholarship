# Vercel environment variables

Every variable the app reads (`grep -rhoE "process\.env\.[A-Z0-9_]+" src scripts`), why it exists, and what breaks when it is missing. Set these in Vercel → Project → Settings → Environment Variables for Production, Preview and Development, then **redeploy**: `NEXT_PUBLIC_*` values are inlined at build time, so an existing deployment will not pick them up.

Never commit real values. Copy them from the local `.env*.local` files or the handover file.

## 1. Required for auth, intake and contact

| Variable | Scope | Value | Purpose / failure if missing |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | `https://mfqkzausvpplknvyhywg.supabase.co` | `authConfigured()` → login, session refresh in `src/proxy.ts`. Without it `/login` renders `configured:false` and no account can sign in. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | `sb_publishable_…` | Same gate. Shipped to the browser; RLS is the only thing protecting data behind it. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | `sb_secret_…` | `intakeConfigured()` / `contactConfigured()`, `src/lib/supabase/admin.ts`. Bypasses RLS — never prefix with `NEXT_PUBLIC_`. Missing = forms and admin writes silently refuse. |
| `NEXT_PUBLIC_SITE_URL` | Public | `https://www.isgscholarship.org` | Canonical origin. Used by the same-origin check in `src/lib/security/request.ts` (CSRF guard), email templates, and alert links. Wrong value = form posts rejected as cross-origin. |

## 2. Production hardening (should not be left at the dev default)

| Variable | Scope | Value | Why |
| --- | --- | --- | --- |
| `TRUST_PROXY` | Server | `true` | Vercel terminates TLS at its edge. Left `false`, rate limiting hashes `"direct"` for every visitor (one shared bucket) and auth cookies fall back to a non-secure hint. Also enables `x-forwarded-proto` detection in `src/proxy.ts`. |
| `RATE_LIMIT_SECRET` | Server | 64-char hex, generated fresh | HMAC key for `clientIdentity()`. Reusing the dev value is harmless but unnecessary — generate a new one per environment. |
| `CRON_SECRET` | Server | 64-char hex, generated fresh | Bearer token for `GET /api/jobs/notifications` (`src/app/api/jobs/notifications/route.ts`). Without it that route always returns 401, so queued email/WhatsApp alerts never leave the database. |

## 3. Feature flags

| Variable | Value | Effect |
| --- | --- | --- |
| `INTAKE_ENABLED` | `true` / `false` | With `SUPABASE_SERVICE_ROLE_KEY` present, `true` opens `/consultation` submissions and `POST /api/assessments`. `false` shows the paused state. Flip to `false` to stop collecting personal data immediately. |
| `CONTACT_ENABLED` | `true` / `false` | Enables the public advisor enquiry form. Anything except the literal `false` counts as enabled, so set it explicitly. |

## 4. Transactional email (Resend)

| Variable | Value | Effect |
| --- | --- | --- |
| `RESEND_API_KEY` | `re_…` from Resend | `src/server/services/notifications.ts` returns `{configured:false}` without it: applicants get **no** confirmation email, submissions still land in Supabase. |
| `RESEND_FROM_EMAIL` | `ISG <hello@isgscholarship.com>` | Required together with the key. Verified against the API on 2026-11-20: Resend reports domain `isgscholarship.com` as **`not_started`**, so sends from this address are rejected until the DNS records are added in Resend → Domains. Until then only `onboarding@resend.dev` reaches the account owner. |
| `ADMIN_EMAIL_ENABLED` | `false` until the domain verifies | Gates the admin *email* channel only (`src/server/services/admin-alerts.ts`). Needs both Resend vars plus a verified sender. WhatsApp alerts do not depend on it. |
| `ISG_TEAM_EMAIL` | team inbox address | Passed to the assessment RPC as `p_team_email` for new-lead routing. Empty string stores an empty value — leads are not routed. |

WhatsApp alerts are independent of email and work fine on serverless (plain outbound HTTPS):

| Variable | Value |
| --- | --- |
| `GREEN_API_URL` | `https://7107.api.green-api.com` (instance host from Green API) |
| `GREEN_API_INSTANCE_ID` | Green API instance id |
| `GREEN_API_TOKEN` | Green API token |

Admin alerting is skipped only when email **and** WhatsApp are both unconfigured. The WhatsApp group id is stored in the database (admin settings), not in env.

## 5. Cloudflare Turnstile (captcha)

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | widget site key |
| `TURNSTILE_SECRET_KEY` | secret key |

Set **both or neither**. `challengeRequired()` is true when either is present and `src/lib/security/turnstile.ts` fails closed, so a half-configured pair rejects every protected submission. With neither, auth intake still has validation, consent and persistent rate limits — just no captcha.

## 6. Do not set these on Vercel

| Variable | Why not |
| --- | --- |
| `APP_PORT` | Compose/Docker publishes the container port. Vercel routes by platform, ignores it. |
| `PORT`, `HOSTNAME`, `NODE_ENV` | Injected by the platform/Next.js. |
| `NEXT_DIST_DIR` | Only used by preview/scanning compose overlays. |
| `NOTIFICATION_JOB_URL` | Default for `scripts/notification-worker.mjs`, the Docker scheduler. On Vercel the job is called by URL instead. |
| `CLAMAV_HOST` / `CLAMAV_PORT` | Needs a reachable `clamd` daemon; Vercel has no container to run it. Left unset, `validateCaseFile()` rejects **PDF** uploads with "PDF scanning is not configured" — images still work. Only set these if you point at an external scanner. |
| `PREVIEW_SITE_URL`, `ISG_PAYMENT_QA*` | Preview/QA compose overlays and tests only. |

## 7. Outside Vercel

- **Supabase → Authentication → URL Configuration**: Site URL `https://www.isgscholarship.org`; redirect allow list must include `https://www.isgscholarship.org/auth/callback` (and `/auth/callback?next=/consultation`), or recovery and magic links point at localhost.
- **Scheduling**: there is no `vercel.json`, so nothing calls `/api/jobs/notifications`. Add a Vercel Cron (or external scheduler) hitting it with `Authorization: Bearer $CRON_SECRET`. Minute-level crons need a paid plan; Hobby is daily.
- **Apex vs www**: `isgscholarship.org` 308-redirects to `www`, so `NEXT_PUBLIC_SITE_URL` must be the `www` host or origin checks reject posts coming through the redirect.
