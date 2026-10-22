-- Private inventory. Plaintext codes are returned only once to the administrator.
create table private.beta_invites (
 id uuid primary key default gen_random_uuid(),
 code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
 code_hint text not null,
 label text not null check (char_length(label) between 1 and 80),
 expires_at timestamptz not null,
 enabled boolean not null default true,
 used_at timestamptz,
 used_by uuid references auth.users(id) on delete set null deferrable initially deferred,
 created_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(),
 check (expires_at > created_at)
);
create index beta_invites_used_by on private.beta_invites(used_by);
create index beta_invites_created_by on private.beta_invites(created_by);
alter table private.beta_invites enable row level security;
revoke all on private.beta_invites from public, anon, authenticated;
grant select (id,code_hint,label,expires_at,enabled,used_at,created_at,created_by) on private.beta_invites to authenticated;
grant insert (code_hash,code_hint,label,expires_at,created_by) on private.beta_invites to authenticated;
grant update (enabled) on private.beta_invites to authenticated;
create policy beta_invites_read on private.beta_invites for select to authenticated using (private.is_admin());
create policy beta_invites_create on private.beta_invites for insert to authenticated with check (private.is_admin() and created_by = auth.uid());
create policy beta_invites_update on private.beta_invites for update to authenticated using (private.is_admin()) with check (private.is_admin());

create function private.beta_invite_hash(invite_code text)
returns text language sql immutable set search_path = ''
as $$
 select encode(sha256(convert_to(regexp_replace(upper(coalesce(invite_code,'')),'[[:space:]-]','','g'),'UTF8')),'hex');
$$;
revoke all on function private.beta_invite_hash(text) from public;
grant execute on function private.beta_invite_hash(text) to authenticated;

create function public.generate_beta_invites(quantity integer default 50, valid_days integer default 30, batch_label text default '首批内测')
returns table (id uuid, code text, expires_at timestamptz)
language plpgsql security invoker set search_path = ''
as $$
declare token text; generated_id uuid; deadline timestamptz;
begin
 if auth.uid() is null or not private.is_admin() then
  raise exception 'Administrator access required' using errcode = '42501';
 end if;
 if quantity is null or quantity < 1 or quantity > 100 or valid_days is null or valid_days < 1 or valid_days > 90
 or batch_label is null or char_length(trim(batch_label)) not between 1 and 80 then
  raise exception 'Invalid invitation batch';
 end if;
 deadline := now() + make_interval(days => valid_days);
 for n in 1..quantity loop
  token := upper(replace(gen_random_uuid()::text,'-',''));
  code := 'ZM-' || substring(token from 1 for 8) || '-' || substring(token from 9 for 8) || '-' || substring(token from 17 for 8) || '-' || substring(token from 25 for 8);
  insert into private.beta_invites as i(code_hash,code_hint,label,expires_at,created_by)
  values(private.beta_invite_hash(code),'ZM-' || left(token,4) || '…' || right(token,4),trim(batch_label),deadline,auth.uid())
  returning i.id into generated_id;
  id := generated_id; expires_at := deadline; return next;
 end loop;
end;
$$;
revoke all on function public.generate_beta_invites(integer,integer,text) from public;
grant execute on function public.generate_beta_invites(integer,integer,text) to authenticated;

create function public.list_beta_invites()
returns table (id uuid,code_hint text,label text,expires_at timestamptz,enabled boolean,used_at timestamptz,created_at timestamptz)
language plpgsql security invoker set search_path = ''
as $$
begin
 if auth.uid() is null or not private.is_admin() then
  raise exception 'Administrator access required' using errcode = '42501';
 end if;
 return query select i.id,i.code_hint,i.label,i.expires_at,i.enabled,i.used_at,i.created_at
 from private.beta_invites i order by i.created_at desc,i.id;
end;
$$;
revoke all on function public.list_beta_invites() from public;
grant execute on function public.list_beta_invites() to authenticated;

create function public.set_beta_invite_enabled(invite_id uuid, invite_enabled boolean)
returns void language plpgsql security invoker set search_path = ''
as $$
begin
 if auth.uid() is null or not private.is_admin() then
  raise exception 'Administrator access required' using errcode = '42501';
 end if;
 if invite_enabled is null then raise exception 'Invalid invitation state'; end if;
 update private.beta_invites set enabled = invite_enabled where id = invite_id and used_at is null;
 if not found then raise exception 'Invitation unavailable or already used'; end if;
end;
$$;
revoke all on function public.set_beta_invite_enabled(uuid,boolean) from public;
grant execute on function public.set_beta_invite_enabled(uuid,boolean) to authenticated;

-- Auth creates accounts without an existing auth.uid(). This internal trigger has
-- no RPC access; the atomic update and deferred FK live in the signup transaction.
create function private.consume_beta_invite()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare claimed_id uuid;
begin
 if tg_table_schema <> 'auth' or tg_table_name <> 'users' or tg_op <> 'INSERT' then
  raise exception 'Invalid invitation trigger context';
 end if;
 update private.beta_invites
 set used_at = now(), used_by = new.id
 where code_hash = private.beta_invite_hash(new.raw_user_meta_data->>'beta_invite_code')
 and enabled and used_at is null and expires_at > now()
 returning id into claimed_id;
 if claimed_id is null then
  raise exception 'BETA_INVITE_INVALID: a valid unused beta invitation is required' using errcode = 'P0001';
 end if;
 new.raw_user_meta_data := coalesce(new.raw_user_meta_data,'{}'::jsonb) - 'beta_invite_code';
 return new;
end;
$$;
revoke all on function private.consume_beta_invite() from public, anon, authenticated;
create trigger require_beta_invite before insert on auth.users for each row execute function private.consume_beta_invite();
