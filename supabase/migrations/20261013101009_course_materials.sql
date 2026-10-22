-- Course attachments remain private until their parent course is published.
create function private.valid_course_materials(doc jsonb, resource_id uuid)
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
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg','image/webp')
      or jsonb_typeof(file->'size') is distinct from 'number'
      or coalesce(file->>'size','') !~ '^[0-9]{1,8}$'
      or jsonb_typeof(file->'path') is distinct from 'string'
      or coalesce(file->>'path','') !~ '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}\.(pdf|ppt|pptx|doc|docx|png|jpg|jpeg|webp)$'
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
revoke all on function private.valid_course_materials(jsonb,uuid) from public;
grant execute on function private.valid_course_materials(jsonb,uuid) to authenticated;
alter table public.resources add constraint course_materials_valid
check (kind <> 'course' or private.valid_course_materials(lessons,id));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('course-files','course-files',false,20971520,array['application/pdf','application/vnd.ms-powerpoint',
 'application/vnd.openxmlformats-officedocument.presentationml.presentation','application/msword',
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg','image/webp']);

create policy course_file_upload on storage.objects for insert to authenticated
with check (bucket_id='course-files' and (select private.is_admin())
 and name ~ '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}\.(pdf|ppt|pptx|doc|docx|png|jpg|jpeg|webp)$');

create policy course_file_read on storage.objects for select to anon,authenticated
using (bucket_id='course-files' and ((select private.is_admin()) or exists (
 select 1 from public.resources r
 where r.kind='course' and r.status='published' and r.id::text=split_part(storage.objects.name,'/',1)
 and r.lessons @> jsonb_build_array(jsonb_build_object('files',jsonb_build_array(jsonb_build_object('path',storage.objects.name))))
)));

-- Replacing a course attachment creates a new object; unlinked objects stay
-- administrator-only. No public URL, file deletion or bucket-wide read grant.
