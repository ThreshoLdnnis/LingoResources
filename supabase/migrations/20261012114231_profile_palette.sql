-- The existing profiles table stays owner-scoped. Only an allowlisted,
-- opt-in presentation document is returned to other signed-in members.
create or replace function private.valid_profile_showcase(doc jsonb, owner_id uuid)
returns boolean language plpgsql immutable set search_path = '' as $$
declare b jsonb; tag jsonb; field text; maximum integer; seen text[] := '{}';
begin
 if jsonb_typeof(doc) is distinct from 'object' or octet_length(doc::text) > 65536 then return false; end if;
 if jsonb_typeof(doc->'version') is distinct from 'number' or doc->>'version' is distinct from '1'
    or doc->>'theme' is null or doc->>'theme' not in ('rose','orange','sky','sand','lavender','sage')
    or jsonb_typeof(doc->'published') is distinct from 'boolean'
    or jsonb_typeof(doc->'status') is distinct from 'string' or length(doc->>'status') > 60
    or jsonb_typeof(doc->'tags') is distinct from 'array'
    or jsonb_typeof(doc->'blocks') is distinct from 'array' then return false; end if;
 if jsonb_array_length(doc->'tags') > 12 or jsonb_array_length(doc->'blocks') > 24 then return false; end if;
 for tag in select value from jsonb_array_elements(doc->'tags') loop
  if jsonb_typeof(tag) <> 'string' or length(tag #>> '{}') > 24 then return false; end if;
 end loop;
 for b in select value from jsonb_array_elements(doc->'blocks') loop
  if jsonb_typeof(b) is distinct from 'object' or b->>'kind' is null or b->>'kind' not in ('note','link','image','award','education','work','highlight','heading')
     or coalesce(b->>'id','') !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
     or b->>'id' = any(seen)
     or jsonb_typeof(b->'visible') is distinct from 'boolean' or jsonb_typeof(b->'wide') is distinct from 'boolean' then return false; end if;
  seen := array_append(seen,b->>'id');
  foreach field in array array['title','body','detail','url','date','imagePath'] loop
   maximum := case field when 'title' then 90 when 'body' then 1500 when 'detail' then 100 when 'url' then 2048 when 'date' then 10 else 200 end;
   if jsonb_typeof(b->field) is distinct from 'string' or length(b->>field)>maximum then return false; end if;
  end loop;
  if length(btrim(b->>'title'))=0 or ((b->>'url')<>'' and (b->>'url')!~'^https?://[^[:space:]]+$') then return false; end if;
  if b->>'kind'='link' and b->>'url'='' then return false; end if;
  if b->>'date'<>'' and b->>'date'!~'^\d{4}-\d{2}-\d{2}$' then return false; end if;
  if b->>'imagePath'<>'' and (left(b->>'imagePath',37)<>owner_id::text||'/'
     or b->>'imagePath'!~'^[a-f0-9-]{36}/[a-f0-9-]{36}\.(png|jpg|webp)$') then return false; end if;
  if b->>'kind'='image' and b->>'imagePath'='' then return false; end if;
 end loop;
 return true;
end $$;
revoke all on function private.valid_profile_showcase(jsonb,uuid) from public,anon;
grant execute on function private.valid_profile_showcase(jsonb,uuid) to authenticated;


