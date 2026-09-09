// দৈনিক করবার্তা — front-end renderer
// Reads content/articles.json and content/settings.json (edited via /admin panel)
// and renders the homepage. No build step required.

const BN_WEEKDAYS = ['রবিবার','সোমবার','মঙ্গলবার','বুধবার','বৃহস্পতিবার','শুক্রবার','শনিবার'];
const BN_MONTHS = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
const BN_DIGITS = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];

function toBnNumber(n){
  return String(n).split('').map(ch => /\d/.test(ch) ? BN_DIGITS[ch] : ch).join('');
}
function formatDateBn(dateObj){
  const day = toBnNumber(dateObj.getDate());
  const month = BN_MONTHS[dateObj.getMonth()];
  const year = toBnNumber(dateObj.getFullYear());
  const weekday = BN_WEEKDAYS[dateObj.getDay()];
  return `${weekday}, ${day} ${month} ${year}`;
}
function formatTimeAgoBn(dateObj){
  return formatDateBn(dateObj);
}
function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
function bodyToHtml(body){
  return (body || '').split(/\n\s*\n/).map(p => `<p>${escapeHtml(p).replace(/\n/g,'<br>')}</p>`).join('');
}
// build.js-এর slugify-এর সাথে হুবহু মিলিয়ে রাখতে হবে
function slugify(title, index){
  const base = String(title)
    .trim()
    .replace(/[""''।,.!?()\[\]:;]/g, '')
    .replace(/\s+/g, '-');
  return `${base}-${index}`;
}

let ALL_ARTICLES = [];
let ACTIVE_CATEGORY = 'সব';

async function loadData(){
  try{
    const [articlesRes, settingsRes] = await Promise.all([
      fetch('content/articles.json', {cache:'no-store'}),
      fetch('content/settings.json', {cache:'no-store'})
    ]);
    const articlesData = await articlesRes.json();
    const settingsData = await settingsRes.json();
    ALL_ARTICLES = (articlesData.articles || []).map((a, i) => ({...a, _id: 'art-' + i, _slug: slugify(a.title, i)}));
    ALL_ARTICLES.sort((a,b) => new Date(b.date) - new Date(a.date));
    renderSettings(settingsData);
    renderNav();
    renderAll();
  }catch(err){
    document.getElementById('main-content').innerHTML =
      '<div class="wrap"><p class="empty">খবর লোড করা যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।</p></div>';
    console.error(err);
  }
}

function renderSettings(settings){
  if(settings.site_title){
    document.getElementById('site-title').textContent = settings.site_title;
    document.title = settings.site_title + ' — ' + (settings.tagline || '');
  }
  if(settings.tagline){
    document.getElementById('site-tagline').textContent = settings.tagline;
  }
  const tickerList = document.getElementById('ticker-list');
  const items = (settings.breaking_news || []).map(b => `<li>${escapeHtml(b.text)}</li>`);
  tickerList.innerHTML = items.concat(items).join(''); // duplicate for seamless loop
}

function getCategories(){
  const set = new Set(ALL_ARTICLES.map(a => a.category).filter(Boolean));
  return ['সব', ...set];
}

function renderNav(){
  const nav = document.getElementById('cat-nav');
  nav.innerHTML = '';
  getCategories().forEach(cat => {
    const btn = document.createElement('button');
    btn.textContent = cat;
    if(cat === ACTIVE_CATEGORY) btn.classList.add('active');
    btn.addEventListener('click', () => {
      ACTIVE_CATEGORY = cat;
      renderNav();
      renderAll();
      window.scrollTo({top:0, behavior:'smooth'});
    });
    nav.appendChild(btn);
  });
}

function filteredArticles(){
  if(ACTIVE_CATEGORY === 'সব') return ALL_ARTICLES;
  return ALL_ARTICLES.filter(a => a.category === ACTIVE_CATEGORY);
}

function renderAll(){
  const list = filteredArticles();
  if(list.length === 0){
    document.getElementById('lead-story').innerHTML = '';
    document.getElementById('article-grid').innerHTML = '<p class="empty">এই বিভাগে এখনও কোনো সংবাদ নেই।</p>';
    document.getElementById('most-read').innerHTML = '';
    return;
  }

  const featured = list.find(a => a.featured) || list[0];
  const rest = list.filter(a => a._id !== featured._id);

  document.getElementById('lead-story').innerHTML = leadTemplate(featured);
  document.getElementById('lead-story').querySelector('.lead').addEventListener('click', (e) => {
    e.preventDefault();
    openArticle(featured._id);
  });

  const grid = document.getElementById('article-grid');
  grid.innerHTML = rest.map(cardTemplate).join('');
  grid.querySelectorAll('.card').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      openArticle(el.dataset.id);
    });
  });

  const mostRead = document.getElementById('most-read');
  mostRead.innerHTML = ALL_ARTICLES.slice(0,5).map((a,i) => `
    <a class="side-item" href="/article/${a._slug}/" data-id="${a._id}">
      <span class="num">${toBnNumber(i+1)}</span>
      <h5>${escapeHtml(a.title)}</h5>
    </a>`).join('');
  mostRead.querySelectorAll('.side-item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      openArticle(el.dataset.id);
    });
  });
}

function leadTemplate(a){
  const d = new Date(a.date);
  return `
    <a class="lead" href="/article/${a._slug}/" data-id="${a._id}">
      ${a.image ? `<img src="${escapeHtml(a.image)}" alt="${escapeHtml(a.title)}" style="margin-bottom:14px;">` : ''}
      <span class="cat-tag">${escapeHtml(a.category)}</span>
      <h2>${escapeHtml(a.title)}</h2>
      <p>${escapeHtml(a.excerpt || '')}</p>
      <div class="meta">${formatDateBn(d)}</div>
    </a>`;
}

function cardTemplate(a){
  const d = new Date(a.date);
  return `
    <a class="card" href="/article/${a._slug}/" data-id="${a._id}">
      <span class="cat-tag">${escapeHtml(a.category)}</span>
      <h3>${escapeHtml(a.title)}</h3>
      <p>${escapeHtml(a.excerpt || '')}</p>
      <div class="meta">${formatDateBn(d)}</div>
    </a>`;
}

function openArticle(id){
  const a = ALL_ARTICLES.find(x => x._id === id);
  if(!a) return;
  const d = new Date(a.date);
  document.getElementById('article-detail').innerHTML = `
    ${a.image ? `<img src="${escapeHtml(a.image)}" alt="${escapeHtml(a.title)}" style="margin-bottom:16px;">` : ''}
    <span class="cat-tag">${escapeHtml(a.category)}</span>
    <h2>${escapeHtml(a.title)}</h2>
    <div class="meta">${formatDateBn(d)}</div>
    <div class="body-text">${bodyToHtml(a.body)}</div>
  `;
  document.getElementById('overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  history.pushState({articleId: id}, '', `/article/${a._slug}/`);
  document.title = `${a.title} — ${document.getElementById('site-title').textContent}`;
}
function closeArticle(){
  document.getElementById('overlay').classList.remove('open');
  document.body.style.overflow = '';
  if(location.pathname.startsWith('/article/')){
    history.pushState(null, '', '/');
  }
}

document.getElementById('close-btn').addEventListener('click', closeArticle);
document.getElementById('overlay').addEventListener('click', (e) => {
  if(e.target.id === 'overlay') closeArticle();
});
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape') closeArticle();
});

document.getElementById('today-date').textContent = formatDateBn(new Date());
document.getElementById('year').textContent = toBnNumber(new Date().getFullYear());

loadData();
