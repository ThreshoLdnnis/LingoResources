-- Fixed short-code inventory. Only an administrator may retrieve complete codes.
alter table private.beta_invites add column display_code text
 check (display_code is null or display_code ~ '^[1-9][0-9]{7}$');
create unique index beta_invites_display_code on private.beta_invites(display_code)
 where display_code is not null;
-- No plaintext-column SELECT grant to anon/authenticated. A narrowly scoped
-- private helper is necessary to read it after checking the trusted admin role.
create function private.admin_beta_invites()
returns table (id uuid,code_hint text,code text,label text,expires_at timestamptz,enabled boolean,used_at timestamptz,created_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
begin
 if auth.uid() is null or not private.is_admin() then
  raise exception 'Administrator access required' using errcode = '42501';
 end if;
 return query select i.id,i.code_hint,i.display_code,i.label,i.expires_at,i.enabled,i.used_at,i.created_at
 from private.beta_invites i order by i.created_at desc,i.id;
end;
$$;
revoke all on function private.admin_beta_invites() from public,anon,authenticated;
grant execute on function private.admin_beta_invites() to authenticated;

create function public.list_beta_invites_v2()
returns table (id uuid,code_hint text,code text,label text,expires_at timestamptz,enabled boolean,used_at timestamptz,created_at timestamptz)
language sql security invoker set search_path = ''
as $$ select * from private.admin_beta_invites(); $$;
revoke all on function public.list_beta_invites_v2() from public,anon;
grant execute on function public.list_beta_invites_v2() to authenticated;

-- Compatibility for older open browser tabs: the old generate button now
-- retrieves the current fixed batch. Reloads and repeated clicks insert nothing.
create or replace function public.generate_beta_invites(quantity integer default 50, valid_days integer default 365, batch_label text default '长期内测')
returns table (id uuid,code text,expires_at timestamptz)
language plpgsql security invoker set search_path = ''
as $$
begin
 if auth.uid() is null or not private.is_admin() then
  raise exception 'Administrator access required' using errcode = '42501';
 end if;
 return query select i.id,i.code,i.expires_at
 from private.admin_beta_invites() i where i.code is not null
 order by i.created_at desc,i.id;
end;
$$;

create or replace function public.set_beta_invite_enabled(invite_id uuid, invite_enabled boolean)
returns void language plpgsql security invoker set search_path = ''
as $$
begin
 if auth.uid() is null or not private.is_admin() then
  raise exception 'Administrator access required' using errcode = '42501';
 end if;
 if invite_enabled is null then raise exception 'Invalid invitation state'; end if;
 update private.beta_invites set enabled = invite_enabled
 where id = invite_id and used_at is null and code_hint like '8D-%';
 if not found then raise exception 'Historical or used invitation cannot be changed'; end if;
end;
$$;

-- Full-width digits and pasted separators normalize identically on both sides.
create or replace function private.beta_invite_hash(invite_code text)
returns text language sql immutable set search_path = ''
as $$
 select encode(sha256(convert_to(regexp_replace(upper(translate(coalesce(invite_code,''),'０１２３４５６７８９','0123456789')),'[[:space:]-]','','g'),'UTF8')),'hex');
$$;

alter table private.beta_invites add constraint beta_invite_display_matches_hash
 check (display_code is null or code_hash = private.beta_invite_hash(display_code));
