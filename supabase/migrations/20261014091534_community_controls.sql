-- Site registration is an editorial opt-in; imported third-party opportunities stay external.
alter table public.resources add column application_enabled boolean not null default false;
alter table public.resources add constraint resource_application_kind
 check (not application_enabled or kind in ('competition','project'));
create or replace function public.protect_resource_flags()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is not null and not private.is_admin() and
   (new.featured is distinct from old.featured or new.kind is distinct from old.kind
    or new.owner_id is distinct from old.owner_id or new.application_enabled is distinct from old.application_enabled)
 then raise exception 'Editorial fields require administrator access' using errcode='42501'; end if;
 return new;
end $$;
drop policy resource_create on public.resources;
create policy resource_create on public.resources for insert to authenticated with check (
 private.is_admin() or (kind='project' and owner_id=(select auth.uid()) and not featured and not application_enabled)
);

-- Keep deleted posts out of the public feed, without cascading away applications.
alter table public.posts add column avatar_url text;
alter table public.posts add column updated_at timestamptz not null default now();
alter table public.posts add column deleted_at timestamptz;
update public.posts p set avatar_url=u.avatar_url,author=u.name,avatar=left(u.name,1)
 from public.profiles u where u.id=p.owner_id;
create index posts_public_created on public.posts(created_at desc,id desc) where deleted_at is null;
drop policy posts_read on public.posts;
create policy posts_read on public.posts for select to anon,authenticated
 using (deleted_at is null or owner_id=(select auth.uid()));
create policy posts_update_own on public.posts for update to authenticated
 using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
grant update(title,body,tags,type,deleted_at,author,avatar,avatar_url) on public.posts to authenticated;

create table public.post_comments (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.posts(id) on delete cascade,
 owner_id uuid not null references public.profiles(id) on delete cascade,
 author text not null default '',avatar text not null default '',avatar_url text,
 body text not null check (char_length(btrim(body)) between 1 and 1500),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 deleted_at timestamptz
);
create index post_comments_visible on public.post_comments(post_id,created_at desc,id desc) where deleted_at is null;
create index post_comments_owner on public.post_comments(owner_id);
alter table public.post_comments enable row level security;
create policy comments_read on public.post_comments for select to anon,authenticated
 using ((deleted_at is null or owner_id=(select auth.uid())) and exists (
  select 1 from public.posts p where p.id=post_id and p.deleted_at is null
 ));
create policy comments_create on public.post_comments for insert to authenticated
 with check (owner_id=(select auth.uid()) and deleted_at is null and exists (
  select 1 from public.posts p where p.id=post_id and p.deleted_at is null
 ));
create policy comments_update_own on public.post_comments for update to authenticated
 using (owner_id=(select auth.uid()) and exists(select 1 from public.posts p where p.id=post_id and p.deleted_at is null))
 with check (owner_id=(select auth.uid()) and exists(select 1 from public.posts p where p.id=post_id and p.deleted_at is null));
revoke all on public.post_comments from public,anon,authenticated;
grant select on public.post_comments to anon,authenticated;
grant insert on public.post_comments to authenticated;
grant update(body,deleted_at,author,avatar,avatar_url) on public.post_comments to authenticated;

-- Metadata always comes from the row owner's profile; writable snapshots cannot impersonate someone else.
-- Invoker rights: no public profile table access and no new SECURITY DEFINER endpoint.
create function private.stamp_community_identity() returns trigger
language plpgsql security invoker set search_path='' as $$
declare person public.profiles%rowtype;
begin
 if auth.uid() is not null and new.owner_id is distinct from auth.uid() then
  raise exception 'Only the author may change community content' using errcode='42501';
 end if;
 if tg_op='UPDATE' then
  if new.id is distinct from old.id or new.owner_id is distinct from old.owner_id
     or new.created_at is distinct from old.created_at then
   raise exception 'Community ownership is immutable' using errcode='42501';
  end if;
  if tg_table_name='post_comments' then
   if new.post_id is distinct from old.post_id then
    raise exception 'Comment target is immutable' using errcode='42501';
   end if;
  end if;
  new.updated_at:=old.updated_at;
  if new.body is distinct from old.body then new.updated_at:=now(); end if;
  if tg_table_name='posts' then
   if new.title is distinct from old.title or new.tags is distinct from old.tags or new.type is distinct from old.type then
    new.updated_at:=now();
   end if;
  end if;
  if old.deleted_at is null and new.deleted_at is not null then new.deleted_at:=now(); end if;
 else
  new.created_at:=now();new.updated_at:=now();new.deleted_at:=null;
  if tg_table_name='posts' then new.date:=(now() at time zone 'Asia/Shanghai')::date; end if;
 end if;
 if new.owner_id is not null then
  select * into person from public.profiles where id=new.owner_id;
  if not found then raise exception 'Author profile is unavailable' using errcode='42501'; end if;
  new.author:=person.name;new.avatar:=left(person.name,1);new.avatar_url:=person.avatar_url;
 end if;
 new.body:=btrim(new.body);
 return new;
end $$;
revoke all on function private.stamp_community_identity() from public,anon,authenticated;
create trigger posts_identity before insert or update on public.posts
 for each row execute function private.stamp_community_identity();
create trigger comments_identity before insert or update on public.post_comments
 for each row execute function private.stamp_community_identity();

create function private.sync_community_identity() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.name is distinct from old.name or new.avatar_url is distinct from old.avatar_url then
  update public.posts set author=new.name,avatar=left(new.name,1),avatar_url=new.avatar_url where owner_id=new.id;
  update public.post_comments set author=new.name,avatar=left(new.name,1),avatar_url=new.avatar_url where owner_id=new.id;
 end if;
 return new;
end $$;
revoke all on function private.sync_community_identity() from public,anon,authenticated;
create trigger community_profile_identity after update of name,avatar_url on public.profiles
 for each row execute function private.sync_community_identity();

-- Neither a hidden form nor a forged API request can register for a disabled resource.
drop policy application_create on public.applications;
create policy application_create on public.applications for insert to authenticated with check (
 user_id=(select auth.uid()) and status='pending' and (
  exists(select 1 from public.resources r where r.id=resource_id and r.application_enabled
   and r.status='published' and r.kind in ('competition','project')
   and (r.deadline is null or r.deadline >= (now() at time zone 'Asia/Shanghai')::date))
  or exists(select 1 from public.posts p where p.id=post_id and p.type='recruitment'
   and p.deleted_at is null and p.owner_id is distinct from (select auth.uid()))
 )
);
notify pgrst,'reload schema';
