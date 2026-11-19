# Programme and consultation update

Study Paths now has 60 editorial programme guides across ten academic fields and three study levels. Every destination shows the same guide catalogue. These introduce study interests; they do not assert that every university or country currently offers a particular course, admission place or scholarship. Advisors confirm institutions, course requirements and actual opportunities privately. Admin-published promotions retain their destination, level and field filters.

Twelve guides appear per page. Explore paths, Reset and pagination preserve the results anchor so visitors reach Programme options instead of restarting at the top. Filters stay synchronized after navigation. Consultation steps are About, Academics, Ambitions and Review.

## Submission configuration

The ngrok preview overlay sets INTAKE_ENABLED=true without modifying actual environment files. The basic Compose service keeps its paused default. Auth configuration and the server-only service key remain required. Turnstile is mandatory whenever either Turnstile key is present; incomplete configuration fails closed. With neither key configured, registered users can submit with matching account email, explicit consent, input validation, persistent rate limits and database-enforced idempotency/account checks. Configure Turnstile before broader public traffic.

The existing transactional submission creates the consultation and its payment workspace. The TZS 50,000 fee still requires a private receipt and administrator verification; enabling intake does not approve payment, schedule meetings or claim any provider outcome. Existing drafts, profile prefill and one-consultation-per-account behavior remain.

No new database migration or production DNS change is required. To pause the preview, override INTAKE_ENABLED=false and recreate the web service. Removing the preview overlay restores the basic Compose defaults. Existing consultation/payment records are retained.

For an explicit pause while keeping the tunnel settings, add a separate local Compose override with the following content and append its `-f` option **after** compose.preview.yaml. A shell variable alone does not override that file's literal value.

```yaml
services:
  web:
    environment:
      INTAKE_ENABLED: "false"
```

## Verification

Submission tests cover authenticated success, missing sessions, mismatched email, consent, both partial challenge configurations, paused intake and database errors. Disposable PostgreSQL tests exercise actual consultation transactions, ownership, duplicate prevention and payment state without creating hosted applicants or sending synthetic staff alerts. Browser tests cover equal country counts, filtered result scrolling, pagination and reset. Genuine hosted submission remains an applicant acceptance step; no legal declarations were accepted on an applicant's behalf during QA.
