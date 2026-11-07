'use strict';
const { rest, configured } = require('../lib/supabase');
const { readBody } = require('../lib/body');
const { limited, clean, send, sameOrigin } = require('../lib/guard');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Invalid request.' });
  if (!sameOrigin(req)) return send(res, 403, { ok: false, error: 'Request blocked.' });
  let b;
  try { b = await readBody(req); } catch { return send(res, 413, { ok: false, error: 'Request too large.' }); }
  if (b.website) return send(res, 200, { ok: true });
  const ts = Number(b.ts || 0);
  if (ts && Date.now() / 1000 - ts < 3) return send(res, 429, { ok: false, error: 'Please take a moment before posting.' });
  if (limited(req, 'cmt', 4)) return send(res, 429, { ok: false, error: 'Too many comments. Please try again later.' });
  const name = clean(b.name, 60), message = clean(b.message, 600);
  if (!name || message.length < 3) return send(res, 422, { ok: false, error: 'Please enter your name and a comment.' });
  if (/https?:\/\/|www\./i.test(message)) return send(res, 422, { ok: false, error: 'Links are not allowed in comments.' });
  if (!configured()) return send(res, 503, { ok: false, error: 'Comments are not connected yet.' });
  try {
    await rest('comments', { method: 'POST', body: { name, message, approved: false }, prefer: 'return=minimal' });
  } catch (e) {
    console.error('comment save failed:', e.message);
    return send(res, 500, { ok: false, error: 'Could not save your comment.' });
  }
  send(res, 200, { ok: true });
};
