'use strict';
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'allowed_phones.db');
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS allowed_phones (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    phone    TEXT    UNIQUE NOT NULL,
    added_by TEXT,
    note     TEXT,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = {
  /** Add a phone number (digits only). Returns true if inserted, false if already existed. */
  addPhone(phone, addedBy, note) {
    phone = String(phone).replace(/\D/g, '');
    if (!phone) return false;
    const r = db.prepare(
      'INSERT OR IGNORE INTO allowed_phones (phone, added_by, note) VALUES (?, ?, ?)'
    ).run(phone, String(addedBy || ''), note || '');
    return r.changes > 0;
  },

  /** Remove a phone number. Returns true if deleted. */
  removePhone(phone) {
    phone = String(phone).replace(/\D/g, '');
    const r = db.prepare('DELETE FROM allowed_phones WHERE phone = ?').run(phone);
    return r.changes > 0;
  },

  /** Check if a phone number is in the whitelist. */
  isAllowed(phone) {
    phone = String(phone).replace(/\D/g, '');
    return !!db.prepare('SELECT 1 FROM allowed_phones WHERE phone = ? LIMIT 1').get(phone);
  },

  /** Return all allowed phones sorted by newest first. */
  listPhones() {
    return db.prepare(
      'SELECT phone, added_by, note, added_at FROM allowed_phones ORDER BY added_at DESC'
    ).all();
  },

  /** Return total count. */
  count() {
    return db.prepare('SELECT COUNT(*) as c FROM allowed_phones').get().c;
  }
};
