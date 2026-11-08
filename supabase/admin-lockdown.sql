-- =====================================================================
-- ADMIN LOCKDOWN - run ONCE in Supabase > SQL Editor. Safe to run twice.
--
-- WHY: the original rules let ANY signed-in Supabase user act as admin
-- (read all enquiries, edit the whole website, upload files). If "Allow new users to sign up"
-- was ever ON, a stranger could create an account and do that. This script makes only the
-- accounts listed in public.admins count as admin.
--
-- BEFORE YOU RUN IT:
--  1) Supabase > Authentication > Users: make sure the list contains ONLY your own admin account(s).
--     Delete any account you do not recognise. (Everyone listed when you run this becomes an admin.)
--  2) Supabase > Authentication > Sign In / Providers: turn OFF "Allow new users to sign up".
-- To add another admin later: create the user, then run
--     insert into public.admins (user_id) select id from auth.users where email = 'person@example.com';
-- =====================================================================

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;   -- no policies: nobody can read/change it through the API
insert into public.admins (user_id) select id from auth.users on conflict do nothing;

create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Content
drop policy if exists "content admin" on public.site_content;
create policy "content admin" on public.site_content for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "history admin" on public.site_content_history;
create policy "history admin" on public.site_content_history for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Enquiries and comments (visitors can still SEND them; only admins can read/manage)
drop policy if exists "enquiry admin" on public.enquiries;
create policy "enquiry admin" on public.enquiries for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "comment admin" on public.comments;
create policy "comment admin" on public.comments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Image uploads
drop policy if exists "media admin insert" on storage.objects;
drop policy if exists "media admin update" on storage.objects;
drop policy if exists "media admin delete" on storage.objects;
create policy "media admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());
create policy "media admin update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_admin());
create policy "media admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());

-- Check: this should list ONLY your admin email(s).
select u.email from public.admins a join auth.users u on u.id = a.user_id;
