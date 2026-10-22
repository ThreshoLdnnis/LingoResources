-- HTML lessons use the existing private, member-only attachment pipeline.
-- Author scripts execute only inside the frontend's opaque-origin sandbox.
create or replace function private.valid_course_materials(doc jsonb, resource_id uuid)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
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
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg','image/webp','application/zip','text/html')
      or jsonb_typeof(file->'size') is distinct from 'number'
      or coalesce(file->>'size','') !~ '^[0-9]{1,8}$'
      or jsonb_typeof(file->'path') is distinct from 'string'
      or coalesce(file->>'path','') !~ '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}\.(pdf|ppt|pptx|doc|docx|png|jpg|jpeg|webp|zip|html|htm)$'
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

update storage.buckets set allowed_mime_types=array_append(allowed_mime_types,'text/html')
 where id='course-files' and not ('text/html'=any(allowed_mime_types));
alter policy course_file_upload on storage.objects
 with check (bucket_id='course-files' and (select private.is_admin())
 and name ~ '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}\.(pdf|ppt|pptx|doc|docx|png|jpg|jpeg|webp|zip|html|htm)$');
