'use strict';
const { URL, KEY } = require('../lib/supabase');
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.end(JSON.stringify({ url: URL, anonKey: KEY }));
};
