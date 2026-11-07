-- =====================================================================
-- FOBAS WEBSITE - Supabase setup
-- Run this ONCE: Supabase dashboard > SQL Editor > New query > paste > Run
-- Safe to run again (it will not delete your data).
-- =====================================================================

-- 1) Website content (one row holds every editable text/image setting) --
create table if not exists public.site_content (
  id         int primary key default 1 check (id = 1),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.site_content (id, data) values (1, '{}'::jsonb) on conflict (id) do nothing;

-- Keep the last 30 versions so you can always roll back.
create table if not exists public.site_content_history (
  id       bigserial primary key,
  data     jsonb not null,
  saved_at timestamptz not null default now()
);

create or replace function public.keep_content_history() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.data is not null and old.data <> '{}'::jsonb then
    insert into public.site_content_history (data) values (old.data);
    delete from public.site_content_history
     where id not in (select id from public.site_content_history order by id desc limit 30);
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists site_content_history_trg on public.site_content;
create trigger site_content_history_trg before update on public.site_content
  for each row execute function public.keep_content_history();

-- 2) Enquiries from the contact form ----------------------------------
create table if not exists public.enquiries (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null check (char_length(name)  between 1 and 100),
  email      text not null check (char_length(email) between 3 and 150),
  phone      text not null check (char_length(phone) between 7 and 30),
  course     text not null default '' check (char_length(course)  <= 150),
  message    text not null default '' check (char_length(message) <= 2000),
  status     text not null default 'new' check (status in ('new','done'))
);

-- 3) Visitor comments (shown only after you approve them) -------------
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null check (char_length(name)    between 1 and 60),
  message    text not null check (char_length(message) between 3 and 600),
  approved   boolean not null default false
);

-- 4) Security (Row Level Security) ------------------------------------
alter table public.site_content         enable row level security;
alter table public.site_content_history enable row level security;
alter table public.enquiries            enable row level security;
alter table public.comments             enable row level security;

-- Content: everyone can read (the website), only the logged-in admin can change.
drop policy if exists "content read"  on public.site_content;
drop policy if exists "content admin" on public.site_content;
create policy "content read"  on public.site_content for select to anon, authenticated using (true);
create policy "content admin" on public.site_content for all    to authenticated using (true) with check (true);

drop policy if exists "history admin" on public.site_content_history;
create policy "history admin" on public.site_content_history for all to authenticated using (true) with check (true);

-- Enquiries: anyone can send one (cannot read them), admin manages.
drop policy if exists "enquiry insert" on public.enquiries;
drop policy if exists "enquiry admin"  on public.enquiries;
create policy "enquiry insert" on public.enquiries for insert to anon, authenticated with check (status = 'new');
create policy "enquiry admin"  on public.enquiries for all    to authenticated using (true) with check (true);

-- Comments: anyone can post (always unapproved), public sees approved only, admin manages.
drop policy if exists "comment insert" on public.comments;
drop policy if exists "comment read"   on public.comments;
drop policy if exists "comment admin"  on public.comments;
create policy "comment insert" on public.comments for insert to anon, authenticated with check (approved = false);
create policy "comment read"   on public.comments for select to anon using (approved = true);
create policy "comment admin"  on public.comments for all    to authenticated using (true) with check (true);

-- 5) Image storage bucket (public read, admin upload) -----------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/webp','image/jpeg','image/png'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/webp','image/jpeg','image/png'];

drop policy if exists "media public read"  on storage.objects;
drop policy if exists "media admin insert" on storage.objects;
drop policy if exists "media admin update" on storage.objects;
drop policy if exists "media admin delete" on storage.objects;
create policy "media public read"  on storage.objects for select using (bucket_id = 'media');
create policy "media admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'media');
create policy "media admin update" on storage.objects for update to authenticated using (bucket_id = 'media');
create policy "media admin delete" on storage.objects for delete to authenticated using (bucket_id = 'media');

-- Done. Next: Authentication > Users > Add user (your admin email + password),
-- then Authentication > Sign In / Providers > turn OFF "Allow new users to sign up".
