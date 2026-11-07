'use strict';
const env = (...names) => { for (const n of names) if (process.env[n] && process.env[n].trim()) return process.env[n].trim(); return ''; };
const URL_ = env('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL').replace(/\/+$/, '');
const KEY = env('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

const configured = () => Boolean(URL_ && KEY);

async function rest(path, { method = 'GET', body, prefer, timeout = 4000 } = {}) {
  if (!configured()) throw new Error('Supabase is not configured');
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: KEY,
      ...(KEY.startsWith('eyJ') ? { Authorization: `Bearer ${KEY}` } : {}),
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

module.exports = { rest, configured, URL: URL_, KEY };
