'use strict';
const { rest, configured } = require('../lib/supabase');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (!configured()) { res.statusCode = 200; res.end(JSON.stringify({ ok: true, database: 'not configured' })); return; }
  try {
    await rest('site_content?id=eq.1&select=id');
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, time: new Date().toISOString() }));
  } catch (e) {
    console.error('keepalive failed:', e.message);
    res.statusCode = 503;
    res.end(JSON.stringify({ ok: false }));
  }
};
