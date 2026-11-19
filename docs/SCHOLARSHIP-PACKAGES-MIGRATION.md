# Scholarship package rollout

Migration 20261119222344 adds package support, a fee and a private image reference to the existing opportunity table. Application IDs and the previous quote and application records stay in place. New proposals store the full package fee, support and image with the application. The TZS 50,000 consultation stays separate. Previously priced standalone quotes are kept as history. Legacy opportunities can be edited in Scholarship packages and need an explicit fee before they can be shared again.

## Apply and verify

Run the disposable database suite before applying the migration. It rehearses an upgrade with accepted quotes and applications already present, then checks saved fees, image access, applicant approval and role changes. Check hosted migration history and record the current catalogue, quote and application counts. Apply the migration in one transaction, deploy the matching web and notification containers, and check that the counts are preserved and the image bucket is private.

Upload a package image through the admin form. The server verifies and re-encodes it to WebP. The private image endpoint checks the current account and only serves images attached to an accessible package or application. Public Study Paths promotions use the existing marketing image gallery.

## Roll back

Keep migration 022’s data and storage bucket during recovery, since an application may reference an uploaded image. If the admin or applicant app needs to be rolled back temporarily, use the prior web image and restore the previous definitions of `staff_opportunity_choices()` (migration 018) and `propose_application(uuid,uuid)` (migration 019) with `CREATE OR REPLACE`. Restore authenticated execute on `save_opportunity(uuid,jsonb)` and `save_service_package(uuid,text,text,integer,boolean,boolean)` only if the old admin editors are needed. Keep the retired `accept_service_package(uuid,timestamptz)` grant disabled to honor the separate consultation fee decision. Prefer fixing forward so new images and exact package fees remain visible. Record a corrective migration for persistent database changes.
