-- =====================================================================
-- SECURITY HARDENING - run ONCE in Supabase > SQL Editor. Safe to run twice.
-- The website only uses the public (anon) key, so anyone could call Supabase directly
-- and skip the website's spam checks. These database-level rules protect against that.
-- =====================================================================

-- 1) Flood limit: at most 60 enquiries and 20 comments per hour in total.
create or replace function public.limit_enquiry_flood() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.enquiries where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Too many enquiries, please try later';
  end if;
  return new;
end $$;
drop trigger if exists enquiry_flood_trg on public.enquiries;
create trigger enquiry_flood_trg before insert on public.enquiries for each row execute function public.limit_enquiry_flood();

create or replace function public.limit_comment_flood() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.comments where created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many comments, please try later';
  end if;
  if new.message ~* '(https?://|www\.)' then
    raise exception 'Links are not allowed in comments';
  end if;
  return new;
end $$;
drop trigger if exists comment_flood_trg on public.comments;
create trigger comment_flood_trg before insert on public.comments for each row execute function public.limit_comment_flood();

-- 2) Email format check at database level.
alter table public.enquiries drop constraint if exists enquiries_email_format;
alter table public.enquiries add constraint enquiries_email_format check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$') not valid;

-- 3) Only images up to 5 MB may be uploaded (already set in schema.sql; re-applied here).
update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['image/webp','image/jpeg','image/png'] where id = 'media';

-- MANUAL STEPS in the Supabase dashboard (cannot be done by SQL):
--  * Authentication > Sign In / Providers > turn OFF "Allow new users to sign up".
--  * Authentication > Users: keep ONLY your admin account(s). Use a long unique password.
--  * Authentication > Multi-Factor: enable TOTP and turn it on for your admin account.
--  * Project Settings > API: never put the service_role / secret key in this project or in Vercel.
