-- Manual reset. Obtain explicit confirmation for the target database.
-- Stop intake and notification delivery, and handle case-files and scholarship-images
-- through the Storage API. Do not delete storage.objects directly.
begin;
lock table public.eligibility_assessments, public.consultation_cases, public.consultation_drafts,
  public.case_files, public.study_applications, private.opportunities, public.service_packages
  in share row exclusive mode;

delete from public.account_notifications
  where author_id is null and link ~ '^/admin/(consultations|payments|applications|receipts/|declarations/)';
delete from private.integration_events where event ~
  '^(consultation\.|lead\.updated$|payment\.|meeting\.|application\.|package\.)';
delete from private.notification_outbox
  where assessment_id is not null
     or event in ('payment_update','meeting_scheduled','meeting_completed','meeting_cancelled',
       'consultation_reply','document_request','document_update','application_update',
       'opportunity_proposed','package_accepted','advisor_assigned','package_recommended','package_payment_update');
delete from public.audit_logs where action in (
  'assessment.created','lead.reviewed','advisor.assigned','case.file_uploaded','payment.reviewed',
  'meeting.scheduled','meeting.updated','application.declaration_accepted','document.requested',
  'document.reviewed','opportunity.saved','package.saved','package.quote_accepted','scholarship_package.saved'
);
delete from public.consultation_cases;
delete from public.consultation_drafts;
delete from public.eligibility_assessments;
delete from private.opportunities;
delete from public.service_packages;
commit;
