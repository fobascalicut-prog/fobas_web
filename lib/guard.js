'use strict';
const crypto = require('crypto');
const hits = new Map();
function limited(req, key, max = 5, windowMs = 3600000) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'x').split(',')[0].trim();
  const k = key + ':' + crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
  const now = Date.now();
  const arr = (hits.get(k) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { hits.set(k, arr); return true; }
  arr.push(now); hits.set(k, arr);
  if (hits.size > 5000) hits.clear();
  return false;
}
const clean = (v, max) => String(v == null ? '' : v).replace(/<[^>]*>/g, '').replace(/\0/g, '').trim().slice(0, max);
function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}
function sameOrigin(req) {
  const origin = String(req.headers.origin || '');
  if (!origin) return String(req.headers['sec-fetch-site'] || 'same-origin') !== 'cross-site';
  let h;
  try { h = new URL(origin).host; } catch { return false; }
  const own = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  let site = '';
  try { site = process.env.SITE_URL ? new URL(process.env.SITE_URL).host : ''; } catch { /* ignore */ }
  const www = (x) => x.replace(/^www\./, '');
  return h === own || (site && www(h) === www(site)) || /^localhost(:\d+)?$/.test(h);
}
module.exports = { limited, clean, send, sameOrigin };
