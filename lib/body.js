'use strict';
async function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  let raw = typeof req.body === 'string' ? req.body : '';
  if (!raw) {
    const chunks = [];
    let size = 0;
    for await (const c of req) {
      size += c.length;
      if (size > 100000) throw new Error('Request too large');
      chunks.push(c);
    }
    raw = Buffer.concat(chunks).toString('utf8');
  }
  const type = String(req.headers['content-type'] || '');
  if (type.includes('json')) {
    try { return JSON.parse(raw || '{}'); } catch { return {}; }
  }
  return Object.fromEntries(new URLSearchParams(raw));
}
module.exports = { readBody };
