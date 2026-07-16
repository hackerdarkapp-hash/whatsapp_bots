'use strict';
const fs   = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'allowed_phones.json');

function read() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return { phones: [] }; }
}

function write(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
  /** Add phone. Returns true if new, false if already existed. */
  addPhone(phone, addedBy, note, subscription, activationCode) {
    phone = String(phone).replace(/\D/g, '');
    if (!phone) return false;
    const db = read();
    const existing = db.phones.find(p => p.phone === phone);
    if (existing) {
      // Update subscription/code if provided
      if (subscription)    existing.subscription    = subscription;
      if (activationCode)  existing.activation_code = activationCode;
      write(db);
      return false;
    }
    db.phones.unshift({
      phone,
      added_by:        String(addedBy || ''),
      note:            note            || '',
      subscription:    subscription    || '',
      activation_code: activationCode  || '',
      added_at:        new Date().toISOString(),
    });
    write(db);
    return true;
  },

  /** Remove phone. Returns true if deleted. */
  removePhone(phone) {
    phone = String(phone).replace(/\D/g, '');
    const db     = read();
    const before = db.phones.length;
    db.phones    = db.phones.filter(p => p.phone !== phone);
    if (db.phones.length === before) return false;
    write(db);
    return true;
  },

  /** Check if phone is whitelisted. */
  isAllowed(phone) {
    phone = String(phone).replace(/\D/g, '');
    return !!read().phones.find(p => p.phone === phone);
  },

  /** All phones sorted newest-first. */
  listPhones() { return read().phones; },

  /** Total count. */
  count() { return read().phones.length; },
};
