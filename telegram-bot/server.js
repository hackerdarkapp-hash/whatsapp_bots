'use strict';
const express = require('express');
const cors    = require('cors');
const db      = require('./database');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── GET /api/check?phone=XXXXXXXXX ───────────────────────────────────────────
// Returns { allowed: true|false }
app.get('/api/check', (req, res) => {
  const phone = String(req.query.phone || '').replace(/\D/g, '');
  if (!phone) return res.json({ allowed: false, error: 'phone_required' });
  res.json({ allowed: db.isAllowed(phone) });
});

// ── GET /api/health ───────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', phones: db.count(), ts: new Date().toISOString() });
});

// ── GET /api/phones  (list all — for admin debugging) ────────────────────────
app.get('/api/phones', (_req, res) => {
  res.json({ phones: db.listPhones() });
});

app.listen(PORT, () => console.log(`🌐 API server on port ${PORT}`));
module.exports = app;
