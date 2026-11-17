# Account and consultation update — 18 November 2026

This record supersedes the earlier update's registration and consultation ownership details.

## Delivered

- Authenticated navigation uses an avatar menu with My workspace and Log out. Guests see Sign in. Public links read About us, Services and Study paths.
- Registration uses email, password and password confirmation. Hosted Supabase email confirmation is disabled as requested. Password recovery still uses an emailed recovery link.
- Consultation progress saves on Continue and atomically reuses completed personal details in the account profile. Existing profile details prefill the form. Applicant consultations are at `/dashboard/consultations`; staff manage consultations at `/admin/consultations`.
- Consultation ownership uses authenticated account IDs. Matching an email cannot claim old records. Idempotent retries preserve any newer profile changes and draft.
- Profile photos have a preview and styled chooser. Admin forms have consistent controls; email recipients use a removable list; account choices show names and email addresses. Shield icons were replaced.
- The homepage and university page show identified campus photography without scholarship listings or partnership claims. The About page uses updated photography and explains support throughout the application process.

## Verification

- Strict TypeScript and ESLint passed; 36 unit tests passed.
- All 13 migrations and database integration suites passed in a disposable PostgreSQL container. Coverage includes account isolation, atomic draft/profile updates, retry preservation and advisor directory pagination.
- Migrations 202611180010–202611180013 were applied to hosted Supabase and verified in migration history.
- Docker production build succeeded and the service is healthy on `http://localhost:3002`.
- All 20 browser tests passed against Docker, including public layouts at 320/390/768/1440 pixels and accessibility checks. Use the configured `localhost` origin; its `127.0.0.1` alias correctly fails same-origin mutation checks.
- Real authenticated browser checks confirmed sign-in, account menu/log-out, named recipients, profile controls, consultation email prefill and private page widths. Admin settings, notifications, consultations, profile and own consultations fit at 320/390/768/1440 pixels after correcting workspace grid sizing. No applicant fixtures, notifications or profile changes were saved to hosted data for QA.
- Independent review passed after fixing retry preservation and advisor directory filtering. Production dependency audit reports zero vulnerabilities.

Public intake remains disabled pending Turnstile and launch configuration. Draft saving is available to authenticated accounts. Recovery email delivery still depends on Supabase's email configuration and limits. Resend uses the approved account-owner recipient until domain verification; no DNS changes were made.

GitHub Actions was blocked before job execution by the account billing restriction. The full development dependency audit also retains an upstream picomatch advisory; its gate has not been weakened. See README and SETUP for deployment commands and environment setup.
