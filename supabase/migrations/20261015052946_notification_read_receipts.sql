-- A new review result is a new notification, even on the same application.
alter table public.applications add column notification_version uuid not null default gen_random_uuid();
create function private.rotate_application_notification() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.status is distinct from old.status then
  new.notification_version:=gen_random_uuid();
 else
  new.notification_version:=old.notification_version;
 end if;
 return new;
end;
$$;
revoke all on function private.rotate_application_notification() from public,anon,authenticated;
create trigger application_notification_version before update on public.applications
for each row execute function private.rotate_application_notification();

create table public.application_notification_reads (
 user_id uuid not null references public.profiles(id) on delete cascade,
 application_id uuid not null references public.applications(id) on delete cascade,
 notification_version uuid not null,
 read_at timestamptz not null default now(),
 primary key(user_id,application_id,notification_version)
);
create index application_notification_reads_application on public.application_notification_reads(application_id);
alter table public.application_notification_reads enable row level security;
revoke all on public.application_notification_reads from public,anon,authenticated;
grant select on public.application_notification_reads to authenticated;
grant insert(user_id,application_id,notification_version) on public.application_notification_reads to authenticated;
create policy notification_read_own on public.application_notification_reads for select to authenticated
using (user_id=(select auth.uid()));
create policy notification_mark_own on public.application_notification_reads for insert to authenticated
with check (user_id=(select auth.uid()) and exists (
 select 1 from public.applications a where a.id=application_id
 and a.user_id=(select auth.uid()) and a.status in ('approved','rejected')
 and a.notification_version=application_notification_reads.notification_version
));
