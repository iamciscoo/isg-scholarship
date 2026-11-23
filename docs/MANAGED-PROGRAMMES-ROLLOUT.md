# Managed programmes rollout

## Behaviour

The admin entry is **Scholar packages and programmes**, with separate package and programme tabs. Programme records use the existing public study_promotions table and its administrator-only save/delete functions. Public programme data does not read private scholarship packages or applicant data.

Migration `202611230056_managed_programmes.sql` adds explicit destinations and a unique catalogue key. It copies all 60 original editorial guides verbatim, including their levels, fields, descriptions and images. Each retains the four destinations offered by the original shared catalogue: Russia, United Kingdom, Germany and Canada. The original copy is archived in a test fixture for migration verification, with no hardcoded production fallback. Existing authored promotions are retained and receive their original destination in the new array.

Published programmes supply both Study Paths and the homepage destination links. Unpublishing/deleting the last programme for a country, or removing that country from all published programmes, removes its homepage link. The public destination picker shows published countries; direct links for a removed country return an honest empty result.

The five consultation choices are New, Under review, Needs information, Completed and Closed. Legacy qualified/converted states display as Completed; not_currently_eligible displays as Closed. Filters include the legacy equivalents. Old enum values, notes and audit history are retained; a trigger normalizes older clients' future writes. Payment and application state gates are unchanged.

The compact public filter row uses adjacent study level/field selects and a flag destination dropdown. The selected-country notice is removed. Delegated pointer feedback covers links, buttons and menus without delaying their actions; reduced-motion preferences keep visible feedback without scaling or menu animation.

## Deployment order

Migration 056 was applied transactionally through the authorized Supabase SQL dashboard, together with its migration-history entry. Hosted verification confirmed 60 published legacy guides, the four original destinations, and retained business counts: 1 consultation, 0 applications and 1 file. Browser access was recovered by restoring Chrome to the foreground. No environment file was changed. The application can now be merged into production main.

1. Verify hosted migration history through 055 and take the normal hosting backup.
2. Apply migration 056 through the authorized Supabase migration workflow. For the SQL dashboard, apply its contents and record version `202611230056` in migration history inside one transaction. It performs additive DDL, retains existing records, and seeds only existing public editorial content.
3. Check that `destinations` and `catalogue_key` exist, 60 legacy-guide keys were inserted, existing promotions retain their values, and applicant/staff authorization checks hold.
4. Merge this feature branch into main, let Vercel deploy, and verify both public programme filters and admin programme save/publication controls.

The old save RPC signature and single-destination payload continue to work after migration 056. No enum is dropped or renamed. During the short schema-first rollout, the old site may also list the imported guides in its promotions section.

## Rollback

Prefer a forward repair. Keep the additive schema, programme rows, country assignments, audit history and RLS. Do not drop columns or delete programme/applicant records. If the old application must be restored, first snapshot publication states for rows with catalogue_key and temporarily unpublish those imported rows to avoid the old hardcoded guides appearing twice. Retain that snapshot for restoration; user-authored rows stay intact. The old application/RPC contract is covered by the database tests.

## Verification

- Unit tests check all 60 original guides and images against the migration, five-stage labels/legacy mappings, destination filtering, and every locale dictionary.
- Disposable PostgreSQL tests exercise all migrations and authorization suites, published/draft visibility, admin save/delete, duplicate/empty country rejection, old RPC compatibility, old stage writes and last-country disappearance.
- Isolated production-browser tests cover 320/390/768/1440 layouts, flags, filters/pagination, an accessibility scan, reduced motion, programme create/edit/cancel/unpublish/delete, homepage availability and five stage options.
- Real provider delivery is disabled for local browser fixtures. No live applicant is created, modified or reset.
