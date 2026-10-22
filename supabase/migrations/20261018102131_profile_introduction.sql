-- Optional self-introduction; old cards stay valid. Publication and ownership gates are unchanged.
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
 if doc ? 'introduction' and (jsonb_typeof(doc->'introduction') is distinct from 'string' or length(doc->>'introduction')>1500) then return false; end if;
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



create or replace function private.member_profile(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare person public.profiles%rowtype; modules jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid()) then
  raise exception 'Member sign-in required' using errcode='42501';
 end if;
 select * into person from public.profiles where id=p_user_id;
 if not found or (not (person.showcase->>'published')::boolean and person.id<>auth.uid()) then return null; end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',b->>'id','kind',b->>'kind','title',b->>'title','body',b->>'body','detail',b->>'detail',
  'url',b->>'url','date',b->>'date','imagePath',b->>'imagePath','visible',true,'wide',(b->>'wide')::boolean
 ) order by ordinal),'[]'::jsonb) into modules
 from jsonb_array_elements(person.showcase->'blocks') with ordinality as items(b,ordinal)
 where (b->>'visible')::boolean;
 return jsonb_build_object('id',person.id,'name',person.name,'school',person.school,
  'bio',person.bio,'avatar_url',person.avatar_url,'interests',person.interests,
  'showcase',jsonb_build_object('version',1,'theme',person.showcase->>'theme',
   'status',person.showcase->>'status','introduction',coalesce(person.showcase->>'introduction',''),'tags',person.showcase->'tags','blocks',modules,'published',(person.showcase->>'published')::boolean));
end $$;
revoke all on function private.member_profile(uuid) from public,anon;
grant execute on function private.member_profile(uuid) to authenticated;
