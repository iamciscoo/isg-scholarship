-- Existing declarations remain readable. New declarations must include a guardian date of birth.
alter table public.application_declarations
  add constraint application_declarations_guardian_dob_required
  check (nullif(data->>'guardianDob','') is not null) not valid;

-- Direct uploads cross the platform's body-size limit without exposing unvalidated files.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('case-pdf-staging','case-pdf-staging',false,5242880,array['application/pdf']);

create function public.expired_case_pdf_uploads() returns setof text
language sql stable security definer set search_path='' as $$
  select name from storage.objects
  where bucket_id='case-pdf-staging' and created_at < now()-interval '3 hours'
  order by created_at
  limit 100
$$;
revoke all on function public.expired_case_pdf_uploads() from public,anon,authenticated;
grant execute on function public.expired_case_pdf_uploads() to service_role;
