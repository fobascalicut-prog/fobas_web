'use strict';
const { rest, configured } = require('../lib/supabase');
const { readBody } = require('../lib/body');
const { limited, clean, send, sameOrigin } = require('../lib/guard');
const { loadContent } = require('../lib/content');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Invalid request.' });
  if (!sameOrigin(req)) return send(res, 403, { ok: false, error: 'Request blocked.' });
  let b;
  try { b = await readBody(req); } catch { return send(res, 413, { ok: false, error: 'Request too large.' }); }
  if (b.website) return send(res, 200, { ok: true }); // honeypot: pretend success to bots
  const ts = Number(b.ts || 0);
  if (ts && Date.now() / 1000 - ts < 3) return send(res, 429, { ok: false, error: 'Please take a moment to complete the form.' });
  if (limited(req, 'enq')) return send(res, 429, { ok: false, error: 'Too many enquiries from your connection. Please call us instead.' });

  const row = { name: clean(b.name, 100), email: clean(b.email, 150), phone: clean(b.phone, 30), course: clean(b.course, 150), message: clean(b.message, 2000) };
  if (!row.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) || row.phone.replace(/\D/g, '').length < 7)
    return send(res, 422, { ok: false, error: 'Please enter your name, a valid email and phone number.' });
  if (!configured()) return send(res, 503, { ok: false, error: 'The enquiry system is not connected yet. Please call us.' });

  try {
    await rest('enquiries', { method: 'POST', body: row, prefer: 'return=minimal' });
  } catch (e) {
    console.error('enquiry save failed:', e.message);
    return send(res, 500, { ok: false, error: 'Could not save your enquiry. Please call us.' });
  }

  const key = process.env.RESEND_API_KEY;
  if (key) {
    try {
      const c = await loadContent();
      const to = process.env.NOTIFY_EMAIL || (c.site && c.site.notify_email);
      if (to) {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: process.env.MAIL_FROM || 'Fobas Website <onboarding@resend.dev>',
            to: [to], reply_to: row.email,
            subject: `New enquiry from ${row.name}${row.course ? ' (' + row.course + ')' : ''}`,
            text: `Name: ${row.name}\nEmail: ${row.email}\nPhone: ${row.phone}\nCourse: ${row.course}\n\n${row.message}`,
          }),
          signal: AbortSignal.timeout(4000),
        });
        if (!r.ok) console.error('resend failed:', r.status, (await r.text()).slice(0, 300));
      } else {
        console.error('resend skipped: set NOTIFY_EMAIL in Vercel (or Admin > Site settings > notify email)');
      }
    } catch (e) { console.error('mail failed:', e.message); }
  }
  send(res, 200, { ok: true });
};
