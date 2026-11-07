'use strict';
const { sendMail, mailConfigured } = require('../lib/mail');
const { URL: SB_URL, KEY, configured } = require('../lib/supabase');
const { loadContent } = require('../lib/content');
const { send, sameOrigin } = require('../lib/guard');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Invalid request.' });
  if (!sameOrigin(req)) return send(res, 403, { ok: false, error: 'Request blocked.' });
  if (!configured()) return send(res, 503, { ok: false, error: 'Supabase is not connected.' });
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return send(res, 401, { ok: false, error: 'Please log in again.' });
  try {
    const r = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: KEY, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(4000) });
    if (!r.ok) return send(res, 401, { ok: false, error: 'Session expired. Please log in again.' });
  } catch { return send(res, 502, { ok: false, error: 'Could not verify your login.' }); }

  if (!mailConfigured()) return send(res, 200, { ok: false, error: 'RESEND_API_KEY is not set in Vercel yet.' });
  const content = await loadContent();
  const to = process.env.NOTIFY_EMAIL || (content.site && (content.site.notify_email || content.site.email));
  const out = await sendMail({ to, subject: 'Fobas website: test email', text: 'Resend is connected. New enquiries will be emailed to this address.' });
  send(res, 200, out.ok ? { ok: true, to } : { ok: false, error: out.error });
};
