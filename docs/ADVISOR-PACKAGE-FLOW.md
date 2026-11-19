# Consultation and package workflow

1. The applicant submits the consultation, pays TZS 50,000 and uploads a receipt in Consultations.
2. An admin checks the payment in Payments, then opens the consultation and assigns an active advisor. Messages and meeting requests open after assignment.
3. The applicant can save interests in Applications from the time they submit a consultation. An admin or the assigned advisor recommends a package from the consultation. A recommendation reuses the existing interest and saves the price and details shown to the applicant.
4. The applicant confirms the recommendation, pays the full ISG package fee and uploads its receipt on the application. The admin verifies the payment. The advisor can then start the application and post updates. A package with a zero fee is ready after confirmation.

Enter the package payment instructions under Admin → Settings. The existing consultation payment instructions contain the consultation amount and stay separate. Public Study Paths promotions and private applicant records have separate audiences.

Both receipt types queue a staff alert. A receipt marked by the applicant as a redacted copy can be sent as an attachment to the configured private GREEN-API group. Other receipts and attachment formats the provider explicitly rejects use the signed-in staff link. The integration does not automatically retry an ambiguous attachment request. A provider message ID confirms queue acceptance.

## Rollout and reset

Apply the advisor assignment, application package and package receipt migrations in order before recreating the web and notification containers. Rehearse them with `npm run test:db`. They preserve previous application and quote records. Use a copy of the prior web image for code rollback. If a rollback is needed after applicants use the new stages, retain the new tables and columns, pause writes, and fix forward so payment and receipt state is retained. The previous application does not understand the new stages.

The optional database reset is a separate destructive operation. Confirm the target and scope, pause new submissions and delivery, inventory the private `case-files` and `scholarship-images` buckets, and run the reviewed reset SQL in `scripts/reset-consultations-and-packages.sql`. Remove only objects in these two buckets via the Storage API and verify both the row counts and the object counts. The reset leaves accounts, profiles, role assignments, public promotions, marketing assets, payment instructions and integration settings in place. It does not recall messages already delivered by external providers.
