'use strict';
const { loadContent, loadComments } = require('../lib/content');
const { create, PATHS } = require('../lib/site');

module.exports = async (req, res) => {
  const q = new URL(req.url, 'http://x').searchParams;
  const page = q.get('p') || 'home';
  if (!PATHS[page]) { res.statusCode = 404; res.end('Not found'); return; }
  // Version/cache-busting params (?v=...) must never create a second URL for a page.
  // Redirect them to the clean URL so Google keeps only one version indexed.
  if (q.has('v')) {
    const rest = new URLSearchParams(q);
    rest.delete('v'); rest.delete('p');
    const qs = rest.toString();
    res.statusCode = 301;
    res.setHeader('Location', PATHS[page] + (qs ? '?' + qs : ''));
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.end();
    return;
  }
  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    const proto = req.headers['x-forwarded-proto'] || (String(host).startsWith('localhost') || String(host).startsWith('127.') ? 'http' : 'https');
    const [content, comments] = await Promise.all([loadContent(), page === 'placement' ? loadComments() : []]);
    const html = create(content, { comments, base: (process.env.SITE_URL || `${proto}://${host}`).replace(/\/+$/, '') }).render(page);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', q.has('preview') ? 'no-store' : 'public, max-age=0, s-maxage=10, stale-while-revalidate=120');
    res.end(html);
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Something went wrong. Please try again shortly.');
  }
};
