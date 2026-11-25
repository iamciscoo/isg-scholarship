-- A consultation is under review from the moment it arrives, so "New" is no longer a stage.
alter table public.leads alter column stage set default 'under_review';
update public.leads set stage = 'under_review' where stage = 'new';
