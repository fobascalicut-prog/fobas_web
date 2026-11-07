'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
try {
  for (const l of fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* optional */ }

const vercel = require('./vercel.json');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain' };
const PUB = path.join(__dirname, 'public');

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  let p = u.pathname;
  for (const r of vercel.redirects || []) if (r.source === p) { res.writeHead(301, { Location: r.destination }); return res.end(); }
  for (const r of vercel.rewrites || []) if (r.source === p) { const d = new URL(r.destination, 'http://x'); p = d.pathname; d.searchParams.forEach((v, k) => u.searchParams.set(k, v)); req.url = p + '?' + u.searchParams; break; }
  if (p.startsWith('/api/')) {
    const f = path.join(__dirname, p + '.js');
    if (!fs.existsSync(f)) { res.statusCode = 404; return res.end('Not found'); }
    return require(f)(req, res);
  }
  let file = path.join(PUB, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!file.startsWith(PUB) || !fs.existsSync(file)) { res.statusCode = 404; return res.end('Not found'); }
  res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(process.env.PORT || 3000, () => console.log('Fobas dev server: http://localhost:' + (process.env.PORT || 3000)));
