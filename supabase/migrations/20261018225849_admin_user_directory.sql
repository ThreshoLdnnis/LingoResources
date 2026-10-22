-- Read-only directory for the platform owner. No Auth table grants or public
-- profile-policy changes: only these two fields leave the private admin helper.
create function private.admin_user_directory()
returns table (nickname text,email text)
language plpgsql stable security definer set search_path = ''
as $$
begin
 if auth.uid() is null or not private.is_admin() then
  raise exception 'Administrator access required' using errcode='42501';
 end if;
 return query
 select coalesce(nullif(p.name,''),'未设置昵称'),coalesce(u.email,'')
 from auth.users u left join public.profiles p on p.id=u.id
 order by u.created_at desc,u.id;
end;
$$;
revoke all on function private.admin_user_directory() from public,anon,authenticated;
grant execute on function private.admin_user_directory() to authenticated;

create function public.list_registered_users()
returns table (nickname text,email text)
language sql stable security invoker set search_path = ''
as $$ select * from private.admin_user_directory(); $$;
revoke all on function public.list_registered_users() from public,anon,authenticated;
grant execute on function public.list_registered_users() to authenticated;
