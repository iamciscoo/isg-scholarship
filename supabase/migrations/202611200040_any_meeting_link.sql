-- Admins may meet on Zoom, Teams or any other service, not only Google Meet.
alter table public.consultation_meetings drop constraint consultation_meetings_meet_url_check;
alter table public.consultation_meetings
  add constraint consultation_meetings_meet_url_check check (meet_url ~ '^https://[^[:space:]]+$');