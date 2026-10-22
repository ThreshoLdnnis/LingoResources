-- Keep the RLS role check outside the exposed Data API schema.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

-- Moving the existing function preserves policy dependencies.
alter function public.is_admin() set schema private;
create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
 select auth.uid() is not null and exists (
  select 1 from public.profiles where id = auth.uid() and role = 'admin'
 );
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

-- PL/pgSQL resolves this reference at runtime, unlike policy dependencies.
create or replace function public.protect_resource_flags()
returns trigger language plpgsql set search_path = ''
as $$
begin
 if auth.uid() is not null and not private.is_admin() and
   (new.featured is distinct from old.featured or new.kind is distinct from old.kind or new.owner_id is distinct from old.owner_id)
 then raise exception 'Editorial fields require administrator access'; end if;
 return new;
end;
$$;

-- Public avatar URLs remain readable; file listings are scoped to the owner.
drop policy avatar_read on storage.objects;
create policy avatar_read on storage.objects for select to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
