'use strict';
const DEFAULT = require('../data/content.default.json');
const { rest, configured } = require('./supabase');

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
function merge(base, over) {
  if (!isObj(base) || !isObj(over)) return over === undefined ? base : over;
  const out = { ...base };
  for (const k of Object.keys(over)) out[k] = k in base ? merge(base[k], over[k]) : over[k];
  return out;
}

async function loadContent() {
  if (!configured()) return DEFAULT;
  try {
    const rows = await rest('site_content?id=eq.1&select=data');
    const d = rows && rows[0] && rows[0].data;
    if (!d || !Object.keys(d).length) return DEFAULT;
    const out = merge(DEFAULT, d);
    const custom = d.recent_placements_custom === true && Array.isArray(d.recent_placements);
    out.recent_placements = custom ? d.recent_placements : DEFAULT.recent_placements;
    if (Array.isArray(out.courses)) {
      const nk = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      out.courses = out.courses.map((c) => {
        if (!c || c.image) return c;
        const k = nk(c.title);
        const m = DEFAULT.courses.find((x) => {
          const dk = nk(x.title);
          return k && x.image && (dk === k || (k.length >= 8 && (dk.startsWith(k) || k.startsWith(dk))));
        });
        return m ? { ...c, image: m.image } : c;
      });
    }
    return out;
  } catch (e) {
    console.error('content load failed, using defaults:', e.message);
    return DEFAULT;
  }
}

async function loadComments() {
  if (!configured()) return [];
  try {
    return (await rest('comments?approved=eq.true&select=name,message,created_at&order=created_at.desc&limit=30')) || [];
  } catch (e) {
    console.error('comments load failed:', e.message);
    return [];
  }
}

module.exports = { loadContent, loadComments, merge, DEFAULT };
