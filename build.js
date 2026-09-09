// build.js — দৈনিক করবার্তা SEO builder
// প্রতিবার কনটেন্ট পরিবর্তন হলে (এডমিন প্যানেল থেকে বা ম্যানুয়ালি) এই স্ক্রিপ্ট চালালে
// প্রতিটা সংবাদের জন্য আলাদা static HTML পেজ, sitemap.xml ও robots.txt তৈরি হয়।
//
// লোকাল/ম্যানুয়াল রান:   node build.js
// Netlify-তে (GitHub দিয়ে ডিপ্লয় করলে) এটা build command হিসেবে netlify.toml-এ সেট করা আছে,
// তাই এডমিন প্যানেল থেকে সেভ করলেই স্বয়ংক্রিয়ভাবে চলবে।

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://dainik-korbarta.netlify.app'; // নিজের ডোমেইন বসালে এখানে বদলে দিন

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
// একই স্লাগ-তৈরির নিয়ম script.js-এও আছে, দুটো মিলিয়ে রাখতে হবে
function slugify(title, index){
  const base = String(title)
    .trim()
    .replace(/[""''।,.!?()\[\]:;]/g, '')
    .replace(/\s+/g, '-');
  return `${base}-${index}`;
}

function readJson(p){ return JSON.parse(fs.readFileSync(p, 'utf8')); }

const articlesData = readJson('content/articles.json');
const settings = readJson('content/settings.json');
const articles = articlesData.articles || [];

// পুরনো জেনারেটেড ফোল্ডার সাফ করা
if (fs.existsSync('article')) fs.rmSync('article', { recursive: true, force: true });
fs.mkdirSync('article');

const urls = [`${SITE_URL}/`];

function articlePageHtml(a, slug){
  const d = new Date(a.date);
  const title = `${escapeHtml(a.title)} — ${escapeHtml(settings.site_title || 'দৈনিক করবার্তা')}`;
  const desc = escapeHtml(a.excerpt || a.title);
  const canonical = `${SITE_URL}/article/${slug}/`;
  return `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(a.title)}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${canonical}">
${a.image ? `<meta property="og:image" content="${escapeHtml(a.image)}">` : ''}
<link rel="stylesheet" href="/style.css">
</head>
<body>
<header class="masthead">
  <div class="wrap">
    <a href="/"><h1>${escapeHtml(settings.site_title || 'দৈনিক করবার্তা')}</h1></a>
    <p class="tagline">${escapeHtml(settings.tagline || '')}</p>
  </div>
</header>
<main class="wrap" style="max-width:760px;padding:36px 20px 60px;">
  <p><a href="/">← হোমপেজে ফিরুন</a></p>
  ${a.image ? `<img src="${escapeHtml(a.image)}" alt="${escapeHtml(a.title)}" style="margin-bottom:16px;width:100%;">` : ''}
  <span class="cat-tag">${escapeHtml(a.category)}</span>
  <h1 style="font-size:clamp(1.5rem,4vw,2.1rem);margin:10px 0 12px;line-height:1.35;">${escapeHtml(a.title)}</h1>
  <div class="meta">${formatDateBn(d)}</div>
  <div class="body-text" style="margin-top:20px;">${bodyToHtml(a.body)}</div>
</main>
<footer>
  <div class="wrap">
    <span>© ${toBnNumber(new Date().getFullYear())} ${escapeHtml(settings.site_title || 'দৈনিক করবার্তা')}</span>
    <a href="/">হোমপেজ</a>
  </div>
</footer>
</body>
</html>`;
}

const slugMap = [];
articles.forEach((a, i) => {
  const slug = slugify(a.title, i);
  slugMap.push({ index: i, slug });
  const dir = path.join('article', slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), articlePageHtml(a, slug));
  urls.push(`${SITE_URL}/article/${slug}/`);
});

// script.js যাতে হোমপেজ থেকে সঠিক লিংকে যেতে পারে, তাই স্লাগ ম্যাপ আলাদা ফাইলে রাখা হলো
fs.mkdirSync('content', { recursive: true });
fs.writeFileSync('content/article-slugs.json', JSON.stringify(slugMap, null, 2));

// sitemap.xml
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync('sitemap.xml', sitemap);

// robots.txt
fs.writeFileSync('robots.txt', `User-agent: *
Allow: /
Disallow: /admin/
Sitemap: ${SITE_URL}/sitemap.xml
`);

console.log(`✓ Build সম্পূর্ণ — ${articles.length}টি আর্টিকেল পেজ, sitemap.xml ও robots.txt তৈরি হয়েছে।`);
