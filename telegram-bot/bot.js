'use strict';
const TelegramBot = require('node-telegram-bot-api');
const db = require('./database');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) { console.error('❌  TELEGRAM_BOT_TOKEN not set'); process.exit(1); }

// Optional: comma-separated list of allowed Telegram chat IDs (admin only)
const ADMIN_IDS = process.env.ADMIN_IDS
  ? process.env.ADMIN_IDS.split(',').map(s => s.trim())
  : [];

const bot = new TelegramBot(TOKEN, { polling: true });

// ── helpers ──────────────────────────────────────────────────────────────────

function isAdmin(chatId) {
  if (ADMIN_IDS.length === 0) return true;          // open if no admins configured
  return ADMIN_IDS.includes(String(chatId));
}

function mainKeyboard() {
  return {
    parse_mode: 'Markdown',
    reply_markup: {
      keyboard: [
        [{ text: '➕ إضافة رقم' }, { text: '🗑️ حذف رقم' }],
        [{ text: '📋 قائمة الأرقام' }, { text: '📊 إحصائيات' }]
      ],
      resize_keyboard: true
    }
  };
}

function md(text) { return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&'); }

// Track "waiting for phone" state per chat
const waiting = {};   // chatId → 'add' | 'remove' | null

// ── /start ───────────────────────────────────────────────────────────────────

bot.onText(/\/start/, msg => {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) return bot.sendMessage(chatId, '⛔ غير مصرح.');
  waiting[chatId] = null;
  bot.sendMessage(chatId,
    `👋 *مرحباً\\!* أنا بوت إدارة أرقام واتساب\\.\n\nاستخدم الأزرار أدناه أو الأوامر:\n• /add 7XXXXXXX — إضافة رقم\n• /remove 7XXXXXXX — حذف رقم\n• /list — قائمة الأرقام\n• /stats — إحصائيات`,
    { parse_mode: 'MarkdownV2', ...mainKeyboard() }
  );
});

// ── /add <phone> ─────────────────────────────────────────────────────────────

bot.onText(/\/add (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) return;
  const phone = match[1].replace(/\D/g, '');
  if (!phone) return bot.sendMessage(chatId, '⚠️ أدخل رقمًا صحيحًا.\nمثال: `/add 737172794`', { parse_mode: 'Markdown' });
  const added = db.addPhone(phone, chatId);
  bot.sendMessage(chatId,
    added ? `✅ تم إضافة الرقم \`${phone}\` بنجاح.` : `ℹ️ الرقم \`${phone}\` موجود مسبقًا.`,
    { parse_mode: 'Markdown' }
  );
});

// ── /remove <phone> ───────────────────────────────────────────────────────────

bot.onText(/\/remove (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) return;
  const phone = match[1].replace(/\D/g, '');
  if (!phone) return bot.sendMessage(chatId, '⚠️ أدخل رقمًا صحيحًا.\nمثال: `/remove 737172794`', { parse_mode: 'Markdown' });
  const removed = db.removePhone(phone);
  bot.sendMessage(chatId,
    removed ? `🗑️ تم حذف الرقم \`${phone}\`.` : `⚠️ الرقم \`${phone}\` غير موجود.`,
    { parse_mode: 'Markdown' }
  );
});

// ── /list ─────────────────────────────────────────────────────────────────────

bot.onText(/\/list/, msg => {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) return;
  sendList(chatId);
});

function sendList(chatId) {
  const phones = db.listPhones();
  if (phones.length === 0)
    return bot.sendMessage(chatId, '📋 لا توجد أرقام مسموح بها حاليًا.');
  const lines = phones.map((p, i) =>
    `${i + 1}\\. \`${p.phone}\`  —  ${md(p.added_at.slice(0, 10))}`
  ).join('\n');
  bot.sendMessage(chatId,
    `📋 *الأرقام المسموح بها \\(${phones.length}\\):*\n\n${lines}`,
    { parse_mode: 'MarkdownV2' }
  );
}

// ── /stats ────────────────────────────────────────────────────────────────────

bot.onText(/\/stats/, msg => {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) return;
  bot.sendMessage(chatId,
    `📊 *إحصائيات:*\n• إجمالي الأرقام المسموح بها: *${db.count()}*`,
    { parse_mode: 'Markdown' }
  );
});

// ── /check <phone> ────────────────────────────────────────────────────────────

bot.onText(/\/check (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) return;
  const phone = match[1].replace(/\D/g, '');
  const ok = db.isAllowed(phone);
  bot.sendMessage(chatId,
    ok ? `✅ الرقم \`${phone}\` *مسموح* له بالدخول.` : `❌ الرقم \`${phone}\` *غير مسموح* له.`,
    { parse_mode: 'Markdown' }
  );
});

// ── keyboard button messages ──────────────────────────────────────────────────

bot.on('message', msg => {
  const chatId = msg.chat.id;
  const text   = (msg.text || '').trim();
  if (!text || text.startsWith('/')) return;
  if (!isAdmin(chatId)) return;

  // Waiting for phone input
  if (waiting[chatId] === 'add') {
    waiting[chatId] = null;
    const phone = text.replace(/\D/g, '');
    if (!phone) return bot.sendMessage(chatId, '⚠️ رقم غير صحيح، حاول مجددًا.');
    const added = db.addPhone(phone, chatId);
    return bot.sendMessage(chatId,
      added ? `✅ تم إضافة \`${phone}\`.` : `ℹ️ الرقم \`${phone}\` موجود مسبقًا.`,
      { parse_mode: 'Markdown', ...mainKeyboard() }
    );
  }

  if (waiting[chatId] === 'remove') {
    waiting[chatId] = null;
    const phone = text.replace(/\D/g, '');
    if (!phone) return bot.sendMessage(chatId, '⚠️ رقم غير صحيح، حاول مجددًا.');
    const removed = db.removePhone(phone);
    return bot.sendMessage(chatId,
      removed ? `🗑️ تم حذف \`${phone}\`.` : `⚠️ الرقم \`${phone}\` غير موجود.`,
      { parse_mode: 'Markdown', ...mainKeyboard() }
    );
  }

  // Keyboard buttons
  if (text === '➕ إضافة رقم') {
    waiting[chatId] = 'add';
    return bot.sendMessage(chatId, '📱 أرسل رقم الهاتف الذي تريد إضافته (أرقام فقط):');
  }
  if (text === '🗑️ حذف رقم') {
    waiting[chatId] = 'remove';
    return bot.sendMessage(chatId, '🗑️ أرسل رقم الهاتف الذي تريد حذفه:');
  }
  if (text === '📋 قائمة الأرقام') return sendList(chatId);
  if (text === '📊 إحصائيات') {
    return bot.sendMessage(chatId,
      `📊 *إحصائيات:*\n• إجمالي الأرقام المسموح بها: *${db.count()}*`,
      { parse_mode: 'Markdown' }
    );
  }
});

console.log('🤖 Telegram bot is running...');
module.exports = bot;
