-- A separate editorial choice for the beginner events section.
alter table public.resources add column beginner_recommended boolean not null default false;
alter table public.resources add constraint beginner_events_only
 check (not beginner_recommended or kind='competition');

create or replace function public.protect_resource_flags()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is not null and not private.is_admin() and
   (new.featured is distinct from old.featured or new.kind is distinct from old.kind
    or new.owner_id is distinct from old.owner_id or new.application_enabled is distinct from old.application_enabled
    or new.cover_path is distinct from old.cover_path
    or new.beginner_recommended is distinct from old.beginner_recommended)
 then raise exception 'Editorial fields require administrator access' using errcode='42501'; end if;
 return new;
end $$;
