# ISG Scholarship Platform

Next.js, React, TypeScript and Supabase with the supplied Flight Ribbon identity. Includes public pages, six-language home/auth/navigation, registered consultation intake, applicant profiles and avatars, admin/advisor workspaces, account notifications and Resend/Green API admin alerts.

The existing live website is unchanged. There are no fabricated students, testimonials, scholarship awards or outcomes. Detailed forms and service/legal content remain English, with language-support notices.

## Run locally

```powershell
npm ci --ignore-scripts
npm run dev -- --port 3002
```

Use .env.example for another environment. Never commit real environment files. Configured Docker preview:

```powershell
docker compose --env-file .env.local -f compose.yaml -f compose.integrations.yaml up --build -d
```

Open http://localhost:3002. The admin dashboard is /admin; /admin/consultations handles submitted consultations; /dashboard/consultations shows a user’s drafts and request status; /admin/settings manages roles and notification recipients. Consultation requires registration. Public intake remains disabled pending the remaining provider setup. compose.yaml alone runs the basic app without optional integration files. The image runs non-root; hosted Supabase supplies database, Auth and Storage.

## Verify

```powershell
npm run typecheck
npm run lint
npm test
npm run test:db
npm run test:e2e
npm run build
npm audit --omit=dev --audit-level=high
```

Database fixtures run only in disposable PostgreSQL containers. Browser checks use an isolated production build with external credentials disabled. To check Docker, set PLAYWRIGHT_BASE_URL=http://localhost:3002.

The full audit reports unpatched development-tool advisory GHSA-fc5q-39xc-vjpf in picomatch. The production audit is clean. The existing full-audit CI gate is retained and will report this upstream finding until resolved.

## GitHub and hosting

Origin: https://github.com/iamciscoo/isg-scholarship.git. Future updates use git push. Configure hosting secrets separately. GitHub Pages cannot run this application's server-side authentication and API routes; use a Next.js host or Docker behind HTTPS with an authenticated notification scheduler.

[Latest UX update](docs/ACCOUNT-UX-UPDATE.md) | [Setup](docs/SETUP.md) | [Architecture](docs/ARCHITECTURE.md) | [Verification](docs/VERIFICATION.md) | [Assets](docs/ASSETS.md) | [Roadmap](docs/ROADMAP.md)
