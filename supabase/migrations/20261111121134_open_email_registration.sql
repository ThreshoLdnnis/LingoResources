-- Registration is open to every email/password account. Keep historical
-- invitation records and administrator-only audit RPCs intact.
drop trigger if exists require_beta_invite on auth.users;

-- Older cached clients may still send an invitation. Ignore and remove that
-- obsolete field; it must neither reject registration nor consume an old code.
create function private.sanitize_signup_metadata()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_table_schema <> 'auth' or tg_table_name <> 'users' or tg_op <> 'INSERT' then
  raise exception 'Invalid signup trigger context';
 end if;
 new.raw_user_meta_data := coalesce(new.raw_user_meta_data,'{}'::jsonb) - 'beta_invite_code';
 return new;
end;
$$;
revoke all on function private.sanitize_signup_metadata() from public,anon,authenticated;
create trigger sanitize_signup_metadata before insert on auth.users
 for each row execute function private.sanitize_signup_metadata();
