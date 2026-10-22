-- Growth OS · PostgreSQL / Supabase schema. Execute in a new Supabase project.
begin;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null default '初入宗门的你' check (char_length(name) between 1 and 30),
 school text not null default '大学生 / 成长探索者',
 bio text not null default '保持好奇，认真做成一件小事。',
 interests text[] not null default '{}',
 avatar_url text,
 role text not null default 'user' check (role in ('user','admin')),
 created_at timestamptz not null default now()
);
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,name) values(new.id,coalesce(nullif(left(new.raw_user_meta_data->>'name',30),''),'初入宗门的你'));
 return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon,authenticated;
revoke all on function public.handle_new_user() from public;
create table public.resources (
 id uuid primary key default gen_random_uuid(),
 kind text not null check (kind in ('competition','internship','tool','course','project')),
 title text not null check (char_length(title) between 1 and 80),
 subtitle text not null check (char_length(subtitle) <=150),
 description text not null check (char_length(description) <=6000),
 org text not null, tags text[] not null default '{}', location text not null,
 deadline date, featured boolean not null default false,
 status text not null default 'published' check(status in ('published','draft')),
 tone text not null default 'pink' check(tone in ('pink','purple','green','blue','yellow','neutral')),
 mark text not null default '项', meta text not null default '开放探索',
 url text check(url is null or url ~ '^https?://'),
 lessons jsonb not null default '[]' check(jsonb_typeof(lessons)='array'),
 owner_id uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now()
);
create index resources_discovery on public.resources(status,kind,featured,deadline);
create index resources_owner on public.resources(owner_id);
create table public.posts (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid references public.profiles(id) on delete cascade,
 author text not null, avatar text not null, title text not null check(char_length(title) between 1 and 100),
 body text not null check(char_length(body) between 20 and 5000),
 tags text[] not null default '{}',
 type text not null check(type in ('recruitment','discussion')),
 date date not null default current_date,
 created_at timestamptz not null default now()
);
create index posts_owner on public.posts(owner_id);
create table public.favorites (
 user_id uuid not null references public.profiles(id) on delete cascade,
 resource_id uuid not null references public.resources(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(user_id,resource_id)
);
create table public.lesson_progress (
 user_id uuid not null references public.profiles(id) on delete cascade,
 lesson_id uuid not null,
 resource_id uuid not null references public.resources(id) on delete cascade,
 completed_at timestamptz not null default now(), primary key(user_id,lesson_id)
);
create table public.applications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 resource_id uuid references public.resources(id) on delete cascade,
 post_id uuid references public.posts(id) on delete cascade,
 name text not null, message text not null check(char_length(message) between 10 and 1500),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 check(num_nonnulls(resource_id,post_id)=1),
 unique(user_id,resource_id),unique(user_id,post_id)
);
create index applications_resource on public.applications(resource_id);
create index applications_post on public.applications(post_id);
create table public.experiences (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 title text not null check(char_length(title) between 1 and 100),
 type text not null check(type in ('项目实践','赛事活动','学习成长','实习工作')),
 body text not null check(char_length(body) between 20 and 5000),
 date date not null, created_at timestamptz not null default now()
);
create index experiences_user on public.experiences(user_id,date);
-- Protect editorial flags; UI is never the authorization boundary.
create function public.protect_resource_flags() returns trigger language plpgsql set search_path='' as $$
begin
 if auth.uid() is not null and not public.is_admin() and
   (new.featured is distinct from old.featured or new.kind is distinct from old.kind or new.owner_id is distinct from old.owner_id)
 then raise exception 'Editorial fields require administrator access'; end if;
 return new;
end;
$$;
create trigger resource_flags before update on public.resources for each row execute procedure public.protect_resource_flags();
create function public.fill_progress_resource() returns trigger language plpgsql set search_path='' as $$
begin
 select r.id into new.resource_id from public.resources r
 where r.kind='course' and r.status='published'
 and r.lessons @> jsonb_build_array(jsonb_build_object('id',new.lesson_id::text)) limit 1;
 if new.resource_id is null then raise exception 'Lesson is not available'; end if;
 return new;
end;
$$;
create trigger progress_resource before insert or update on public.lesson_progress for each row execute procedure public.fill_progress_resource();
create function public.fill_application_name() returns trigger language plpgsql set search_path='' as $$
begin
 select p.name into new.name from public.profiles p where p.id=new.user_id;
 new.status:='pending';new.created_at:=now();
 return new;
end;
$$;
create trigger application_name before insert on public.applications for each row execute procedure public.fill_application_name();
alter table public.profiles enable row level security;
alter table public.resources enable row level security;
alter table public.posts enable row level security;
alter table public.favorites enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.applications enable row level security;
alter table public.experiences enable row level security;
-- Profiles: users can edit personal fields but cannot promote their role.
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
create policy profile_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
revoke all on public.profiles from anon,authenticated;
grant select on public.profiles to authenticated;
grant update(name,school,bio,interests,avatar_url) on public.profiles to authenticated;
-- Only published resources are visible to anonymous visitors; owners can see drafts.
create policy resource_read on public.resources for select to anon,authenticated using(status='published' or owner_id=auth.uid() or public.is_admin());
create policy resource_create on public.resources for insert to authenticated with check(public.is_admin() or (kind='project' and owner_id=auth.uid() and not featured));
create policy resource_update on public.resources for update to authenticated using(public.is_admin() or (kind='project' and owner_id=auth.uid())) with check(public.is_admin() or (kind='project' and owner_id=auth.uid()));
create policy resource_delete on public.resources for delete to authenticated using(public.is_admin() or (kind='project' and owner_id=auth.uid()));
grant select on public.resources to anon,authenticated;
grant insert,update,delete on public.resources to authenticated;
create policy posts_read on public.posts for select to anon,authenticated using(true);
create policy posts_create on public.posts for insert to authenticated with check(owner_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.name=author and left(p.name,1)=avatar));
grant select on public.posts to anon,authenticated;
grant insert on public.posts to authenticated;
create policy favorites_read on public.favorites for select to authenticated using(user_id=auth.uid());
create policy favorites_create on public.favorites for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.resources r where r.id=resource_id and r.status='published'));
create policy favorites_delete on public.favorites for delete to authenticated using(user_id=auth.uid());
grant select,insert,delete on public.favorites to authenticated;
create policy progress_read on public.lesson_progress for select to authenticated using(user_id=auth.uid());
create policy progress_create on public.lesson_progress for insert to authenticated with check(user_id=auth.uid());
create policy progress_update on public.lesson_progress for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,update on public.lesson_progress to authenticated;
create policy application_read on public.applications for select to authenticated using(
 user_id=auth.uid() or public.is_admin() or exists(select 1 from public.resources r where r.id=resource_id and r.owner_id=auth.uid()) or exists(select 1 from public.posts p where p.id=post_id and p.owner_id=auth.uid())
);
create policy application_create on public.applications for insert to authenticated with check(
 user_id=auth.uid() and status='pending' and
 (exists(select 1 from public.resources r where r.id=resource_id and r.status='published' and r.kind in ('competition','internship','project') and (r.deadline is null or r.deadline >= current_date)) or exists(select 1 from public.posts p where p.id=post_id and p.type='recruitment'))
);
create policy application_review on public.applications for update to authenticated using(
 public.is_admin() or exists(select 1 from public.resources r where r.id=resource_id and r.owner_id=auth.uid()) or exists(select 1 from public.posts p where p.id=post_id and p.owner_id=auth.uid())
) with check(
 public.is_admin() or exists(select 1 from public.resources r where r.id=resource_id and r.owner_id=auth.uid()) or exists(select 1 from public.posts p where p.id=post_id and p.owner_id=auth.uid())
);
revoke all on public.applications from anon,authenticated;
grant select,insert on public.applications to authenticated;
grant update(status) on public.applications to authenticated;
create policy experience_read on public.experiences for select to authenticated using(user_id=auth.uid());
create policy experience_create on public.experiences for insert to authenticated with check(user_id=auth.uid());
grant select,insert on public.experiences to authenticated;
-- Public avatar URLs; every upload and removal remains scoped to its owner's folder.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('avatars','avatars',true,3145728,array['image/png','image/jpeg','image/webp']);
create policy avatar_read on storage.objects for select to public using(bucket_id='avatars');
create policy avatar_upload on storage.objects for insert to authenticated with check(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy avatar_delete on storage.objects for delete to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
commit;
