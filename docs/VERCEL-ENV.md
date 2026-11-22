# Vercel environment variables

Every variable the app reads (`grep -rhoE "process\.env\.[A-Z0-9_]+" src scripts`), why it exists, and what breaks when it is missing. Set these in Vercel → Project → Settings → Environment Variables for Production, Preview and Development, then **redeploy**: `NEXT_PUBLIC_*` values are inlined at build time, so an existing deployment will not pick them up.

Never commit real values. Copy them from the local `.env*.local` files or the handover file.

## 1. Required for auth, intake and contact

| Variable | Scope | Value | Purpose / failure if missing |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | `https://mfqkzausvpplknvyhywg.supabase.co` | `authConfigured()` → login, session refresh in `src/proxy.ts`. Without it `/login` renders `configured:false` and no account can sign in. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | `sb_publishable_…` | Same gate. Shipped to the browser; RLS is the only thing protecting data behind it. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | `sb_secret_…` | `intakeConfigured()` / `contactConfigured()`, `src/lib/supabase/admin.ts`. Bypasses RLS — never prefix with `NEXT_PUBLIC_`. Missing = forms and admin writes silently refuse. |
| `NEXT_PUBLIC_SITE_URL` | Public | `https://www.isgscholarship.org` | Canonical origin. Used by the same-origin check in `src/lib/security/request.ts` (CSRF guard). Wrong value = form posts rejected as cross-origin. |
| `PUBLIC_APP_URL` | Server only | `https://www.isgscholarship.org` | Origin used in outbound notification links (`src/config/site.ts`). Set it when the app is served behind a tunnel or preview host, otherwise WhatsApp and email links carry the tunnel domain. Falls back to `NEXT_PUBLIC_SITE_URL`. |

## 2. Production hardening (should not be left at the dev default)

| Variable | Scope | Value | Why |
| --- | --- | --- | --- |
| `TRUST_PROXY` | Server | `true` | Vercel terminates TLS at its edge. Left `false`, rate limiting hashes `"direct"` for every visitor (one shared bucket) and auth cookies fall back to a non-secure hint. Also enables `x-forwarded-proto` detection in `src/proxy.ts`. |
| `RATE_LIMIT_SECRET` | Server | 64-char hex, generated fresh | HMAC key for `clientIdentity()`. Reusing the dev value is harmless but unnecessary — generate a new one per environment. |
| `CRON_SECRET` | Server | 64-char hex, generated fresh | Authorizes the scheduled delivery worker. App requests normally wake the worker after sending their response. The scheduled worker also processes due retries and any remaining backlog. |

## 3. Feature flags

| Variable | Value | Effect |
| --- | --- | --- |
| `INTAKE_ENABLED` | `true` / `false` | With `SUPABASE_SERVICE_ROLE_KEY` present, `true` opens `/consultation` submissions and `POST /api/assessments`. `false` shows the paused state. Flip to `false` to stop collecting personal data immediately. |
| `CONTACT_ENABLED` | `true` / `false` | Enables the public advisor enquiry form. Anything except the literal `false` counts as enabled, so set it explicitly. |

## 4. Transactional email (Resend)

| Variable | Value | Effect |
| --- | --- | --- |
| `RESEND_API_KEY` | `re_…` from Resend | `src/server/services/notifications.ts` returns `{configured:false}` without it: applicants get **no** confirmation email, submissions still land in Supabase. |
| `RESEND_FROM_EMAIL` | `ISG <support@isgscholarship.org>` | Required together with the key. Resend verified the production sender domain and its four Vercel DNS records on 22 November 2026. Zoho still handles inbound mail for the root domain. |
| `ADMIN_EMAIL_ENABLED` | `true` after the sender verifies | Enables admin delivery to the recipients in **Admin → Settings**. The initial recipient is `support@isgscholarship.org`. |

WhatsApp alerts are independent of email and work fine on serverless (plain outbound HTTPS):

| Variable | Value |
| --- | --- |
| `GREEN_API_URL` | Instance API host from Green API. The existing instance uses `https://7107.api.greenapi.com`. |
| `GREEN_API_MEDIA_URL` | Optional instance media host from Green API. Defaults to `https://media.greenapi.com`. |
| `GREEN_API_INSTANCE_ID` | Green API instance id |
| `GREEN_API_TOKEN` | Green API token |

The WhatsApp group ID is stored in the database. Verify the authorized instance can access the intended staff group before enabling delivery. Green API returns an acceptance ID. Admin settings show provider acceptance, queued retries, and ambiguous delivery outcomes.

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
| `CLAMAV_HOST` / `CLAMAV_PORT` | Optional external scanner. With a configured scanner, a successful scan preserves the original PDF. Without one, the app renders and rebuilds uploaded PDFs as image-only review copies. |
| `PREVIEW_SITE_URL`, `ISG_PAYMENT_QA*` | Preview/QA compose overlays and tests only. |

## 7. Outside Vercel

- **Supabase → Authentication → URL Configuration**: Site URL `https://www.isgscholarship.org`; redirect allow list must include `https://www.isgscholarship.org/auth/callback` (and `/auth/callback?next=/consultation`), or recovery and magic links point at localhost.
- **Scheduling**: `vercel.json` runs the retry worker daily at 06:00 UTC. Vercel adds `Authorization: Bearer $CRON_SECRET`. For shorter retry intervals, a Pro project can schedule the same route every minute.
- **Apex vs www**: `isgscholarship.org` 308-redirects to `www`, so `NEXT_PUBLIC_SITE_URL` must be the `www` host or origin checks reject posts coming through the redirect.
