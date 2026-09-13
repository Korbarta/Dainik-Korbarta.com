// build.js — দৈনিক করবার্তা SEO builder (প্রফেশনাল লেআউট)
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

// ইউনিক ক্যাটাগরি লিস্ট বের করা (আর্টিকেল যেসব ক্যাটাগরিতে আছে)
const categories = [...new Set(articles.map(a => a.category).filter(Boolean))];

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

function categoryNav(){
  const links = categories.map(c =>
    `<a href="/category/${catSlugify(c)}/" style="padding:8px 14px;text-decoration:none;color:#222;font-size:14px;white-space:nowrap;">${escapeHtml(c)}</a>`
  ).join('');
  return `<nav style="border-top:1px solid #eee;border-bottom:1px solid #eee;overflow-x:auto;white-space:nowrap;background:#fafafa;">
    <a href="/" style="padding:8px 14px;text-decoration:none;color:#c0392b;font-weight:bold;font-size:14px;">প্রচ্ছদ</a>${links}
  </nav>`;
}

function siteHeader(){
  return `<header class="masthead">
    <div class="wrap" style="display:flex;align-items:center;gap:14px;padding:16px 20px;">
      <a href="/" style="display:flex;align-items:center;gap:14px;text-decoration:none;color:inherit;">
        <img src="/logo.png" alt="${escapeHtml(SITE_TITLE)}" style="height:56px;width:56px;border-radius:50%;flex-shrink:0;">
        <div>
          <h1 style="margin:0;">${escapeHtml(SITE_TITLE)}</h1>
          <p class="tagline" style="margin:2px 0 0;">${escapeHtml(SITE_TAGLINE)}</p>
        </div>
      </a>
    </div>
  </header>
  ${categoryNav()}`;
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

// প্রতিটা আর্টিকেলের slug আগে থেকে হিসেব করে রাখা
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
    <div class="meta">${formatDateBn(d)}</div>
    <div class="body-text" style="margin-top:20px;">${bodyToHtml(a.body)}</div>
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

// একটা আর্টিকেলের ছোট কার্ড
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

function latestSidebar(list){
  const items = list.slice(0, 8).map(a => {
    const slug = slugOf(a);
    return `<a href="/article/${slug}/" style="display:block;text-decoration:none;color:#222;padding:10px 0;border-bottom:1px solid #eee;font-size:14px;line-height:1.5;">${escapeHtml(a.title)}</a>`;
  }).join('');
  return `<aside style="background:#fafafa;border-radius:8px;padding:16px;">
    <h3 style="margin:0 0 10px;font-size:1.1rem;border-bottom:2px solid #c0392b;padding-bottom:8px;">সর্বশেষ</h3>
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

// ক্যাটাগরি পেজ
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
    <h2 style="border-bottom:2px solid #c0392b;padding-bottom:10px;">${escapeHtml(cat)}</h2>
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

console.log(`✓ Build সম্পূর্ণ – ${articles.length}টি আর্টিকেল, ${categories.length}টি ক্যাটাগরি পেজ, হোমপেজ, sitemap.xml ও robots.txt তৈরি হয়েছে`);
