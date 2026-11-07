# Security checklist (before going live)

1. HTTPS: Vercel gives it automatically; the site also sends HSTS so browsers always use HTTPS.
2. Vercel > Settings > Environment Variables: set SITE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, RESEND_API_KEY (see .env.example).
3. Supabase: run supabase/schema.sql, then supabase/update-courses-and-phone.sql, then supabase/security-hardening.sql.
3b. Supabase: run supabase/admin-lockdown.sql (only listed accounts count as admin - read the top of the file first).
4. Supabase: disable public sign-ups, keep one admin user, enable MFA (see the end of security-hardening.sql).
5. Never commit .env files or the Supabase service_role key.
6. Test: https://securityheaders.com and https://observatory.mozilla.org on your domain after deploying.
