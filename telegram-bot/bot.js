'use strict';
const TelegramBot = require('node-telegram-bot-api');
const db = require('./database');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) { console.error('❌  TELEGRAM_BOT_TOKEN not set'); process.exit(1); }

const ADMIN_IDS = process.env.ADMIN_IDS
  ? process.env.ADMIN_IDS.split(',').map(s => s.trim())
  : [];

const bot = new TelegramBot(TOKEN, { polling: true });

function isAdmin(chatId) {
  if (ADMIN_IDS.length === 0) return true;
  return ADMIN_IDS.includes(String(chatId));
}

// ── Flag emoji from ISO-2 country code ───────────────────────────────────────
function flag(iso2) {
  return [...iso2.toUpperCase()].map(c =>
    String.fromCodePoint(c.codePointAt(0) + 127397)
  ).join('');
}

// ── Countries + networks ──────────────────────────────────────────────────────
const COUNTRIES = [
  // ── Arab & Middle East ──
  { code:'YE', name:'اليمن',           nets:['يمن موبايل','سبافون','MTN يمن','يو موبايل'] },
  { code:'SA', name:'السعودية',        nets:['STC','موبايلي','زين'] },
  { code:'EG', name:'مصر',             nets:['فودافون مصر','أورنج','اتصالات','WE'] },
  { code:'IQ', name:'العراق',          nets:['آسيا سيل','زين','كورك','إيرث لنك'] },
  { code:'AE', name:'الإمارات',        nets:['اتصالات','دو'] },
  { code:'KW', name:'الكويت',          nets:['زين','STC','Ooredoo'] },
  { code:'JO', name:'الأردن',          nets:['زين','أورنج','Umniah'] },
  { code:'SY', name:'سوريا',           nets:['Syriatel','MTN'] },
  { code:'LY', name:'ليبيا',           nets:['Libyana','المدار','Lyca Mobile'] },
  { code:'MA', name:'المغرب',          nets:['Maroc Telecom','Orange','Inwi'] },
  { code:'TN', name:'تونس',            nets:['Ooredoo','Orange','Telecom Tunisia'] },
  { code:'DZ', name:'الجزائر',         nets:['موبيليس','Djezzy','Ooredoo'] },
  { code:'SD', name:'السودان',         nets:['زين','MTN','Sudatel'] },
  { code:'LB', name:'لبنان',           nets:['Alfa','Touch'] },
  { code:'PS', name:'فلسطين',          nets:['جوال','Ooredoo'] },
  { code:'OM', name:'عُمان',           nets:['Omantel','Ooredoo'] },
  { code:'QA', name:'قطر',             nets:['Ooredoo','فودافون'] },
  { code:'BH', name:'البحرين',         nets:['Batelco','زين','VIVA'] },
  { code:'SO', name:'الصومال',         nets:['Hormuud','Golis','Telesom','Somtel'] },
  { code:'SS', name:'جنوب السودان',    nets:['MTN','زين','Digitel'] },
  { code:'ER', name:'إريتريا',         nets:['Ericel'] },
  { code:'DJ', name:'جيبوتي',          nets:['Djibouti Telecom'] },
  { code:'MR', name:'موريتانيا',       nets:['Mauritel','Mattel','Chinguitel'] },
  // ── Africa ──
  { code:'NG', name:'نيجيريا',         nets:['MTN','Airtel','Glo','9mobile'] },
  { code:'ET', name:'إثيوبيا',         nets:['Ethio Telecom','Safaricom ET'] },
  { code:'KE', name:'كينيا',           nets:['Safaricom','Airtel','Telkom'] },
  { code:'TZ', name:'تنزانيا',         nets:['Vodacom','Airtel','Tigo','Halotel'] },
  { code:'ZA', name:'جنوب أفريقيا',    nets:['Vodacom','MTN','Cell C','Telkom'] },
  { code:'GH', name:'غانا',            nets:['MTN','Vodafone','AirtelTigo'] },
  { code:'CM', name:'الكاميرون',       nets:['MTN','Orange','Nexttel'] },
  { code:'CD', name:'الكونغو',         nets:['Vodacom','Airtel','Orange','Africell'] },
  { code:'CG', name:'الكونغو برازافيل',nets:['Airtel','MTN','Azur'] },
  { code:'SN', name:'السنغال',         nets:['Orange','Free','Expresso'] },
  { code:'CI', name:'كوت ديفوار',     nets:['Orange','MTN','Moov'] },
  { code:'ML', name:'مالي',            nets:['Orange','Malitel'] },
  { code:'BF', name:'بوركينا فاسو',   nets:['Orange','Telecel','Onatel'] },
  { code:'NE', name:'النيجر',          nets:['Airtel','Orange','Moov'] },
  { code:'TD', name:'تشاد',            nets:['Airtel','Moov','Tigo'] },
  { code:'MG', name:'مدغشقر',          nets:['Telma','Orange','Airtel'] },
  { code:'MZ', name:'موزمبيق',         nets:['Vodacom','Movitel','Tmcel'] },
  { code:'ZM', name:'زامبيا',          nets:['MTN','Airtel','Zamtel'] },
  { code:'ZW', name:'زيمبابوي',        nets:['Econet','NetOne','Telecel'] },
  { code:'AO', name:'أنغولا',          nets:['Unitel','Movicel'] },
  { code:'UG', name:'أوغندا',          nets:['MTN','Airtel','Africell'] },
  { code:'RW', name:'رواندا',          nets:['MTN','Airtel','Liquid Telecom'] },
  { code:'BI', name:'بوروندي',         nets:['Lumitel','Smart','Onatel'] },
  { code:'MW', name:'ملاوي',           nets:['Airtel','TNM'] },
  { code:'BW', name:'بوتسوانا',        nets:['BTC','Mascom','Orange'] },
  { code:'NA', name:'ناميبيا',         nets:['MTC','TN Mobile'] },
  { code:'LS', name:'ليسوتو',          nets:['Vodacom','Econet'] },
  { code:'SZ', name:'إسواتيني',        nets:['MTN','Eswatini Mobile'] },
  { code:'GM', name:'غامبيا',          nets:['Africell','QCell','Gamcel'] },
  { code:'GN', name:'غينيا',           nets:['Orange','MTN','Cellcom'] },
  { code:'SL', name:'سيراليون',        nets:['Airtel','Orange','Africell'] },
  { code:'LR', name:'ليبيريا',         nets:['Lonestar Cell','Orange'] },
  { code:'TG', name:'توغو',            nets:['Togocel','Moov'] },
  { code:'BJ', name:'بنين',            nets:['MTN','Moov','Libercom'] },
  { code:'GA', name:'الغابون',         nets:['Airtel','Moov','Azur'] },
  { code:'GQ', name:'غينيا الاستوائية',nets:['Orange','GETESA'] },
  { code:'CF', name:'أفريقيا الوسطى', nets:['Orange','Telecel','Nationlink'] },
  { code:'MU', name:'موريشيوس',        nets:['Emtel','Orange','MTML'] },
  { code:'CV', name:'الرأس الأخضر',    nets:['CVMOVEL','Unitel T+'] },
  { code:'GW', name:'غينيا بيساو',     nets:['MTN','Orange'] },
  { code:'KM', name:'جزر القمر',       nets:['Comores Telecom'] },
  { code:'SC', name:'سيشل',            nets:['Airtel','Cable & Wireless'] },
  { code:'ST', name:'ساو تومي',        nets:['CST'] },
  // ── Asia ──
  { code:'TR', name:'تركيا',           nets:['Turkcell','Vodafone','Türk Telekom'] },
  { code:'IR', name:'إيران',           nets:['همراه اول','ایرانسل','Rightel'] },
  { code:'PK', name:'باكستان',         nets:['Jazz','Zong','Telenor','Ufone'] },
  { code:'IN', name:'الهند',           nets:['Jio','Airtel','Vi','BSNL'] },
  { code:'BD', name:'بنغلاديش',        nets:['Grameenphone','Robi','Banglalink','Teletalk'] },
  { code:'NP', name:'نيبال',           nets:['NTC','Ncell'] },
  { code:'LK', name:'سريلانكا',        nets:['Dialog','Mobitel','Hutch','Airtel'] },
  { code:'AF', name:'أفغانستان',       nets:['Roshan','MTN','Afghan Telecom','Etisalat'] },
  { code:'MV', name:'المالديف',        nets:['Dhiraagu','Ooredoo'] },
  { code:'MM', name:'ميانمار',         nets:['Telenor','Ooredoo','MPT','Mytel'] },
  { code:'TH', name:'تايلاند',         nets:['AIS','DTAC','True Move H'] },
  { code:'VN', name:'فيتنام',          nets:['Viettel','Mobifone','Vinaphone'] },
  { code:'KH', name:'كمبوديا',         nets:['Cellcard','Smart','Metfone'] },
  { code:'LA', name:'لاوس',            nets:['Unitel','Laotel','ETL'] },
  { code:'MY', name:'ماليزيا',         nets:['Celcom','Maxis','Digi','U Mobile'] },
  { code:'SG', name:'سنغافورة',        nets:['Singtel','StarHub','M1'] },
  { code:'ID', name:'إندونيسيا',       nets:['Telkomsel','Indosat','XL Axiata','Tri'] },
  { code:'PH', name:'الفلبين',         nets:['Globe','Smart','DITO'] },
  { code:'CN', name:'الصين',           nets:['China Mobile','China Unicom','China Telecom'] },
  { code:'JP', name:'اليابان',         nets:['NTT DoCoMo','SoftBank','au KDDI'] },
  { code:'KR', name:'كوريا الجنوبية', nets:['SK Telecom','KT','LG U+'] },
  { code:'TW', name:'تايوان',          nets:['Chunghwa','Taiwan Mobile','Far EasTone'] },
  { code:'HK', name:'هونغ كونغ',      nets:['HKT','SmarTone','3 HK','China Mobile HK'] },
  { code:'MN', name:'منغوليا',         nets:['MobiCom','Mobimax','G-Mobile','Unitel'] },
  { code:'KZ', name:'كازاخستان',       nets:['Kazakhtelecom','Beeline','Tele2','Altel'] },
  { code:'UZ', name:'أوزبكستان',       nets:['Ucell','Beeline','MTS','Uzmobile'] },
  { code:'KG', name:'قيرغيزستان',      nets:['Beeline','Megacom','O!'] },
  { code:'TJ', name:'طاجيكستان',       nets:['Tcell','Beeline','MegaFon'] },
  { code:'TM', name:'تركمانستان',      nets:['Altyn Asyr'] },
  { code:'GE', name:'جورجيا',          nets:['Magti','Geocell','Beeline'] },
  { code:'AM', name:'أرمينيا',         nets:['Ucom','Beeline','Veon'] },
  { code:'AZ', name:'أذربيجان',        nets:['Azercell','Bakcell','Nar'] },
  { code:'IL', name:'إسرائيل',         nets:['Cellcom','Partner','Hot Mobile','Pelephone'] },
  // ── Europe ──
  { code:'RU', name:'روسيا',           nets:['MTS','Beeline','MegaFon','Tele2'] },
  { code:'UA', name:'أوكرانيا',        nets:['Kyivstar','Vodafone UA','lifecell'] },
  { code:'BY', name:'بيلاروسيا',       nets:['A1','MTS','life:)'] },
  { code:'MD', name:'مولدوفا',         nets:['Orange','Moldcell','Unite'] },
  { code:'DE', name:'ألمانيا',         nets:['Deutsche Telekom','Vodafone','O2'] },
  { code:'FR', name:'فرنسا',           nets:['Orange','SFR','Bouygues','Free Mobile'] },
  { code:'GB', name:'بريطانيا',        nets:['EE','Vodafone','O2','Three'] },
  { code:'IT', name:'إيطاليا',         nets:['TIM','Vodafone','Wind Tre','Iliad'] },
  { code:'ES', name:'إسبانيا',         nets:['Movistar','Vodafone','Orange','MásMóvil'] },
  { code:'PT', name:'البرتغال',        nets:['NOS','MEO','Vodafone'] },
  { code:'NL', name:'هولندا',          nets:['KPN','Vodafone','T-Mobile','Tele2'] },
  { code:'BE', name:'بلجيكا',          nets:['Proximus','Base','Orange'] },
  { code:'CH', name:'سويسرا',          nets:['Swisscom','Salt','Sunrise'] },
  { code:'AT', name:'النمسا',          nets:['A1','Magenta','Drei'] },
  { code:'SE', name:'السويد',          nets:['Tele2','Telia','Telenor','Tre'] },
  { code:'NO', name:'النرويج',         nets:['Telenor','Telia','Ice'] },
  { code:'DK', name:'الدنمارك',        nets:['TDC','Telenor','Telia','3'] },
  { code:'FI', name:'فنلندا',          nets:['Elisa','Telia','DNA'] },
  { code:'PL', name:'بولندا',          nets:['Orange','Play','T-Mobile','Plus'] },
  { code:'CZ', name:'التشيك',          nets:['T-Mobile','O2','Vodafone'] },
  { code:'SK', name:'سلوفاكيا',        nets:['Slovak Telekom','Orange','O2'] },
  { code:'HU', name:'المجر',           nets:['Magyar Telekom','Telenor','Vodafone'] },
  { code:'RO', name:'رومانيا',         nets:['Orange','Vodafone','Telekom','Digi'] },
  { code:'BG', name:'بلغاريا',         nets:['Vivacom','A1','Telenor'] },
  { code:'GR', name:'اليونان',         nets:['Cosmote','Vodafone','Wind'] },
  { code:'HR', name:'كرواتيا',         nets:['HT','A1','Tele2'] },
  { code:'RS', name:'صربيا',           nets:['mts','Telenor','A1'] },
  { code:'BA', name:'البوسنة',         nets:['BH Telecom','M:tel','HT Eronet'] },
  { code:'AL', name:'ألبانيا',         nets:['Telekom Albania','Vodafone','ALBtelecom'] },
  { code:'ME', name:'الجبل الأسود',    nets:['MTEL','ONE','T-Mobile'] },
  { code:'MK', name:'مقدونيا',         nets:['Makedonski Telekom','A1','Vip'] },
  { code:'SI', name:'سلوفينيا',        nets:['Telekom Slovenije','A1','T-2'] },
  { code:'EE', name:'إستونيا',         nets:['Telia','Elisa','Tele2'] },
  { code:'LV', name:'لاتفيا',          nets:['LMT','Tele2','Bite'] },
  { code:'LT', name:'ليتوانيا',        nets:['Telia','Bite','Tele2'] },
  { code:'IE', name:'أيرلندا',         nets:['Vodafone','Eir','Three'] },
  { code:'CY', name:'قبرص',            nets:['Cyta','MTN','Epic'] },
  { code:'MT', name:'مالطا',           nets:['GO','Epic','Melita'] },
  { code:'LU', name:'لوكسمبورغ',       nets:['POST','Tango','Orange'] },
  { code:'IS', name:'آيسلندا',         nets:['Síminn','Vodafone','Nova'] },
  { code:'XK', name:'كوسوفو',          nets:['Vala','ipko','Z Mobile'] },
  // ── Americas ──
  { code:'US', name:'أمريكا',          nets:['AT&T','Verizon','T-Mobile','Sprint'] },
  { code:'CA', name:'كندا',            nets:['Bell','Rogers','Telus'] },
  { code:'MX', name:'المكسيك',         nets:['Telcel','AT&T','Movistar'] },
  { code:'BR', name:'البرازيل',        nets:['Claro','Tim','Vivo','Oi'] },
  { code:'AR', name:'الأرجنتين',       nets:['Claro','Movistar','Personal'] },
  { code:'CL', name:'تشيلي',           nets:['Entel','Movistar','Claro','WOM'] },
  { code:'CO', name:'كولومبيا',        nets:['Claro','Movistar','Tigo','ETB'] },
  { code:'PE', name:'بيرو',            nets:['Claro','Movistar','Entel','Bitel'] },
  { code:'VE', name:'فنزويلا',         nets:['Movilnet','Movistar','Digitel'] },
  { code:'EC', name:'الإكوادور',       nets:['Claro','Movistar','CNT'] },
  { code:'BO', name:'بوليفيا',         nets:['Tigo','Entel','Viva'] },
  { code:'PY', name:'باراغواي',        nets:['Tigo','Personal','Claro'] },
  { code:'UY', name:'أوروغواي',        nets:['Antel','Claro','Movistar'] },
  { code:'CR', name:'كوستاريكا',       nets:['Movistar','Claro','ICE'] },
  { code:'GT', name:'غواتيمالا',       nets:['Claro','Tigo'] },
  { code:'HN', name:'هندوراس',         nets:['Tigo','Claro','Hondutel'] },
  { code:'SV', name:'السلفادور',       nets:['Tigo','Claro','Movistar'] },
  { code:'NI', name:'نيكاراغوا',       nets:['Claro','Movistar'] },
  { code:'PA', name:'بنما',            nets:['Claro','Movistar','Tigo','+Móvil'] },
  { code:'CU', name:'كوبا',            nets:['ETECSA'] },
  { code:'DO', name:'الدومينيكان',     nets:['Claro','Altice'] },
  { code:'HT', name:'هايتي',           nets:['Digicel','Natcom'] },
  { code:'JM', name:'جامايكا',         nets:['Digicel','Flow'] },
  { code:'TT', name:'ترينيداد',        nets:['Digicel','TSTT'] },
  // ── Oceania ──
  { code:'AU', name:'أستراليا',        nets:['Telstra','Optus','Vodafone'] },
  { code:'NZ', name:'نيوزيلندا',       nets:['Spark','Vodafone','2degrees'] },
  { code:'FJ', name:'فيجي',            nets:['Vodafone','Digicel'] },
  { code:'PG', name:'بابوا غينيا',     nets:['Digicel','Bemobile'] },
  // ── جزر المحيط الهادئ (إضافية) ──
  { code:'SB', name:'جزر سليمان',       nets:['Our Telekom','Bmobile'] },
  { code:'VU', name:'فانواتو',           nets:['Digicel','TVL'] },
  { code:'WS', name:'ساموا',             nets:['Digicel','Bluesky'] },
  { code:'TO', name:'تونغا',             nets:['Digicel','TCC'] },
  { code:'KI', name:'كيريباتي',          nets:['Kiribati Telecom'] },
  { code:'NR', name:'ناورو',             nets:['Digicel'] },
  { code:'TV', name:'توفالو',            nets:['Tuvalu Telecom'] },
  { code:'PW', name:'بالاو',             nets:['PNCC'] },
  { code:'MH', name:'جزر مارشال',        nets:['NTSC'] },
  { code:'FM', name:'ميكرونيزيا',        nets:['FSM Telecom','Docomo Pacific'] },
  // ── آسيا (متبقية) ──
  { code:'MO', name:'ماكاو',             nets:['CTM','Hutchison','3 Macau'] },
  { code:'BN', name:'بروناي',            nets:['DST','Progresif'] },
  { code:'TL', name:'تيمور الشرقية',     nets:['Timor Telecom','Telemor','Telkomcel'] },
  { code:'BT', name:'بوتان',             nets:['TashiCell','B-Mobile'] },
  { code:'KP', name:'كوريا الشمالية',    nets:['Koryolink'] },
  // ── أوروبا (دول صغيرة) ──
  { code:'AD', name:'أندورا',            nets:['Andorra Telecom'] },
  { code:'MC', name:'موناكو',            nets:['Monaco Telecom'] },
  { code:'SM', name:'سان مارينو',        nets:['San Marino Telecom'] },
  { code:'LI', name:'ليختنشتاين',        nets:['Salt','Liechtenstein Telecom'] },
  { code:'VA', name:'الفاتيكان',         nets:['Vatican Telecom'] },
  // ── الكاريبي وأمريكا اللاتينية (متبقية) ──
  { code:'AG', name:'أنتيغوا وبربودا',   nets:['Digicel','Flow'] },
  { code:'BB', name:'بربادوس',           nets:['Digicel','Flow'] },
  { code:'BS', name:'جزر البهاما',        nets:['BTC','Aliv'] },
  { code:'BZ', name:'بليز',              nets:['Belize Telemedia','Smart'] },
  { code:'DM', name:'دومينيكا',          nets:['Digicel','Flow'] },
  { code:'GD', name:'غرينادا',           nets:['Digicel','Flow'] },
  { code:'GY', name:'غيانا',             nets:['GTT','Digicel'] },
  { code:'KN', name:'سانت كيتس ونيفيس', nets:['Digicel','Flow'] },
  { code:'LC', name:'سانت لوسيا',        nets:['Digicel','Flow'] },
  { code:'SR', name:'سورينام',           nets:['Telesur','Digicel'] },
  { code:'VC', name:'سانت فنسنت',        nets:['Digicel','Flow'] },
];

const COUNTRY_MAP = Object.fromEntries(COUNTRIES.map(c => [c.code, c]));
const PER_PAGE = 20;
const TOTAL_PAGES = Math.ceil(COUNTRIES.length / PER_PAGE);

// ── Keyboards ─────────────────────────────────────────────────────────────────

function mainMenu() {
  return {
    inline_keyboard: [
      [
        { text: '➕ إضافة رقم', callback_data: 'ADD' },
        { text: '🗑 حذف رقم',   callback_data: 'DEL' },
      ],
      [
        { text: '📋 قائمة الأرقام', callback_data: 'LIST' },
        { text: '📊 إحصائيات',      callback_data: 'STATS' },
      ],
    ],
  };
}

function countryPage(page) {
  const slice = COUNTRIES.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const rows = [];
  for (let i = 0; i < slice.length; i += 2) {
    const row = [];
    const c1 = slice[i];
    row.push({ text: `${flag(c1.code)} ${c1.name}`, callback_data: `C:${c1.code}` });
    if (slice[i + 1]) {
      const c2 = slice[i + 1];
      row.push({ text: `${flag(c2.code)} ${c2.name}`, callback_data: `C:${c2.code}` });
    }
    rows.push(row);
  }
  // Navigation row
  const nav = [];
  if (page > 0)                nav.push({ text: '◀️ السابق', callback_data: `P:${page - 1}` });
  nav.push({ text: `📄 ${page + 1} / ${TOTAL_PAGES}`, callback_data: 'NOOP' });
  if (page < TOTAL_PAGES - 1) nav.push({ text: 'التالي ▶️', callback_data: `P:${page + 1}` });
  rows.push(nav);
  rows.push([{ text: '🏠 الرئيسية', callback_data: 'HOME' }]);
  return { inline_keyboard: rows };
}

function networkMenu(countryCode) {
  const c = COUNTRY_MAP[countryCode];
  if (!c) return mainMenu();
  const rows = c.nets.map(n => [{ text: `📶 ${n}`, callback_data: `N:${countryCode}:${n}` }]);
  rows.push([{ text: '◀️ عودة للدول', callback_data: 'P:0' }]);
  rows.push([{ text: '🏠 الرئيسية', callback_data: 'HOME' }]);
  return { inline_keyboard: rows };
}

// ── State per chat: null | { step:'enterPhone', country, net } | { step:'enterDel' } ──
const chatState = {};

// ── helpers ───────────────────────────────────────────────────────────────────

function sendMain(chatId, text) {
  chatState[chatId] = null;
  return bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: mainMenu() });
}

function editMain(chatId, msgId, text) {
  chatState[chatId] = null;
  return bot.editMessageText(text, {
    chat_id: chatId, message_id: msgId,
    parse_mode: 'HTML', reply_markup: mainMenu(),
  }).catch(() => sendMain(chatId, text));
}

// ── /start ────────────────────────────────────────────────────────────────────

bot.onText(/\/start/, msg => {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) return bot.sendMessage(chatId, '⛔ غير مصرح.');
  sendMain(chatId,
    '👋 <b>مرحباً!</b> أنا بوت إدارة أرقام واتساب.\n\nاختر أحد الخيارات:'
  );
});

// ── /add /remove /list /check /stats (command shortcuts) ─────────────────────

bot.onText(/^\/list$/, msg => {
  if (!isAdmin(msg.chat.id)) return;
  handleList(msg.chat.id, null);
});

bot.onText(/^\/stats$/, msg => {
  if (!isAdmin(msg.chat.id)) return;
  handleStats(msg.chat.id, null);
});

bot.onText(/\/add (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) return;
  const phone = match[1].replace(/\D/g, '');
  if (!phone) return bot.sendMessage(chatId, '⚠️ رقم غير صحيح.');
  const added = db.addPhone(phone, chatId);
  sendMain(chatId, added
    ? `✅ تم إضافة الرقم <code>${phone}</code>`
    : `ℹ️ الرقم <code>${phone}</code> موجود مسبقًا`
  );
});

bot.onText(/\/remove (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) return;
  const phone = match[1].replace(/\D/g, '');
  if (!phone) return bot.sendMessage(chatId, '⚠️ رقم غير صحيح.');
  const removed = db.removePhone(phone);
  sendMain(chatId, removed
    ? `🗑 تم حذف الرقم <code>${phone}</code>`
    : `⚠️ الرقم <code>${phone}</code> غير موجود`
  );
});

bot.onText(/\/check (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) return;
  const phone = match[1].replace(/\D/g, '');
  const ok = db.isAllowed(phone);
  sendMain(chatId, ok
    ? `✅ الرقم <code>${phone}</code> <b>مسموح</b> له.`
    : `❌ الرقم <code>${phone}</code> <b>غير مسموح</b> له.`
  );
});

// ── Inline button callbacks ───────────────────────────────────────────────────

bot.on('callback_query', async cq => {
  const chatId = cq.message.chat.id;
  const msgId  = cq.message.message_id;
  const data   = cq.data;

  await bot.answerCallbackQuery(cq.id).catch(() => {});

  if (!isAdmin(chatId)) return;

  // ── Home ──
  if (data === 'HOME') return editMain(chatId, msgId, '🏠 القائمة الرئيسية:');

  // ── NOOP (page indicator) ──
  if (data === 'NOOP') return;

  // ── Add → show country page 0 ──
  if (data === 'ADD') {
    chatState[chatId] = null;
    return bot.editMessageText('🌍 <b>اختر الدولة:</b>', {
      chat_id: chatId, message_id: msgId,
      parse_mode: 'HTML', reply_markup: countryPage(0),
    }).catch(() =>
      bot.sendMessage(chatId, '🌍 <b>اختر الدولة:</b>',
        { parse_mode: 'HTML', reply_markup: countryPage(0) })
    );
  }

  // ── Pagination ──
  if (data.startsWith('P:')) {
    const page = parseInt(data.slice(2), 10);
    return bot.editMessageText('🌍 <b>اختر الدولة:</b>', {
      chat_id: chatId, message_id: msgId,
      parse_mode: 'HTML', reply_markup: countryPage(page),
    }).catch(() =>
      bot.sendMessage(chatId, '🌍 <b>اختر الدولة:</b>',
        { parse_mode: 'HTML', reply_markup: countryPage(page) })
    );
  }

  // ── Country selected → show networks ──
  if (data.startsWith('C:')) {
    const code = data.slice(2);
    const country = COUNTRY_MAP[code];
    if (!country) return;
    chatState[chatId] = null;
    return bot.editMessageText(
      `${flag(code)} <b>${country.name}</b>\n\n📶 اختر الشبكة:`, {
      chat_id: chatId, message_id: msgId,
      parse_mode: 'HTML', reply_markup: networkMenu(code),
    }).catch(() =>
      bot.sendMessage(chatId, `${flag(code)} <b>${country.name}</b>\n\n📶 اختر الشبكة:`,
        { parse_mode: 'HTML', reply_markup: networkMenu(code) })
    );
  }

  // ── Network selected → ask for phone number ──
  if (data.startsWith('N:')) {
    const [, code, ...netParts] = data.split(':');
    const net     = netParts.join(':');
    const country = COUNTRY_MAP[code];
    chatState[chatId] = { step: 'enterPhone', country: code, net };
    return bot.editMessageText(
      `${flag(code)} <b>${country.name}</b> — 📶 ${net}\n\n📱 <b>أرسل رقم الهاتف المراد إضافته</b>\n<i>(أرقام فقط، مثال: 737172794)</i>`, {
      chat_id: chatId, message_id: msgId,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: '❌ إلغاء', callback_data: 'HOME' }]] },
    }).catch(() =>
      bot.sendMessage(chatId,
        `${flag(code)} <b>${country.name}</b> — 📶 ${net}\n\n📱 أرسل رقم الهاتف:`,
        { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '❌ إلغاء', callback_data: 'HOME' }]] } })
    );
  }

  // ── Delete ──
  if (data === 'DEL') {
    chatState[chatId] = { step: 'enterDel' };
    return bot.editMessageText('🗑 <b>أرسل رقم الهاتف الذي تريد حذفه:</b>', {
      chat_id: chatId, message_id: msgId,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: '❌ إلغاء', callback_data: 'HOME' }]] },
    }).catch(() =>
      bot.sendMessage(chatId, '🗑 أرسل رقم الهاتف الذي تريد حذفه:',
        { reply_markup: { inline_keyboard: [[{ text: '❌ إلغاء', callback_data: 'HOME' }]] } })
    );
  }

  // ── List ──
  if (data === 'LIST') return handleList(chatId, msgId);

  // ── Stats ──
  if (data === 'STATS') return handleStats(chatId, msgId);
});

// ── Text messages (phone number input) ───────────────────────────────────────

bot.on('message', msg => {
  const chatId = msg.chat.id;
  const text   = (msg.text || '').trim();
  if (!text || text.startsWith('/')) return;
  if (!isAdmin(chatId)) return;

  const s = chatState[chatId];
  if (!s) return;

  // ── Phone input for ADD ──
  if (s.step === 'enterPhone') {
    chatState[chatId] = null;
    const phone = text.replace(/\D/g, '');
    if (!phone) {
      return bot.sendMessage(chatId, '⚠️ رقم غير صحيح، حاول مجددًا أو اضغط إلغاء.',
        { reply_markup: { inline_keyboard: [[{ text: '🏠 الرئيسية', callback_data: 'HOME' }]] } });
    }
    const country = COUNTRY_MAP[s.country];
    const added   = db.addPhone(phone, chatId, `${country?.name || s.country} / ${s.net}`);
    const emoji   = s.country ? flag(s.country) : '🌍';
    return sendMain(chatId, added
      ? `✅ <b>تم الحفظ!</b>\n\n${emoji} <b>${country?.name || s.country}</b> — 📶 ${s.net}\n📱 الرقم: <code>${phone}</code>`
      : `ℹ️ الرقم <code>${phone}</code> موجود مسبقًا في القاعدة.`
    );
  }

  // ── Phone input for DELETE ──
  if (s.step === 'enterDel') {
    chatState[chatId] = null;
    const phone = text.replace(/\D/g, '');
    if (!phone) {
      return bot.sendMessage(chatId, '⚠️ رقم غير صحيح.',
        { reply_markup: { inline_keyboard: [[{ text: '🏠 الرئيسية', callback_data: 'HOME' }]] } });
    }
    const removed = db.removePhone(phone);
    return sendMain(chatId, removed
      ? `🗑 تم حذف الرقم <code>${phone}</code> بنجاح.`
      : `⚠️ الرقم <code>${phone}</code> غير موجود في القاعدة.`
    );
  }
});

// ── List handler ──────────────────────────────────────────────────────────────

function handleList(chatId, msgId) {
  const phones = db.listPhones();
  if (phones.length === 0) {
    const text = '📋 <b>لا توجد أرقام مسموح بها حاليًا.</b>';
    return msgId
      ? bot.editMessageText(text, { chat_id: chatId, message_id: msgId, parse_mode: 'HTML', reply_markup: mainMenu() }).catch(() => sendMain(chatId, text))
      : sendMain(chatId, text);
  }
  const lines = phones.map((p, i) =>
    `${i + 1}. <code>${p.phone}</code>${p.note ? ` — ${p.note}` : ''}  <i>${(p.added_at || '').slice(0, 10)}</i>`
  ).join('\n');
  const text = `📋 <b>الأرقام المسموح بها (${phones.length}):</b>\n\n${lines}`;
  return msgId
    ? bot.editMessageText(text, { chat_id: chatId, message_id: msgId, parse_mode: 'HTML', reply_markup: mainMenu() }).catch(() => sendMain(chatId, text))
    : sendMain(chatId, text);
}

// ── Stats handler ─────────────────────────────────────────────────────────────

function handleStats(chatId, msgId) {
  const text = `📊 <b>إحصائيات:</b>\n• إجمالي الأرقام المسموح بها: <b>${db.count()}</b>`;
  return msgId
    ? bot.editMessageText(text, { chat_id: chatId, message_id: msgId, parse_mode: 'HTML', reply_markup: mainMenu() }).catch(() => sendMain(chatId, text))
    : sendMain(chatId, text);
}

console.log('🤖 Telegram bot is running...');
module.exports = bot;
