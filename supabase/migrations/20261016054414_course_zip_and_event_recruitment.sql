-- Add ZIP to the existing private course attachment pipeline.
create or replace function private.valid_course_materials(doc jsonb, resource_id uuid)
returns boolean language plpgsql immutable set search_path = '' as $$
declare lesson jsonb; file jsonb;
begin
 if jsonb_typeof(doc) is distinct from 'array' then return false; end if;
 for lesson in select value from jsonb_array_elements(doc) loop
  if lesson ? 'files' then
   if jsonb_typeof(lesson->'files') is distinct from 'array' then return false; end if;
   if jsonb_array_length(lesson->'files') > 8 then return false; end if;
   for file in select value from jsonb_array_elements(lesson->'files') loop
    if jsonb_typeof(file) is distinct from 'object'
      or jsonb_typeof(file->'name') is distinct from 'string'
      or coalesce(char_length(file->>'name'),0) not between 1 and 140
      or jsonb_typeof(file->'mime') is distinct from 'string'
      or coalesce(file->>'mime','') not in ('application/pdf','application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg','image/webp','application/zip')
      or jsonb_typeof(file->'size') is distinct from 'number'
      or coalesce(file->>'size','') !~ '^[0-9]{1,8}$'
      or jsonb_typeof(file->'path') is distinct from 'string'
      or coalesce(file->>'path','') !~ '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}\.(pdf|ppt|pptx|doc|docx|png|jpg|jpeg|webp|zip)$'
      or split_part(file->>'path','/',1) is distinct from resource_id::text
      or split_part(file->>'path','/',2) is distinct from lesson->>'id'
    then return false; end if;
    if (file->>'size')::integer not between 1 and 20971520 then return false; end if;
   end loop;
  end if;
 end loop;
 return true;
end;
$$;

update storage.buckets set allowed_mime_types=array_append(allowed_mime_types,'application/zip')
 where id='course-files' and not ('application/zip'=any(allowed_mime_types));
alter policy course_file_upload on storage.objects
 with check (bucket_id='course-files' and (select private.is_admin())
 and name ~ '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}\.(pdf|ppt|pptx|doc|docx|png|jpg|jpeg|webp|zip)$');

-- Covers stay private until the administrator publishes the linked event.
alter table public.resources add column cover_path text;
alter table public.resources add constraint competition_cover_valid
 check (cover_path is null or (kind='competition' and cover_path ~ '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}\.(png|jpg|jpeg|webp)$'
 and split_part(cover_path,'/',1)=id::text));
create or replace function public.protect_resource_flags()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is not null and not private.is_admin() and
   (new.featured is distinct from old.featured or new.kind is distinct from old.kind
    or new.owner_id is distinct from old.owner_id or new.application_enabled is distinct from old.application_enabled
    or new.cover_path is distinct from old.cover_path)
 then raise exception 'Editorial fields require administrator access' using errcode='42501'; end if;
 return new;
end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('competition-covers','competition-covers',false,5242880,array['image/png','image/jpeg','image/webp']);
create policy competition_cover_upload on storage.objects for insert to authenticated
 with check(bucket_id='competition-covers' and (select private.is_admin())
 and name ~ '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}\.(png|jpg|jpeg|webp)$');
create policy competition_cover_read on storage.objects for select to anon,authenticated
 using(bucket_id='competition-covers' and ((select private.is_admin()) or exists(
  select 1 from public.resources r where r.kind='competition' and r.status='published' and r.cover_path=storage.objects.name
  and r.id::text=split_part(storage.objects.name,'/',1)
 )));

-- A soft event reference preserves recruitment conversations if an event is removed.
-- Validate new references; updates to the post body keep their original association.
alter table public.posts add column resource_id uuid;
create index posts_event_reference on public.posts(resource_id) where resource_id is not null;
create function private.validate_post_event() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.resource_id is null then return new; end if;
 if tg_op='UPDATE' and new.resource_id is not distinct from old.resource_id then return new; end if;
 if not exists(select 1 from public.resources r where r.id=new.resource_id and r.kind='competition' and r.status='published')
 then raise exception 'Only published competitions can be shared' using errcode='23514'; end if;
 return new;
end $$;
revoke all on function private.validate_post_event() from public,anon,authenticated;
create trigger posts_event_reference before insert or update of resource_id on public.posts
 for each row execute function private.validate_post_event();
