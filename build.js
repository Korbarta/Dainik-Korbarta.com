// build.js — দৈনিক করবার্তা SEO builder (প্রফেশনাল লেআউট)
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://dainikkorbarta.com';

const BN_WEEKDAYS = ['রবিবার','সোমবার','মঙ্গলবার','বুধবার','বৃহস্পতিবার','শুক্রবার','শনিবার'];
const BN_MONTHS = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
const BN_DIGITS = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
const EN_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const HIJRI_MONTHS_BN = ['মহররম','সফর','রবিউল আউয়াল','রবিউস সানি','জমাদিউল আউয়াল','জমাদিউস সানি','রজব','শাবান','রমজান','শাওয়াল','জিলকদ','জিলহজ'];

const CATEGORY_ORDER = ['সারাদেশ','জেলা সংবাদ','মফস্বল সংবাদ','জাতীয়','অর্থনীতি','খেলা','বিনোদন','রাজনীতি','বিজ্ঞান ও প্রযুক্তি','আন্তর্জাতিক','যোগাযোগ','মতামত'];

const NAV_EXTRA_CATEGORIES = ['জেলা সংবাদ','মফস্বল সংবাদ','রাজনীতি','বিজ্ঞান ও প্রযুক্তি','স্বাস্থ্য','পাঠক সংবাদ'];

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

function readJson(p){ return JSON.parse(fs.readFileSync(p, 'utf8')); }

const articlesData = readJson('content/articles.json');
const settings = readJson('content/settings.json');
const articles = articlesData.articles || [];

if (fs.existsSync('article')) fs.rmSync('article', { recursive: true, force: true });
if (fs.existsSync('category')) fs.rmSync('category', { recursive: true, force: true });
fs.mkdirSync('article');

const urls = [`${SITE_URL}/`];

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

function pageHead(title, desc, canonical, ogImage){
  return `<meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(desc)}">
  <meta property="og:url" content="${canonical}">
  ${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}">` : ''}
  <link rel="stylesheet" href="/style.css">
  <style>
    @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
    .breaking-track { display:inline-block; white-space:nowrap; animation: marquee 25s linear infinite; }
  </style>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-MX0Q3361L2"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-MX0Q3361L2');
  </script>`;
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
        <p id="today-date" style="margin:6px auto 0;font-size:12px;font-weight:bold;color:#e67e22;text-align:center;">${formatDateEn(BUILD_TIME)} | ${formatDateBn(BUILD_TIME)} | ${formatHijriBn(BUILD_TIME)}</p>
        <script>
        (function(){
          var bnDigits=['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
          var bnWeekdays=['রবিবার','সোমবার','মঙ্গলবার','বুধবার','বৃহস্পতিবার','শুক্রবার','শনিবার'];
          var bnMonths=['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
          var enMonths=['January','February','March','April','May','June','July','August','September','October','November','December'];
          var hijriMonths=['মহররম','সফর','রবিউল আউয়াল','রবিউস সানি','জমাদিউল আউয়াল','জমাদিউস সানি','রজব','শাবান','রমজান','শাওয়াল','জিলকদ','জিলহজ'];
          function toBn(n){ return String(n).split('').map(function(ch){ return /\d/.test(ch)?bnDigits[ch]:ch; }).join(''); }
          function bnDate(d){ return bnWeekdays[d.getDay()]+', '+toBn(d.getDate())+' '+bnMonths[d.getMonth()]+' '+toBn(d.getFullYear()); }
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
          if(el) el.textContent = enDate(now)+' | '+bnDate(now)+' | '+hijriDate(now);
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

function articlePageHtml(a, slug){
  const d = new Date(a.date);
  const title = `${escapeHtml(a.title)} - ${escapeHtml(SITE_TITLE)}`;
  const desc = escapeHtml((a.body || '').replace(/\n/g,' ').slice(0, 150));
  const canonical = `${SITE_URL}/article/${slug}/`;

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  ${pageHead(title, desc, canonical, a.image)}
</head>
<body>
  ${siteHeader()}
  <main class="wrap" style="max-width:760px;padding:36px 20px 60px;">
    <p><a href="/">← হোমপেজে ফিরুন</a></p>
    ${a.image ? `<img src="${escapeHtml(a.image)}" alt="${escapeHtml(a.title)}" style="margin-bottom:16px;width:100%;">` : ''}
    <span class="cat-tag">${escapeHtml(a.category)}</span>
    <h1 style="font-size:clamp(1.5rem,4vw,2.1rem);margin:10px 0 12px;line-height:1.35;">${escapeHtml(a.title)}</h1>
    <div class="meta">${formatDateBn(d)}${a.reporter ? ' | প্রতিবেদক: ' + escapeHtml(a.reporter) : ''}</div>
    <div class="body-text" style="margin-top:20px;">${bodyToHtml(a.body)}</div>
    ${adBanner()}
  </main>
  ${siteFooter()}
</body>
</html>`;
}

articles.forEach((a) => {
  const slug = slugOf(a);
  const dir = path.join('article', slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), articlePageHtml(a, slug));
  urls.push(`${SITE_URL}/article/${slug}/`);
});

fs.mkdirSync('content', { recursive: true });
fs.writeFileSync('content/article-slugs.json', JSON.stringify(slugMap, null, 2));

function articleCard(a, big){
  const slug = slugOf(a);
  const d = new Date(a.date);
  if (big){
    return `<a href="/article/${slug}/" style="display:block;text-decoration:none;color:inherit;">
      ${a.image ? `<img src="${escapeHtml(a.image)}" alt="${escapeHtml(a.title)}" style="width:100%;border-radius:8px;margin-bottom:12px;">` : ''}
      <span class="cat-tag">${escapeHtml(a.category)}</span>
      <h2 style="font-size:1.6rem;margin:8px 0 6px;line-height:1.4;">${escapeHtml(a.title)}</h2>
      <div class="meta">${formatDateBn(d)}</div>
    </a>`;
  }
  return `<a href="/article/${slug}/" style="display:flex;gap:12px;text-decoration:none;color:inherit;padding:14px 0;border-bottom:1px solid #eee;">
    ${a.image ? `<img src="${escapeHtml(a.image)}" alt="${escapeHtml(a.title)}" style="width:110px;height:80px;object-fit:cover;border-radius:6px;flex-shrink:0;">` : ''}
    <div>
      <span class="cat-tag">${escapeHtml(a.category)}</span>
      <h3 style="font-size:1rem;margin:4px 0;line-height:1.4;">${escapeHtml(a.title)}</h3>
      <div class="meta" style="font-size:12px;">${formatDateBn(d)}</div>
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

function latestSidebar(list){
  const items = list.slice(0, 8).map(a => {
    const slug = slugOf(a);
    return `<a href="/article/${slug}/" style="display:block;text-decoration:none;color:#222;padding:10px 0;border-bottom:1px solid #eee;font-size:14px;line-height:1.5;">${escapeHtml(a.title)}</a>`;
  }).join('');
  return `<aside style="background:#fafafa;border-radius:8px;padding:16px;">
    ${adBanner()}
    <h3 style="margin:0 0 10px;font-size:1.1rem;border-bottom:2px solid #1a5276;padding-bottom:8px;">সর্বশেষ</h3>
    ${items || '<p>কোনো সংবাদ নেই।</p>'}
  </aside>`;
}

function homePageHtml(){
  const title = `${escapeHtml(SITE_TITLE)}${SITE_TAGLINE ? ' — ' + escapeHtml(SITE_TAGLINE) : ''}`;
  const desc = escapeHtml(SITE_TAGLINE || 'বাংলাদেশের সর্বশেষ সংবাদ');
  const canonical = `${SITE_URL}/`;

  const hero = sortedArticles[0];
  const rest = sortedArticles.slice(1);
  const gridCards = rest.map(a => `<div>${articleCard(a, false)}</div>`).join('');

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  ${pageHead(title, desc, canonical, null)}
</head>
<body>
  ${siteHeader()}
  <main class="wrap" style="max-width:1100px;padding:24px 20px 60px;display:grid;grid-template-columns:1fr 300px;gap:24px;">
    <div>
      ${hero ? articleCard(hero, true) : '<p>এখনো কোনো সংবাদ প্রকাশিত হয়নি।</p>'}
      <div style="margin-top:20px;">${gridCards}</div>
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
  const items = catArticles.map(a => articleCard(a, false)).join('');

  const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  ${pageHead(title, `${escapeHtml(cat)} বিভাগের সর্বশেষ সংবাদ`, canonical, null)}
</head>
<body>
  ${siteHeader()}
  <main class="wrap" style="max-width:760px;padding:24px 20px 60px;">
    <h2 style="border-bottom:2px solid #1a5276;padding-bottom:10px;">${escapeHtml(cat)}</h2>
    ${items || '<p>এই বিভাগে এখনো কোনো সংবাদ নেই।</p>'}
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
${urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync('sitemap.xml', sitemap);

fs.writeFileSync('robots.txt', `User-agent: *
Allow: /
Disallow: /admin/
Sitemap: ${SITE_URL}/sitemap.xml
`);

console.log(`✓ Build সম্পূর্ণ – ${articles.length}টি আর্টিকেল, ${categories.length}টি ক্যাটাগরি পেজ তৈরি হয়েছে`);
