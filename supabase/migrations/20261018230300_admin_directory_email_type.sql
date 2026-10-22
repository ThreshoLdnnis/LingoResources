-- Supabase Auth stores email as varchar; PL/pgSQL RETURNS TABLE needs an
-- explicit text cast. Preserve the exact two-field, admin-only contract.
create or replace function private.admin_user_directory()
returns table (nickname text,email text)
language plpgsql stable security definer set search_path = ''
as $$
begin
 if auth.uid() is null or not private.is_admin() then
  raise exception 'Administrator access required' using errcode='42501';
 end if;
 return query
 select coalesce(nullif(p.name,''),'未设置昵称'),coalesce(u.email,'')::text
 from auth.users u left join public.profiles p on p.id=u.id
 order by u.created_at desc,u.id;
end;
$$;
