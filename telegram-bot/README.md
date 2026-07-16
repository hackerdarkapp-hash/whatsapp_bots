# Telegram Bot — WhatsApp Number Manager

يتحكم هذا البوت في الأرقام المسموح لها بالدخول إلى تطبيق WhatsApp Bots.

## إعداد

```bash
cd telegram-bot
npm install
cp .env.example .env
# عدّل .env وأضف التوكن الخاص بك
node index.js
```

## المتغيرات البيئية

| المتغير | الوصف | مطلوب |
|---------|-------|--------|
| `TELEGRAM_BOT_TOKEN` | توكن البوت من @BotFather | ✅ |
| `ADMIN_IDS` | معرفات تيليجرام للمسؤولين (مفصولة بفاصلة) | ❌ |
| `DB_PATH` | مسار ملف قاعدة البيانات SQLite | ❌ |
| `PORT` | منفذ API server | ❌ |

## أوامر البوت

| الأمر | الوصف |
|-------|-------|
| `/start` | عرض القائمة الرئيسية |
| `/add 737172794` | إضافة رقم |
| `/remove 737172794` | حذف رقم |
| `/list` | عرض جميع الأرقام |
| `/check 737172794` | التحقق من رقم |
| `/stats` | إحصائيات |

## API Endpoints

| المسار | الوصف |
|--------|-------|
| `GET /api/check?phone=XXXXXXXXX` | التحقق من رقم → `{ allowed: true/false }` |
| `GET /api/health` | فحص الصحة |
| `GET /api/phones` | قائمة الأرقام |

## النشر على Render

1. أضف خدمة Web جديدة من نوع **Node**
2. Build Command: `cd telegram-bot && npm install`
3. Start Command: `cd telegram-bot && node index.js`
4. أضف متغير `TELEGRAM_BOT_TOKEN` في Environment Variables
