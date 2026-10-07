// build.js — দৈনিক করবার্তা SEO builder (প্রফেশনাল লেআউট)
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://dainikkorbarta.com';

// [নতুন] ইংরেজি নাম — টাইটেল ও ডেসক্রিপশনে কমন কিওয়ার্ড হিসেবে ব্যবহার হবে
const SITE_NAME_EN = 'Dainik Korbarta';

const BN_WEEKDAYS = ['রবিবার','সোমবার','মঙ্গলবার','বুধবার','বৃহস্পতিবার','শুক্রবার','শনিবার'];
const BN_MONTHS = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
const BN_DIGITS = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
const EN_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const HIJRI_MONTHS_BN = ['মহররম','সফর','রবিউল আউয়াল','রবিউস সানি','জমাদিউল আউয়াল','জমাদিউস সানি','রজব','শাবান','রমজান','শাওয়াল','জিলকদ','জিলহজ'];

// [নতুন] বঙ্গাব্দের মাসের নাম
const BANGLA_CAL_MONTHS = ['বৈশাখ','জ্যৈষ্ঠ','আষাঢ়','শ্রাবণ','ভাদ্র','আশ্বিন','কার্তিক','অগ্রহায়ণ','পৌষ','মাঘ','ফাল্গুন','চৈত্র'];

// [নতুন] 'সাহিত্য পাতা' যোগ করা হয়েছে
const CATEGORY_ORDER = ['সারাদেশ','জাতীয়','অর্থনীতি','খেলা','বিনোদন','রাজনীতি','বিজ্ঞান ও প্রযুক্তি','আন্তর্জাতিক','যোগাযোগ','মতামত','সাহিত্য পাতা'];

// [নতুন] 'সাহিত্য পাতা' যোগ করা হয়েছে (কোনো লেখা না থাকলেও মেনুতে দেখাবে)
const NAV_EXTRA_CATEGORIES = ['রাজনীতি','বিজ্ঞান ও প্রযুক্তি','স্বাস্থ্য','পাঠক সংবাদ','জেলা সংবাদ','মফস্বল সংবাদ','সাহিত্য পাতা'];

// [নতুন] খবরের পাতার তারিখের রং (হালকা সবুজ, গাঢ় নয়)
const DATE_COLOR = '#43A047';

// [নতুন] twistcircle ব্যানার — ছবি GitHub রিপোর মূল জায়গায় 'twistcircle-banner.png' নামে থাকবে
// ক্লিক করলে আপাতত দৈনিক করবার্তার ফেসবুক পেজে যাবে; অ্যাপ Play Store-এ এলে শুধু এই লিংকটা বদলালেই হবে
const TWISTCIRCLE_BANNER_IMG = '/twistcircle-banner.png';
const TWISTCIRCLE_LINK = 'https://www.facebook.com/share/1JY87mNj5v/';

function toBnNumber(n){
  return String(n).split('').map(ch => /\d/.test(ch) ? BN_DIGITS[ch] : ch).join('');
}
function formatDateBn(d){
  return `${BN_WEEKDAYS[d.getDay()]}, ${toBnNumber(d.getDate())} ${BN_MONTHS[d.getMonth()]} ${toBnNumber(d.getFullYear())}`;
}
function formatDateTimeBn(d){
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${formatDateBn(d)}, ${toBnNumber(h)}:${toBnNumber(mm)} ${ampm}`;
}
function formatDateEn(d){
  return `${d.getDate()} ${EN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// [নতুন] বাংলাদেশের সংশোধিত বাংলা বর্ষপঞ্জি (১৪ এপ্রিল = ১ বৈশাখ) অনুযায়ী বঙ্গাব্দ
function gregorianToBangla(date){
  const y = date.getFullYear();
  const today = Date.UTC(y, date.getMonth(), date.getDate());
  let startYear = y;
  if (today < Date.UTC(y, 3, 14)) startYear = y - 1;
  const start = Date.UTC(startYear, 3, 14);
  let days = Math.round((today - start) / 86400000);
  const nextY = startYear + 1;
  const isLeap = (nextY % 4 === 0 && nextY % 100 !== 0) || nextY % 400 === 0;
  const lengths = [31,31,31,31,31,31,30,30,30,30,isLeap ? 30 : 29,30];
  let m = 0;
  while (m < 11 && days >= lengths[m]) { days -= lengths[m]; m++; }
  return { day: days + 1, month: m, year: startYear - 593 };
}
function formatBanglaCalBn(date){
  const b = gregorianToBangla(date);
  return `${BN_WEEKDAYS[date.getDay()]}, ${toBnNumber(b.day)} ${BANGLA_CAL_MONTHS[b.month]} ${toBnNumber(b.year)} বঙ্গাব্দ`;
}

function gregorianToHijri(date){
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  let jd = Math.floor((1461 * (year + 4800 + Math.floor((month - 14) / 12))) / 4) +
    Math.floor((367 * (month - 2 - 12 * Math.floor((month - 14) / 12))) / 12) -
    Math.floor((3 * Math.floor((year + 4900 + Math.floor((month - 14) / 12)) / 100)) / 4) +
    day - 32075;
  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const hMonth = Math.floor((24 * l) / 709);
  const hDay = l - Math.floor((709 * hMonth) / 24);
  const hYear = 30 * n + j - 30;
  return { day: hDay, month: hMonth, year: hYear };
}
function formatHijriBn(date){
  const h = gregorianToHijri(date);
  return `${toBnNumber(h.day)} ${HIJRI_MONTHS_BN[h.month - 1]} ${toBnNumber(h.year)} হিজরি`;
}
function escapeHtml(str){
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function bodyToHtml(body){
  return (body || '').split(/\n\s*\n/).map(p => `<p>${escapeHtml(p).replace(/\n/g,'<br>')}</p>`).join('\n');
}
function slugify(title, index){
  const base = String(title)
    .trim()
    .replace(/["""'',.!?()\[\]:;]/g, '')
    .replace(/\s+/g, '-');
  return `${base}-${index}`;
}
function catSlugify(cat){
  return String(cat).trim().replace(/\s+/g, '-');
}

// [নতুন] ছবির ঠিকানা পূর্ণাঙ্গ (https://...) করা
function absUrl(u){
  if (!u) return '';
  if (/^https?:\/\//.test(u)) return u;
  return SITE_URL + (String(u).startsWith('/') ? u : '/' + u);
}

// [নতুন] নিরাপদভাবে তারিখকে ISO ফরম্যাটে রূপান্তর (ভুল তারিখ থাকলে build বন্ধ হবে না)
function safeIso(value, fallback){
  const d = new Date(value);
  return isNaN(d.getTime()) ? fallback.toISOString() : d.toISOString();
}

// [নতুন] Google NewsArticle structured data (JSON-LD)
function newsArticleSchema(a, canonical){
  const data = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "mainEntityOfPage": { "@type": "WebPage", "@id": canonical },
    "headline": String(a.title || '').slice(0, 110),
    "image": [a.image ? absUrl(a.image) : `${SITE_URL}/logo.png`],
    "datePublished": safeIso(a.date, BUILD_TIME),
    "dateModified": safeIso(a.updated || a.date, BUILD_TIME),
    "author": a.reporter
      ? [{ "@type": "Person", "name": String(a.reporter) }]
      : [{ "@type": "Organization", "name": SITE_TITLE, "url": SITE_URL }],
    "publisher": {
      "@type": "Organization",
      "name": SITE_TITLE,
      "logo": { "@type": "ImageObject", "url": `${SITE_URL}/logo.png` }
    },
    "description": String(a.body || '').replace(/\s+/g, ' ').trim().slice(0, 160)
  };
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return '<script type="application/ld+json">' + json + '</script>';
}

function readJson(p){ return JSON.parse(fs.readFileSync(p, 'utf8')); }

const articlesData = readJson('content/articles.json');
const settings = readJson('content/settings.json');
const articles = articlesData.articles || [];

if (fs.existsSync('article')) fs.rmSync('article', { recursive: true, force: true });
// [নতুন] ছোট লিংকের ফোল্ডার (/news/) প্রতিবার নতুন করে তৈরি হবে
if (fs.existsSync('news')) fs.rmSync('news', { recursive: true, force: true });
if (fs.existsSync('category')) fs.rmSync('category', { recursive: true, force: true });
fs.mkdirSync('article');
fs.mkdirSync('news');

const urls = [`${SITE_URL}/`];
// [নতুন] সাইটম্যাপে প্রতিটি পাতার শেষ আপডেটের সময় (lastmod)
const lastmodMap = {};

const SITE_TITLE = settings.site_title || 'দৈনিক করবার্তা';
const SITE_TAGLINE = settings.tagline || '';
const BUILD_TIME = new Date();

const foundCategories = [...new Set(articles.map(a => a.category).filter(Boolean))];
const categories = [
  ...CATEGORY_ORDER.filter(c => foundCategories.includes(c)),
  ...foundCategories.filter(c => !CATEGORY_ORDER.includes(c))
];

NAV_EXTRA_CATEGORIES.forEach(c => {
  if (!categories.includes(c)) categories.push(c);
});

// [নতুন] পুরো সাইটের Schema.org তথ্য (সংবাদমাধ্যম + ওয়েবসাইট) — প্রতিটি পাতায় বসবে
function siteSchema(){
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsMediaOrganization",
        "@id": `${SITE_URL}/#organization`,
        "name": SITE_TITLE,
        "alternateName": SITE_NAME_EN,
        "url": `${SITE_URL}/`,
        "logo": { "@type": "ImageObject", "url": `${SITE_URL}/logo.png` },
        "email": "dainikkorbarta@gmail.com",
        "sameAs": [
          "https://www.facebook.com/share/1JY87mNj5v/",
          "https://x.com/dainikkorbarta"
        ]
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        "url": `${SITE_URL}/`,
        "name": SITE_TITLE,
        "alternateName": SITE_NAME_EN,
        "inLanguage": "bn",
        "publisher": { "@id": `${SITE_URL}/#organization` }
      }
    ]
  };
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return '<script type="application/ld+json">' + json + '</script>';
}

// [পরিবর্তিত] সম্পূর্ণ Open Graph, Twitter কার্ড, Schema ও আপডেটের সময় যোগ করা হয়েছে
// [পরিবর্তিত] হোমপেজ এখন ৩ কলাম: বামে বিজ্ঞাপন বক্স, মাঝে খবর, ডানে সর্বশেষ
// [নতুন] প্রধান খবর ও খবরের পাতার ছবি এখন সবসময় একই মাপে (১৬:৯) দেখাবে
// [পরিবর্তিত] ছবি কাটার সময় ওপরের অংশ রাখা হয় — যাতে মানুষের মাথা/মুখ কেটে না যায়
function pageHead(title, desc, canonical, ogImage, extraHead, ogType, updatedIso){
  const img = ogImage ? absUrl(ogImage) : `${SITE_URL}/logo.png`;
  const updated = updatedIso || BUILD_TIME.toISOString();
  return `<meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="${ogType || 'website'}">
  <meta property="og:site_name" content="${escapeHtml(SITE_TITLE)}">
  <meta property="og:locale" content="bn_BD">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(desc)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${escapeHtml(img)}">
  <meta property="og:image:alt" content="${escapeHtml(title)}">
  <meta property="og:updated_time" content="${updated}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@dainikkorbarta">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(desc)}">
  <meta name="twitter:image" content="${escapeHtml(img)}">
  ${siteSchema()}
  <link rel="stylesheet" href="/style.css">
  <style>
    @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
    .breaking-track { display:inline-block; white-space:nowrap; animation: marquee 25s linear infinite; }
    .home-grid { display:grid; grid-template-columns:190px minmax(0,1fr) 300px; gap:24px; align-items:start; }
    .home-grid .news-grid { grid-template-columns:repeat(2, minmax(0,1fr)); }
    .promo-col { position:sticky; top:12px; }
    @media (max-width: 1050px) {
      .home-grid { grid-template-columns:190px minmax(0,1fr); }
      .home-grid > .sidebar-col { grid-column:1 / -1; }
    }
    @media (max-width: 800px) {
      .home-grid { grid-template-columns:minmax(0,1fr); }
      .promo-col { position:static; }
      .promo-box { min-height:0; }
    }
    @media (max-width: 520px) { .home-grid .news-grid { grid-template-columns:minmax(0,1fr); } }
    .promo-box { width:100%; min-height:288px; box-sizing:border-box; background:#EAF3DE; border:2px solid #3B6D11; border-radius:8px; padding:14px 10px; text-align:center; display:flex; flex-direction:column; justify-content:space-between; gap:10px; }
    .promo-box .promo-label { background:#3B6D11; color:#fff; font-size:12px; padding:4px; border-radius:4px; }
    .promo-box .promo-main { margin:0; font-size:15px; font-weight:bold; line-height:1.55; color:#27500A; }
    .promo-box .promo-ad { margin:0; font-size:15px; font-weight:bold; line-height:1.55; color:#993C1D; }
    .promo-box .promo-contact { border-top:1px dashed #3B6D11; padding-top:8px; font-size:12px; line-height:1.7; color:#27500A; word-break:break-all; }
    .promo-box .promo-contact a { color:#27500A; text-decoration:none; }
    .news-row { display:flex; gap:14px; align-items:flex-start; text-decoration:none; color:inherit; padding:14px 0; border-bottom:1px solid #eee; }
    .news-row .row-img { width:150px; height:100px; object-fit:cover; object-position:center top; border-radius:6px; flex-shrink:0; }
    .news-row .row-text { flex:1; min-width:0; }
    .news-row .row-title { font-size:1.05rem; margin:4px 0; line-height:1.45; }
    .news-row .row-excerpt { font-size:14px; color:#555; margin:4px 0 6px; line-height:1.55; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
    @media (max-width: 480px) {
      .news-row .row-img { width:110px; height:78px; }
      .news-row .row-title { font-size:1rem; }
    }
    .news-grid { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:18px; }
    @media (max-width: 900px) { .news-grid { grid-template-columns:repeat(2, minmax(0,1fr)); } }
    @media (max-width: 520px) { .news-grid { grid-template-columns:minmax(0,1fr); } }
    .hero-img { width:100%; aspect-ratio:16/9; object-fit:cover; object-position:center top; display:block; border-radius:8px; margin-bottom:12px; background:#f0f4f2; }
    .article-img { width:100%; aspect-ratio:16/9; object-fit:cover; object-position:center top; display:block; border-radius:8px; margin-bottom:16px; background:#f0f4f2; }
    .news-card { display:flex; flex-direction:column; text-decoration:none; color:inherit; background:#fff; border:1px solid #e6e6e6; border-radius:8px; overflow:hidden; }
    .news-card:hover { border-color:#1a5276; }
    .news-card .card-img { width:100%; aspect-ratio:16/10; object-fit:cover; object-position:center top; display:block; background:#f0f4f2; }
    .news-card .card-noimg { width:100%; aspect-ratio:16/10; display:flex; align-items:center; justify-content:center; background:#eef4f0; }
    .news-card .card-noimg img { width:64px; height:64px; border-radius:50%; opacity:.85; }
    .news-card .card-body { padding:10px 12px 12px; display:flex; flex-direction:column; flex:1; }
    .news-card .card-title { font-size:1rem; margin:4px 0 6px; line-height:1.45; }
    .news-card .card-excerpt { font-size:13.5px; color:#555; margin:0 0 8px; line-height:1.55; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
    .news-card .meta { margin-top:auto; font-size:12px; }
    .related-news { margin-top:36px; padding-top:18px; border-top:2px solid #1a5276; }
    .related-news h2 { margin:0 0 14px; font-size:1.25rem; color:#1a5276; }
    .related-grid { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:16px; }
    @media (max-width: 520px) { .related-grid { grid-template-columns:minmax(0,1fr); } }
    .tc-banner { display:block; margin:0 auto; text-align:center; }
    .tc-banner img { display:block; width:100%; height:auto; border-radius:10px; }
    .tc-banner-home { margin-top:16px; }
    .tc-banner-article { max-width:360px; margin:32px auto 0; }
    @media (max-width: 800px) { .tc-banner-home { max-width:320px; } }
  </style>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-MX0Q3361L2"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-MX0Q3361L2');
  </script>
  ${extraHead || ''}`;
}

function categoryNav(){
  const links = categories.map(c =>
    `<a href="/category/${catSlugify(c)}/" style="padding:8px 14px;text-decoration:none;color:#222;font-size:14px;white-space:nowrap;">${escapeHtml(c)}</a>`
  ).join('');
  return `<nav style="border-top:1px solid #eee;border-bottom:1px solid #eee;overflow-x:auto;white-space:nowrap;background:#fafafa;">
    <a href="/" style="padding:8px 14px;text-decoration:none;color:#1a5276;font-weight:bold;font-size:14px;">প্রচ্ছদ</a><a href="/" style="padding:8px 14px;text-decoration:none;color:#222;font-size:14px;white-space:nowrap;">সর্বশেষ</a>${links}
  </nav>`;
}

function breakingNewsBar(){
  const latest3 = sortedArticles.slice(0, 3).map(a => escapeHtml(a.title));
  const text = latest3.join('   ●   ');
  return `<div style="background:#1a5276;color:#fff;display:flex;align-items:center;overflow:hidden;">
    <span style="background:#123a58;padding:8px 14px;font-weight:bold;font-size:13px;flex-shrink:0;white-space:nowrap;">ব্রেকিং নিউজ</span>
    <div style="overflow:hidden;flex:1;">
      <div class="breaking-track" style="padding:8px 0;font-size:13px;">${text || 'কোনো সংবাদ নেই'}</div>
    </div>
  </div>`;
}

function searchBox(){
  return `<form action="https://www.google.com/search" method="get" target="_blank" style="display:flex;gap:0;">
    <input type="hidden" name="as_sitesearch" value="dainikkorbarta.com">
    <input type="text" name="q" placeholder="অনুসন্ধান করুন..." style="padding:6px 10px;border:1px solid #ccc;border-radius:4px 0 0 4px;font-size:13px;width:160px;">
    <button type="submit" style="padding:6px 12px;border:1px solid #1a5276;background:#1a5276;color:#fff;border-radius:0 4px 4px 0;cursor:pointer;font-size:13px;">খুঁজুন</button>
  </form>`;
}

function topBar(){
  return `<div style="background:#f5f5f5;border-bottom:1px solid #eee;">
    <div class="wrap" style="display:flex;justify-content:flex-end;padding:6px 20px;">
      <a href="/epaper/" style="font-size:13px;color:#1a5276;text-decoration:none;font-weight:bold;">📰 ই-পেপার</a>
    </div>
  </div>`;
}

// [পরিবর্তিত] মাঝের তারিখ এখন বঙ্গাব্দে (যেমন: সোমবার, ১৩ আশ্বিন ১৪৩৩ বঙ্গাব্দ)
function siteHeader(){
  return `${topBar()}
  <header class="masthead">
    <div class="wrap" style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;padding:20px;">
      <a href="/" style="text-decoration:none;color:inherit;">
        <div style="display:flex;align-items:center;justify-content:center;gap:14px;">
          <img src="/logo.png" alt="${escapeHtml(SITE_TITLE)}" style="height:64px;width:64px;border-radius:50%;flex-shrink:0;">
          <h1 style="margin:0;text-align:center;">${escapeHtml(SITE_TITLE)}</h1>
        </div>
        <p class="tagline" style="margin:6px auto 0;text-align:center;">${escapeHtml(SITE_TAGLINE)}</p>
        <p id="today-date" style="margin:6px auto 0;font-size:11px;color:#888;text-align:center;">${formatDateEn(BUILD_TIME)} | ${formatBanglaCalBn(BUILD_TIME)} | ${formatHijriBn(BUILD_TIME)}</p>
        <script>
        (function(){
          var bnDigits=['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
          var bnWeekdays=['রবিবার','সোমবার','মঙ্গলবার','বুধবার','বৃহস্পতিবার','শুক্রবার','শনিবার'];
          var bnCalMonths=['বৈশাখ','জ্যৈষ্ঠ','আষাঢ়','শ্রাবণ','ভাদ্র','আশ্বিন','কার্তিক','অগ্রহায়ণ','পৌষ','মাঘ','ফাল্গুন','চৈত্র'];
          var enMonths=['January','February','March','April','May','June','July','August','September','October','November','December'];
          var hijriMonths=['মহররম','সফর','রবিউল আউয়াল','রবিউস সানি','জমাদিউল আউয়াল','জমাদিউস সানি','রজব','শাবান','রমজান','শাওয়াল','জিলকদ','জিলহজ'];
          function toBn(n){ return String(n).split('').map(function(ch){ return /\d/.test(ch)?bnDigits[ch]:ch; }).join(''); }
          function banglaCal(d){
            var y=d.getFullYear();
            var today=Date.UTC(y,d.getMonth(),d.getDate());
            var startYear=(today<Date.UTC(y,3,14))?y-1:y;
            var days=Math.round((today-Date.UTC(startYear,3,14))/86400000);
            var ny=startYear+1;
            var leap=(ny%4===0&&ny%100!==0)||ny%400===0;
            var lengths=[31,31,31,31,31,31,30,30,30,30,leap?30:29,30];
            var m=0;
            while(m<11&&days>=lengths[m]){ days-=lengths[m]; m++; }
            return bnWeekdays[d.getDay()]+', '+toBn(days+1)+' '+bnCalMonths[m]+' '+toBn(startYear-593)+' বঙ্গাব্দ';
          }
          function enDate(d){ return d.getDate()+' '+enMonths[d.getMonth()]+' '+d.getFullYear(); }
          function toHijri(date){
            var day=date.getDate(), month=date.getMonth()+1, year=date.getFullYear();
            var jd=Math.floor((1461*(year+4800+Math.floor((month-14)/12)))/4)+Math.floor((367*(month-2-12*Math.floor((month-14)/12)))/12)-Math.floor((3*Math.floor((year+4900+Math.floor((month-14)/12))/100))/4)+day-32075;
            var l=jd-1948440+10632;
            var n=Math.floor((l-1)/10631);
            l=l-10631*n+354;
            var j=Math.floor((10985-l)/5316)*Math.floor((50*l)/17719)+Math.floor(l/5670)*Math.floor((43*l)/15238);
            l=l-Math.floor((30-j)/15)*Math.floor((17719*j)/50)-Math.floor(j/16)*Math.floor((15238*j)/43)+29;
            var hMonth=Math.floor((24*l)/709);
            var hDay=l-Math.floor((709*hMonth)/24);
            var hYear=30*n+j-30;
            return {day:hDay,month:hMonth,year:hYear};
          }
          function hijriDate(d){
            var h=toHijri(d);
            return toBn(h.day)+' '+hijriMonths[h.month-1]+' '+toBn(h.year)+' হিজরি';
          }
          var now=new Date();
          var el=document.getElementById('today-date');
          if(el) el.textContent = enDate(now)+' | '+banglaCal(now)+' | '+hijriDate(now);
        })();
        </script>
      </a>
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;justify-content:center;">
        <p style="margin:0;font-size:12px;color:#888;">সর্বশেষ আপডেট: ${formatDateTimeBn(BUILD_TIME)}</p>
        ${searchBox()}
      </div>
    </div>
  </header>
  ${breakingNewsBar()}
  ${categoryNav()}`;
}

function siteFooter(){
  return `<footer style="background:linear-gradient(135deg,#2e8b57 0%,#3aa1c7 55%,#4fc3f7 100%);color:#fff;">
    <div class="wrap">
      <span style="color:#fff;">© ${toBnNumber(new Date().getFullYear())} <a href="/" style="color:#fff;text-decoration:underline;">হোমপেজ</a> ${escapeHtml(SITE_TITLE)}</span>
      <div style="margin:14px 0;text-align:center;display:flex;justify-content:center;gap:16px;">
        <a href="https://www.facebook.com/share/1JY87mNj5v/" target="_blank" rel="noopener" style="display:inline-block;" aria-label="Facebook">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="#fff"><path d="M22 12.06C22 6.51 17.52 2 12 2S2 6.51 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94z"/></svg>
        </a>
        <a href="https://x.com/dainikkorbarta" target="_blank" rel="noopener" style="display:inline-block;" aria-label="X (Twitter)">
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="#fff"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        </a>
      </div>
      <div style="margin-top:10px;display:flex;gap:16px;flex-wrap:wrap;justify-content:center;font-size:13px;">
        <a href="/about-us/" style="color:#fff;">আমাদের সম্পর্কে</a>
        <a href="/contact-us/" style="color:#fff;">যোগাযোগ</a>
        <a href="/editorial-policy/" style="color:#fff;">সম্পাদকীয় নীতি</a>
        <a href="/privacy-policy/" style="color:#fff;">গোপনীয়তা নীতি</a>
        <a href="/terms-and-conditions/" style="color:#fff;">শর্তাবলী</a>
      </div>
    </div>
  </footer>`;
}

const sortedArticles = [...articles].sort((a, b) => new Date(b.date) - new Date(a.date));
const slugMap = [];
articles.forEach((a, i) => { slugMap.push({ index: i, slug: slugify(a.title, i) }); });
function slugOf(article){
  const idx = articles.indexOf(article);
  return slugMap.find(s => s.index === idx).slug;
}

// [নতুন] ছোট লিংক: প্রকাশের তারিখ ও সময় থেকে একটি স্থায়ী নম্বর (যেমন /news/2610041230/)
// নতুন খবর যোগ বা পুরোনো খবর মুছলেও অন্য খবরের লিংক বদলাবে না
function pad2(n){ return String(n).padStart(2, '0'); }
function baseNewsId(a, i){
  const d = new Date(a.date);
  if (isNaN(d.getTime())) return 'n' + i;
  return String(d.getUTCFullYear()).slice(2) + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) +
    pad2(d.getUTCHours()) + pad2(d.getUTCMinutes());
}
const newsIds = [];
{
  const used = new Set();
  articles.forEach((a, i) => {
    const base = baseNewsId(a, i);
    let id = base;
    let k = 2;
    while (used.has(id)) { id = `${base}-${k}`; k++; }
    used.add(id);
    newsIds[i] = id;
  });
}
function urlOf(article){
  return `/news/${newsIds[articles.indexOf(article)]}/`;
}

function articlePageHtml(a, urlPath){
  const d = new Date(a.date);
  const title = `${escapeHtml(a.title)} - ${escapeHtml(SITE_TITLE)}`;
  const desc = escapeHtml((a.body || '').replace(/\n/g,' ').slice(0, 150));
  const canonical = `${SITE_URL}${urlPath}`;

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  ${pageHead(title, desc, canonical, a.image,
    newsArticleSchema(a, canonical) +
    `<meta property="article:published_time" content="${safeIso(a.date, BUILD_TIME)}">` +
    `<meta property="article:modified_time" content="${safeIso(a.updated || a.date, BUILD_TIME)}">` +
    (a.category ? `<meta property="article:section" content="${escapeHtml(a.category)}">` : ''),
    'article', safeIso(a.updated || a.date, BUILD_TIME))}
</head>
<body>
  ${siteHeader()}
  <main class="wrap" style="max-width:760px;padding:36px 20px 60px;">
    <p><a href="/">← হোমপেজে ফিরুন</a></p>
    ${a.image ? `<img src="${escapeHtml(a.image)}" alt="${escapeHtml(a.title)}" class="article-img">` : ''}
    <span class="cat-tag">${escapeHtml(a.category)}</span>
    <h1 style="font-size:clamp(1.5rem,4vw,2.1rem);margin:10px 0 12px;line-height:1.35;">${escapeHtml(a.title)}</h1>
    <div class="meta"><strong style="color:${DATE_COLOR};font-weight:700;">${formatDateBn(d)}</strong>${a.reporter ? ' | প্রতিবেদক: ' + escapeHtml(a.reporter) : ''}</div>
    <div class="body-text" style="margin-top:20px;">${bodyToHtml(a.body)}</div>
    ${relatedNews(a)}
    ${twistcircleBanner('article')}
    ${adBanner()}
  </main>
  ${siteFooter()}
</body>
</html>`;
}

// [নতুন] সম্পর্কিত খবর: প্রথমে একই বিভাগের সর্বশেষ খবর, কম পড়লে অন্য সর্বশেষ খবর দিয়ে পূরণ (সর্বোচ্চ ৪টি)
function relatedNews(current, max){
  max = max || 4;
  const others = sortedArticles.filter(x => x !== current);
  const sameCat = current.category ? others.filter(x => x.category === current.category) : [];
  const picked = sameCat.slice(0, max);
  for (const x of others){
    if (picked.length >= max) break;
    if (!picked.includes(x)) picked.push(x);
  }
  if (!picked.length) return '';
  return `<section class="related-news">
    <h2>সম্পর্কিত খবর</h2>
    <div class="related-grid">${picked.map(x => articleGridCard(x)).join('')}</div>
  </section>`;
}

// [নতুন] twistcircle ব্যানার (হোমপেজে বাম পাশে, খবরের পাতায় নিচে)
function twistcircleBanner(place){
  return `<a href="${TWISTCIRCLE_LINK}" target="_blank" rel="noopener" class="tc-banner tc-banner-${place}" aria-label="twistcircle — শীঘ্রই আসছে">
    <img src="${TWISTCIRCLE_BANNER_IMG}" alt="twistcircle — বট-মুক্ত সামাজিক যোগাযোগের মাধ্যম, শীঘ্রই আসছে" width="1200" height="1200" loading="lazy">
  </a>`;
}

// [নতুন] পুরোনো লম্বা লিংকে (/article/...) কেউ এলে স্বয়ংক্রিয়ভাবে নতুন ছোট লিংকে পাঠানো হবে
function redirectPageHtml(urlPath){
  const full = `${SITE_URL}${urlPath}`;
  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(SITE_TITLE)}</title>
  <link rel="canonical" href="${full}">
  <meta http-equiv="refresh" content="0; url=${urlPath}">
  <script>location.replace(${JSON.stringify(urlPath)});</script>
</head>
<body>
  <p>এই খবরটি নতুন ঠিকানায় আছে: <a href="${urlPath}">${full}</a></p>
</body>
</html>`;
}

articles.forEach((a) => {
  const urlPath = urlOf(a);
  const id = newsIds[articles.indexOf(a)];
  const dir = path.join('news', id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), articlePageHtml(a, urlPath));
  urls.push(`${SITE_URL}${urlPath}`);
  lastmodMap[`${SITE_URL}${urlPath}`] = safeIso(a.updated || a.date, BUILD_TIME);

  const oldDir = path.join('article', slugOf(a));
  fs.mkdirSync(oldDir, { recursive: true });
  fs.writeFileSync(path.join(oldDir, 'index.html'), redirectPageHtml(urlPath));
});

fs.mkdirSync('content', { recursive: true });
fs.writeFileSync('content/article-slugs.json', JSON.stringify(slugMap, null, 2));

// [নতুন] সারির জন্য সংক্ষিপ্তসার (না থাকলে বিস্তারিত সংবাদের শুরুর অংশ)
function shortExcerpt(a){
  const src = a.excerpt || a.body || '';
  const clean = String(src).replace(/\s+/g, ' ').trim();
  return clean.length > 160 ? clean.slice(0, 160) + '…' : clean;
}

// [পরিবর্তিত] ছোট সংবাদগুলো এখন row আকারে: বামে ছবি, ডানে বিভাগ, শিরোনাম, সংক্ষিপ্তসার ও তারিখ
function articleCard(a, big){
  const link = urlOf(a);
  const d = new Date(a.date);
  if (big){
    return `<a href="${link}" style="display:block;text-decoration:none;color:inherit;">
      ${a.image ? `<img src="${escapeHtml(a.image)}" alt="${escapeHtml(a.title)}" class="hero-img">` : ''}
      <span class="cat-tag">${escapeHtml(a.category)}</span>
      <h2 style="font-size:1.6rem;margin:8px 0 6px;line-height:1.4;">${escapeHtml(a.title)}</h2>
      <div class="meta">${formatDateBn(d)}</div>
    </a>`;
  }
  const ex = shortExcerpt(a);
  return `<a href="${link}" class="news-row">
    ${a.image ? `<img src="${escapeHtml(a.image)}" alt="${escapeHtml(a.title)}" class="row-img">` : ''}
    <div class="row-text">
      <span class="cat-tag">${escapeHtml(a.category)}</span>
      <h3 class="row-title">${escapeHtml(a.title)}</h3>
      ${ex ? `<p class="row-excerpt">${escapeHtml(ex)}</p>` : ''}
      <div class="meta" style="font-size:12px;">${formatDateBn(d)}</div>
    </div>
  </a>`;
}

// [নতুন] পাশাপাশি কার্ডের জন্য: ওপরে ছবি (না থাকলে লোগো), নিচে বিভাগ, শিরোনাম, সংক্ষিপ্তসার ও তারিখ
function articleGridCard(a){
  const link = urlOf(a);
  const d = new Date(a.date);
  const ex = shortExcerpt(a);
  const pic = a.image
    ? `<img src="${escapeHtml(a.image)}" alt="${escapeHtml(a.title)}" class="card-img" loading="lazy">`
    : `<div class="card-noimg"><img src="/logo.png" alt=""></div>`;
  return `<a href="${link}" class="news-card">
    ${pic}
    <div class="card-body">
      <span class="cat-tag">${escapeHtml(a.category)}</span>
      <h3 class="card-title">${escapeHtml(a.title)}</h3>
      ${ex ? `<p class="card-excerpt">${escapeHtml(ex)}</p>` : ''}
      <div class="meta">${formatDateBn(d)}</div>
    </div>
  </a>`;
}

function adBanner(){
  const ad = settings.advertisement;
  if (!ad || !ad.ad_image) return '';
  const img = `<img src="${escapeHtml(ad.ad_image)}" alt="${escapeHtml(ad.advertiser_name || 'বিজ্ঞাপন')}" style="max-width:100%;border-radius:6px;">`;
  return `<div style="margin:20px 0;text-align:center;">
    <div style="font-size:11px;color:#999;margin-bottom:4px;">বিজ্ঞাপন</div>
    ${ad.ad_link ? `<a href="${escapeHtml(ad.ad_link)}" target="_blank" rel="noopener sponsored">${img}</a>` : img}
  </div>`;
}

// [নতুন] হোমপেজের বাম পাশের বিজ্ঞাপন বক্স (প্রায় ২×৩ ইঞ্চি)
function promoBox(){
  return `<aside class="promo-col">
    <div class="promo-box">
      <div class="promo-label">বিজ্ঞাপন</div>
      <p class="promo-main">অনলাইন নিউজ পোর্টাল দৈনিক করবার্তা'য় আপনার এলাকার খবর দেখুন</p>
      <p class="promo-ad">আপনার পণ্যের বিজ্ঞাপন দিন</p>
      <div class="promo-contact">
        যোগাযোগ<br>
        <a href="tel:+8801860317788">০১৮৬০৩১৭৭৮৮</a><br>
        <a href="mailto:dainikkorbarta@gmail.com">dainikkorbarta@gmail.com</a>
      </div>
    </div>
    ${twistcircleBanner('home')}
  </aside>`;
}

function latestSidebar(list){
  const items = list.slice(0, 8).map(a => {
    return `<a href="${urlOf(a)}" style="display:block;text-decoration:none;color:#222;padding:10px 0;border-bottom:1px solid #eee;font-size:14px;line-height:1.5;">${escapeHtml(a.title)}</a>`;
  }).join('');
  return `<aside class="sidebar-col" style="background:#fafafa;border-radius:8px;padding:16px;">
    ${adBanner()}
    <h3 style="margin:0 0 10px;font-size:1.1rem;border-bottom:2px solid #1a5276;padding-bottom:8px;">সর্বশেষ</h3>
    ${items || '<p>কোনো সংবাদ নেই।</p>'}
  </aside>`;
}

// [পরিবর্তিত] হোমপেজের টাইটেল ও ডেসক্রিপশনে কমন কিওয়ার্ড আছে, ডেসক্রিপশন ১৬০ অক্ষরের মধ্যে (SEO)
// [পরিবর্তিত] বামে বিজ্ঞাপন বক্স যোগ হয়েছে (পেজ আরও চওড়া করে বক্স আরও বামে নেওয়া হয়েছে); মাঝে খবর পাশাপাশি ২টি করে; মোবাইলে সব একটার নিচে আরেকটা
function homePageHtml(){
  const title = `${SITE_TITLE}${SITE_TAGLINE ? ' — ' + SITE_TAGLINE : ''} | ${SITE_NAME_EN}`;
  const desc = `${SITE_TITLE} (${SITE_NAME_EN})${SITE_TAGLINE ? ' — ' + SITE_TAGLINE + '।' : '।'} রাজনীতি, খেলা, প্রযুক্তি, স্বাস্থ্য ও জেলার সর্বশেষ বাংলা সংবাদ।`;
  const canonical = `${SITE_URL}/`;

  const hero = sortedArticles[0];
  const rest = sortedArticles.slice(1);
  const rowCards = rest.map(a => articleGridCard(a)).join('');

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  ${pageHead(title, desc, canonical, null)}
</head>
<body>
  ${siteHeader()}
  <main class="wrap home-grid" style="max-width:1400px;padding:24px 20px 60px;">
    ${promoBox()}
    <div style="min-width:0;">
      ${hero ? articleCard(hero, true) : '<p>এখনো কোনো সংবাদ প্রকাশিত হয়নি।</p>'}
      <div class="news-grid" style="margin-top:20px;">${rowCards}</div>
    </div>
    ${latestSidebar(sortedArticles)}
  </main>
  ${siteFooter()}
</body>
</html>`;
}

fs.writeFileSync('index.html', homePageHtml());

categories.forEach(cat => {
  const catArticles = sortedArticles.filter(a => a.category === cat);
  const slug = catSlugify(cat);
  const title = `${escapeHtml(cat)} - ${escapeHtml(SITE_TITLE)}`;
  const canonical = `${SITE_URL}/category/${slug}/`;
  const items = catArticles.map(a => articleGridCard(a)).join('');

  const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  ${pageHead(title, `${escapeHtml(cat)} বিভাগের সর্বশেষ সংবাদ`, canonical, null)}
</head>
<body>
  ${siteHeader()}
  <main class="wrap" style="max-width:1100px;padding:24px 20px 60px;">
    <h2 style="border-bottom:2px solid #1a5276;padding-bottom:10px;">${escapeHtml(cat)}</h2>
    ${items ? `<div class="news-grid">${items}</div>` : '<p>এই বিভাগে এখনো কোনো সংবাদ নেই।</p>'}
  </main>
  ${siteFooter()}
</body>
</html>`;
  const dir = path.join('category', slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  urls.push(canonical);
});

function staticPageHtml(title, desc, bodyHtml, canonical){
  return `<!DOCTYPE html>
<html lang="bn">
<head>
  ${pageHead(title, desc, canonical, null)}
</head>
<body>
  ${siteHeader()}
  <main class="wrap" style="max-width:760px;padding:36px 20px 60px;">
    ${bodyHtml}
  </main>
  ${siteFooter()}
</body>
</html>`;
}

const staticPages = [
  {
    slug: 'about-us',
    title: `আমাদের সম্পর্কে - ${SITE_TITLE}`,
    desc: `${SITE_TITLE} সম্পর্কে জানুন`,
    body: `
      <h1 style="border-bottom:2px solid #1a5276;padding-bottom:10px;">আমাদের সম্পর্কে</h1>
      <div class="body-text" style="margin-top:16px;">
        <p>${escapeHtml(SITE_TITLE)} একটি বাংলা অনলাইন সংবাদমাধ্যম, যার লক্ষ্য পাঠকদের কাছে সঠিক, নির্ভরযোগ্য ও সময়োপযোগী সংবাদ পৌঁছে দেওয়া।</p>
        <p>আমরা জাতীয়, আন্তর্জাতিক, রাজনীতি, অর্থনীতি, খেলাধূলা, বিনোদন, বিজ্ঞান ও প্রযুক্তি এবং স্বাস্থ্য বিষয়ক সংবাদ নিয়মিত প্রকাশ করে থাকি।</p>
        <p>আপনার যেকোনো মতামত, পরামর্শ বা সংবাদ পাঠাতে আমাদের সাথে যোগাযোগ পাতার মাধ্যমে যোগাযোগ করতে পারেন।</p>
      </div>`
  },
  {
    slug: 'contact-us',
    title: `যোগাযোগ - ${SITE_TITLE}`,
    desc: `${SITE_TITLE}-এর সাথে যোগাযোগ করুন`,
    body: `
      <h1 style="border-bottom:2px solid #1a5276;padding-bottom:10px;">যোগাযোগ</h1>
      <div class="body-text" style="margin-top:16px;">
        <p><strong>মোঃ আমিনুল ইসলাম</strong><br>সম্পাদক</p>
        <p>মোবাইল নম্বর: ০১৮৬০৩১৭৭৮৮</p>
        <p>ইমেইল: <a href="mailto:dainikkorbarta@gmail.com">dainikkorbarta@gmail.com</a></p>
      </div>`
  },
  {
    // [নতুন] সম্পাদকীয় নীতি
    slug: 'editorial-policy',
    title: `সম্পাদকীয় নীতি - ${SITE_TITLE}`,
    desc: `${SITE_TITLE}-এর সম্পাদকীয় নীতি: বস্তুনিষ্ঠতা, তথ্য যাচাই, সংশোধন, গোপনীয়তা ও সাংবাদিকতার নৈতিকতা`,
    body: `
      <h1 style="border-bottom:2px solid #1a5276;padding-bottom:10px;">সম্পাদকীয় নীতি</h1>
      <div class="body-text" style="margin-top:16px;">
        <p>${escapeHtml(SITE_TITLE)} একটি স্বাধীন বাংলা অনলাইন সংবাদমাধ্যম। সত্য, বস্তুনিষ্ঠ ও দায়িত্বশীল সাংবাদিকতার মাধ্যমে পাঠকের আস্থা অর্জনই আমাদের মূল লক্ষ্য। আমাদের প্রতিটি সংবাদ, ছবি, ভিডিও ও লেখা নিচের নীতিমালা অনুসরণ করে প্রকাশিত হয়।</p>

        <h2>১. বস্তুনিষ্ঠতা ও নিরপেক্ষতা</h2>
        <p>আমরা কোনো রাজনৈতিক দল, গোষ্ঠী, প্রতিষ্ঠান বা ব্যক্তির পক্ষে বা বিপক্ষে পক্ষপাতমূলক সংবাদ প্রকাশ করি না। বিতর্কিত বা অভিযোগমূলক বিষয়ে সংশ্লিষ্ট সব পক্ষের বক্তব্য নেওয়ার চেষ্টা করা হয়। কোনো পক্ষ বক্তব্য দিতে অস্বীকৃতি জানালে বা যোগাযোগ সম্ভব না হলে তা সংবাদে উল্লেখ করা হয়।</p>

        <h2>২. তথ্য যাচাই ও সূত্র</h2>
        <p>প্রকাশের আগে প্রতিটি তথ্য যথাসম্ভব একাধিক নির্ভরযোগ্য সূত্র থেকে যাচাই করা হয়। প্রত্যক্ষদর্শী, সংশ্লিষ্ট কর্তৃপক্ষ, সরকারি নথি ও প্রামাণ্য দলিলকে অগ্রাধিকার দেওয়া হয়। সামাজিক যোগাযোগমাধ্যমে ছড়িয়ে পড়া তথ্য, ছবি বা ভিডিও যাচাই ছাড়া সংবাদ হিসেবে প্রকাশ করা হয় না। অন্য সংবাদমাধ্যমের তথ্য ব্যবহার করলে সূত্র উল্লেখ করা হয়।</p>

        <h2>৩. সূত্রের গোপনীয়তা</h2>
        <p>জনস্বার্থে তথ্য প্রদানকারী কোনো সূত্র পরিচয় গোপন রাখতে চাইলে আমরা তা রক্ষা করি। তবে বেনামি সূত্রের তথ্য অন্য উপায়ে যাচাই না করে প্রকাশ করা হয় না, এবং বেনামি সূত্র ব্যবহার করে কারও বিরুদ্ধে ব্যক্তিগত আক্রমণ করা হয় না।</p>

        <h2>৪. ভুল সংশোধন নীতি</h2>
        <p>সতর্কতা সত্ত্বেও কোনো সংবাদে ভুল তথ্য প্রকাশিত হলে, ভুল চিহ্নিত হওয়ামাত্র তা দ্রুত সংশোধন করা হয়। গুরুত্বপূর্ণ সংশোধনের ক্ষেত্রে সংবাদের সঙ্গে সংশোধনীর বিষয়টি স্পষ্টভাবে উল্লেখ করা হয়। কোনো সংবাদ নিয়ে সংশ্লিষ্ট ব্যক্তি বা প্রতিষ্ঠানের আপত্তি থাকলে তাদের প্রতিবাদ বা ব্যাখ্যা প্রকাশের সুযোগ দেওয়া হয়।</p>

        <h2>৫. ব্যক্তিগত গোপনীয়তা ও মানবিক মর্যাদা</h2>
        <p>জনস্বার্থের প্রয়োজন ছাড়া কারও ব্যক্তিগত জীবনে অনুপ্রবেশ করা হয় না। যৌন নির্যাতনের শিকার ব্যক্তি এবং শিশুদের (১৮ বছরের কম বয়সী) নাম, ছবি, ঠিকানা বা পরিচয় প্রকাশ পায় এমন কোনো তথ্য প্রকাশ করা হয় না। আদালতে দোষী প্রমাণিত না হওয়া পর্যন্ত অভিযুক্ত ব্যক্তিকে অপরাধী হিসেবে উপস্থাপন করা হয় না। দুর্ঘটনা, মৃত্যু ও শোকের সংবাদ পরিবেশনে সংবেদনশীলতা বজায় রাখা হয়।</p>

        <h2>৬. ছবি ও ভিডিও</h2>
        <p>বিভ্রান্তি সৃষ্টি করতে পারে এমনভাবে ছবি বা ভিডিও সম্পাদনা বা বিকৃত করা হয় না। অতিরিক্ত রক্তাক্ত, বীভৎস বা পাঠকের জন্য বিচলিতকর দৃশ্য প্রকাশ থেকে বিরত থাকা হয়। পুরোনো বা প্রতীকী ছবি ব্যবহার করলে তা স্পষ্টভাবে উল্লেখ করা হয়।</p>

        <h2>৭. সংবাদ ও মতামতের পার্থক্য</h2>
        <p>সংবাদ ও মতামত আলাদাভাবে প্রকাশ করা হয়। "মতামত" বিভাগে প্রকাশিত লেখা সংশ্লিষ্ট লেখকের নিজস্ব মত; তা ${escapeHtml(SITE_TITLE)}-এর অবস্থান হিসেবে গণ্য হবে না। শিরোনাম অবশ্যই সংবাদের মূল বিষয়ের সঙ্গে সঙ্গতিপূর্ণ হবে; পাঠক টানতে বিভ্রান্তিকর বা অতিরঞ্জিত শিরোনাম (ক্লিকবেইট) ব্যবহার করা হয় না।</p>

        <h2>৮. বিজ্ঞাপন ও সংবাদের স্বাধীনতা</h2>
        <p>বিজ্ঞাপন ও সংবাদ সম্পূর্ণ আলাদা রাখা হয়। প্রতিটি বিজ্ঞাপন "বিজ্ঞাপন" হিসেবে স্পষ্টভাবে চিহ্নিত থাকে। কোনো বিজ্ঞাপনদাতা বা পৃষ্ঠপোষক আমাদের সংবাদের বিষয়বস্তু বা সম্পাদকীয় সিদ্ধান্তে প্রভাব খাটাতে পারেন না। অর্থের বিনিময়ে প্রকাশিত কোনো কনটেন্ট সংবাদ হিসেবে উপস্থাপন করা হয় না।</p>

        <h2>৯. স্বার্থের সংঘাত</h2>
        <p>সংবাদ সংগ্রহ বা প্রকাশের বিনিময়ে আমাদের কোনো প্রতিবেদক বা সম্পাদক কারও কাছ থেকে অর্থ, উপহার বা সুবিধা গ্রহণ করেন না। কোনো সংবাদের সঙ্গে প্রতিষ্ঠান বা সংশ্লিষ্ট কারও ব্যক্তিগত বা ব্যবসায়িক স্বার্থ জড়িত থাকলে তা পাঠকের কাছে প্রকাশ করা হয়।</p>

        <h2>১০. পাঠক সংবাদ</h2>
        <p>পাঠকদের পাঠানো সংবাদ, ছবি ও লেখা "পাঠক সংবাদ" বিভাগে প্রকাশ করা হয়। প্রকাশের আগে তা যাচাই ও সম্পাদনা করা হয়, এবং প্রয়োজনে প্রকাশ না করার অধিকার সম্পাদক সংরক্ষণ করেন। পাঠানো তথ্যের সত্যতার দায় প্রেরকের ওপরও বর্তায়।</p>

        <h2>১১. আইন, সমাজ ও নৈতিকতা</h2>
        <p>আমরা বাংলাদেশের সংবিধান ও প্রচলিত আইন মেনে চলি এবং বাংলাদেশ প্রেস কাউন্সিল প্রণীত সাংবাদিকতার আচরণবিধি অনুসরণের চেষ্টা করি। ধর্মীয়, জাতিগত বা সাম্প্রদায়িক বিদ্বেষ ছড়ায়, সহিংসতায় উসকানি দেয়, গুজব ছড়ায় বা জাতীয় নিরাপত্তা ও জনশৃঙ্খলা বিঘ্নিত করে এমন কোনো কনটেন্ট প্রকাশ করা হয় না। আত্মহত্যার সংবাদে পদ্ধতির বিস্তারিত বর্ণনা দেওয়া হয় না।</p>

        <h2>১২. কপিরাইট</h2>
        <p>অন্যের লেখা, ছবি বা ভিডিও অনুমতি ও সূত্র উল্লেখ ছাড়া ব্যবহার করা হয় না। ${escapeHtml(SITE_TITLE)}-এ প্রকাশিত মৌলিক কনটেন্ট লিখিত অনুমতি ছাড়া পুনঃপ্রকাশ করা যাবে না; তবে সূত্র উল্লেখ করে সংবাদের লিংক শেয়ার করা যাবে।</p>

        <h2>১৩. অভিযোগ ও যোগাযোগ</h2>
        <p>কোনো সংবাদ সম্পর্কে অভিযোগ, সংশোধনের অনুরোধ বা প্রতিবাদ জানাতে সরাসরি সম্পাদকের সঙ্গে যোগাযোগ করুন। প্রতিটি অভিযোগ গুরুত্বের সঙ্গে বিবেচনা করে যথাসম্ভব দ্রুত ব্যবস্থা নেওয়া হয়।</p>
        <p><strong>মোঃ আমিনুল ইসলাম</strong>, সম্পাদক<br>
        মোবাইল: <a href="tel:+8801860317788">০১৮৬০৩১৭৭৮৮</a><br>
        ইমেইল: <a href="mailto:dainikkorbarta@gmail.com">dainikkorbarta@gmail.com</a></p>

        <h2>নীতিমালার পরিবর্তন</h2>
        <p>প্রয়োজনে ${escapeHtml(SITE_TITLE)} কর্তৃপক্ষ এই সম্পাদকীয় নীতি হালনাগাদ করতে পারে। যেকোনো পরিবর্তন এই পাতায় প্রকাশ করা হবে।</p>
      </div>`
  },
  {
    slug: 'privacy-policy',
    title: `গোপনীয়তা নীতি - ${SITE_TITLE}`,
    desc: `${SITE_TITLE}-এর গোপনীয়তা নীতি`,
    body: `
      <h1 style="border-bottom:2px solid #1a5276;padding-bottom:10px;">গোপনীয়তা নীতি</h1>
      <div class="body-text" style="margin-top:16px;">
        <p>${escapeHtml(SITE_TITLE)} পাঠকদের ব্যক্তিগত তথ্যের গোপনীয়তাকে গুরুত্ব সহকারে বিবেচনা করে। এই ওয়েবসাইট ব্যবহারের মাধ্যমে আপনি নিচের নীতিতে সম্মত হচ্ছেন বলে গণ্য হবে।</p>
        <p><strong>তথ্য সংগ্রহ:</strong> আমরা সাধারণত ভিজিটরদের ব্যক্তিগত তথ্য সংগ্রহ করি না, তবে ভিজিটর কাউন্টার ও অ্যানালিটিক্স টুলের মাধ্যমে সাধারণ ব্যবহার পরিসংখ্যান (ব্রাউজার, ভিজিটের সময়, পৃষ্ঠা ভিউ ইত্যাদি) সংগ্রহ হতে পারে।</p>
        <p><strong>কুকিজ:</strong> ওয়েবসাইটের কার্যকারিতা উন্নত করতে কুকিজ ব্যবহার করা হতে পারে।</p>
        <p><strong>তৃতীয় পক্ষ:</strong> আমাদের সাইটে ব্যবহৃত কোনো তৃতীয় পক্ষের বিজ্ঞাপন বা সেবার গোপনীয়তা নীতি তাদের নিজস্ব নিয়ম অনুযায়ী পরিচালিত হয়।</p>
        <p>এই নীতিতে যেকোনো পরিবর্তন এই পাতায় প্রকাশ করা হবে।</p>
      </div>`
  },
  {
    slug: 'terms-and-conditions',
    title: `শর্তাবলী - ${SITE_TITLE}`,
    desc: `${SITE_TITLE}-এর ব্যবহারের শর্তাবলী`,
    body: `
      <h1 style="border-bottom:2px solid #1a5276;padding-bottom:10px;">শর্তাবলী</h1>
      <div class="body-text" style="margin-top:16px;">
        <p>এই ওয়েবসাইট ব্যবহারের মাধ্যমে আপনি নিম্নলিখিত শর্তাবলীতে সম্মত হচ্ছেন।</p>
        <p><strong>কনটেন্ট ব্যবহার:</strong> এই সাইটের সংবাদ ও লেখা শুধুমাত্র ব্যক্তিগত ব্যবহারের জন্য। লিখিত অনুমতি ছাড়া কোনো কনটেন্ট পুনঃপ্রকাশ বা বাণিজ্যিকভাবে ব্যবহার করা যাবে না।</p>
        <p><strong>নির্ভুলতা:</strong> আমরা সঠিক তথ্য দেওয়ার চেষ্টা করি, তবে কোনো তথ্যগত ভুলের জন্য দায়ী থাকা হবে না।</p>
        <p><strong>পরিবর্তন:</strong> কর্তৃপক্ষ যেকোনো সময় এই শর্তাবলী পরিবর্তনের অধিকার রাখে।</p>
      </div>`
  }
];

staticPages.forEach(p => {
  const canonical = `${SITE_URL}/${p.slug}/`;
  const dir = path.join(p.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), staticPageHtml(p.title, p.desc, p.body, canonical));
  urls.push(canonical);
});

{
  const canonical = `${SITE_URL}/epaper/`;
  const html = staticPageHtml(
    `ই-পেপার - ${SITE_TITLE}`,
    `${SITE_TITLE}-এর ই-পেপার সংস্করণ`,
    `<h1 style="border-bottom:2px solid #1a5276;padding-bottom:10px;">ই-পেপার</h1>
     <div class="body-text" style="margin-top:16px;">
       <p>আজকের ই-পেপার সংস্করণ শীঘ্রই প্রকাশিত হবে।</p>
     </div>`,
    canonical
  );
  fs.mkdirSync('epaper', { recursive: true });
  fs.writeFileSync(path.join('epaper', 'index.html'), html);
  urls.push(canonical);
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc><lastmod>${lastmodMap[u] || BUILD_TIME.toISOString()}</lastmod></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync('sitemap.xml', sitemap);

fs.writeFileSync('robots.txt', `User-agent: *
Allow: /
Disallow: /admin/
Sitemap: ${SITE_URL}/sitemap.xml
`);

console.log(`✓ Build সম্পূর্ণ – ${articles.length}টি আর্টিকেল, ${categories.length}টি ক্যাটাগরি পেজ তৈরি হয়েছে`);
