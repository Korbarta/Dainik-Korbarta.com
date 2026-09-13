// build.js — দৈনিক করবার্তা SEO builder
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://dainikkorbarta.com';

const BN_WEEKDAYS = ['রবিবার','সোমবার','মঙ্গলবার','বুধবার','বৃহস্পতিবার','শুক্রবার','শনিবার'];
const BN_MONTHS = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
const BN_DIGITS = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];

function toBnNumber(n){
  return String(n).split('').map(ch => /\d/.test(ch) ? BN_DIGITS[ch] : ch).join('');
}
function formatDateBn(d){
  return `${BN_WEEKDAYS[d.getDay()]}, ${toBnNumber(d.getDate())} ${BN_MONTHS[d.getMonth()]} ${toBnNumber(d.getFullYear())}`;
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

function readJson(p){ return JSON.parse(fs.readFileSync(p, 'utf8')); }

const articlesData = readJson('content/articles.json');
const settings = readJson('content/settings.json');
const articles = articlesData.articles || [];

if (fs.existsSync('article')) fs.rmSync('article', { recursive: true, force: true });
fs.mkdirSync('article');

const urls = [`${SITE_URL}/`];

const SITE_TITLE = settings.site_title || 'দৈনিক করবার্তা';
const SITE_TAGLINE = settings.tagline || '';

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
  <link rel="stylesheet" href="/style.css">`;
}

function siteHeader(){
  return `<header class="masthead">
    <div class="wrap" style="display:flex;align-items:center;gap:14px;">
      <a href="/" style="display:flex;align-items:center;gap:14px;text-decoration:none;color:inherit;">
        <img src="/logo.png" alt="${escapeHtml(SITE_TITLE)}" style="height:56px;width:56px;border-radius:50%;flex-shrink:0;">
        <div>
          <h1 style="margin:0;">${escapeHtml(SITE_TITLE)}</h1>
          <p class="tagline" style="margin:2px 0 0;">${escapeHtml(SITE_TAGLINE)}</p>
        </div>
      </a>
    </div>
  </header>`;
}

const COUNTER_HTML = "<div style=\"margin-top:16px;text-align:center;\"><a href='https://www.free-counters.org/' style=\"font-size:11px;color:#999;\">powered by Free-Counters.org</a><script type='text/javascript' src='https://www.freevisitorcounters.com/auth.php?id=85ca76eaf26803643e138c9916d5d3fa90ec211a'></script><script type=\"text/javascript\" src=\"https://www.freevisitorcounters.com/en/home/counter/1642761/t/6\"></script></div>";

function siteFooter(){
  return `<footer>
    <div class="wrap">
      <span>© ${toBnNumber(new Date().getFullYear())} <a href="/">হোমপেজ</a> ${escapeHtml(SITE_TITLE)}</span>
      ${COUNTER_HTML}
    </div>
  </footer>`;
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
    <div class="meta">${formatDateBn(d)}</div>
    <div class="body-text" style="margin-top:20px;">${bodyToHtml(a.body)}</div>
  </main>
  ${siteFooter()}
</body>
</html>`;
}

const slugMap = [];
const sortedArticles = [...articles].sort((a, b) => new Date(b.date) - new Date(a.date));

articles.forEach((a, i) => {
  const slug = slugify(a.title, i);
  slugMap.push({ index: i, slug });
  const dir = path.join('article', slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), articlePageHtml(a, slug));
  urls.push(`${SITE_URL}/article/${slug}/`);
});

fs.mkdirSync('content', { recursive: true });
fs.writeFileSync('content/article-slugs.json', JSON.stringify(slugMap, null, 2));

function homePageHtml(){
  const title = `${escapeHtml(SITE_TITLE)}${SITE_TAGLINE ? ' — ' + escapeHtml(SITE_TAGLINE) : ''}`;
  const desc = escapeHtml(SITE_TAGLINE || 'বাংলাদেশের সর্বশেষ সংবাদ');
  const canonical = `${SITE_URL}/`;

  const cards = sortedArticles.map((a) => {
    const originalIndex = articles.indexOf(a);
    const slugEntry = slugMap.find(s => s.index === originalIndex);
    const slug = slugEntry ? slugEntry.slug : slugify(a.title, originalIndex);
    const d = new Date(a.date);
    return `<a href="/article/${slug}/" class="article-card" style="display:block;text-decoration:none;color:inherit;border-bottom:1px solid #eee;padding:20px 0;">
      ${a.image ? `<img src="${escapeHtml(a.image)}" alt="${escapeHtml(a.title)}" style="width:100%;margin-bottom:10px;border-radius:6px;">` : ''}
      <span class="cat-tag">${escapeHtml(a.category)}</span>
      <h2 style="font-size:1.3rem;margin:8px 0 6px;line-height:1.4;">${escapeHtml(a.title)}</h2>
      <div class="meta">${formatDateBn(d)}</div>
    </a>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  ${pageHead(title, desc, canonical, null)}
</head>
<body>
  ${siteHeader()}
  <main class="wrap" style="max-width:760px;padding:36px 20px 60px;">
    ${cards || '<p>এখনো কোনো সংবাদ প্রকাশিত হয়নি।</p>'}
  </main>
  ${siteFooter()}
</body>
</html>`;
}

fs.writeFileSync('index.html', homePageHtml());

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

console.log(`✓ Build সম্পূর্ণ – ${articles.length}টি আর্টিকেল পেজ, হোমপেজ, sitemap.xml ও robots.txt তৈরি হয়েছে`);
