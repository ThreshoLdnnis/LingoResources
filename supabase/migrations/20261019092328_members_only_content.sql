-- The introduction remains public; platform content requires a member session.
-- Keep the existing publication, draft, ownership and administrator predicates.
alter policy resource_read on public.resources to authenticated;
alter policy posts_read on public.posts to authenticated;
alter policy comments_read on public.post_comments to authenticated;
revoke all on public.resources, public.posts, public.post_comments from anon;
revoke select on public.resources, public.posts, public.post_comments from public;
grant select on public.resources, public.posts, public.post_comments to authenticated;

-- PDFs, code archives and event covers follow the same member-only boundary.
-- Existing upload permissions and per-resource publication checks are unchanged.
alter policy course_file_read on storage.objects to authenticated;
alter policy competition_cover_read on storage.objects to authenticated;
update storage.buckets set public = false
where id in ('course-files', 'competition-covers') and public;
