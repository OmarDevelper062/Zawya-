/*
 * Channel feed integration: either point CONFIG.feedUrl at your own serverless
 * endpoint (recommended), or set an API key below for local development.
 * Never commit a production YouTube API key to a public client-side repository.
 */
const CHANNEL_ID = 'UCIC_9sLEVs6C5xCIRV9aN5Q';
const UPLOADS_PLAYLIST = 'UU' + CHANNEL_ID.slice(2);
const BUSINESS_EMAIL = 'business@zawiya.example'; // Replace with the channel's real inquiry address.
const CONFIG = { apiKey: '', feedUrl: '' };
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const videos = [];
const filters = { all: () => true, popular: v => v.category === 'popular', playlist: v => v.category === 'playlist', tutorial: v => v.category === 'tutorial' };

function renderVideos(filter = 'all') {
  const grid = $('#video-grid');
  const matches = videos.filter(filters[filter] || filters.all);
  if (!matches.length) {
    grid.innerHTML = `<div class="video-placeholder"><b>فيديوهات القناة بانتظار الربط</b><p>لإظهار الفيديوهات تلقائيًا، أضف مفتاح YouTube Data API في app.js أو اربط feedUrl بنقطة نهاية آمنة. وإلى ذلك الحين يمكنك مشاهدة أحدث الفيديوهات مباشرة من المشغّل أعلاه.</p><a class="button button-outline" href="https://www.youtube.com/channel/${CHANNEL_ID}/videos" target="_blank" rel="noreferrer">تصفّح فيديوهات القناة ↗</a></div>`;
    return;
  }
  grid.innerHTML = matches.map((video, index) => `<article class="video-card" tabindex="0" role="button" aria-label="شاهد ${escapeHTML(video.title)}" data-video-id="${escapeHTML(video.id)}"><div class="thumb" style="background-image:linear-gradient(135deg,#171820b8,#a32837aa),url('${escapeHTML(video.thumbnail)}');background-size:cover;background-position:center"><span class="thumb-label">${escapeHTML(video.label || 'من زاوية')}</span><span class="thumb-art">${['✳','◉','⌁'][index % 3]}</span><span class="thumb-play">▶</span></div><h3>${escapeHTML(video.title)}</h3><div class="video-meta"><span>${escapeHTML(video.published || 'من قناة زاوية')}</span>${video.duration ? `<span>${escapeHTML(video.duration)}</span>` : ''}</div></article>`).join('');
}
function escapeHTML(value = '') { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function openVideo(id) {
  const modal = $('#video-modal');
  $('.modal-frame', modal).innerHTML = `<iframe title="مشغل فيديو يوتيوب" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
  modal.showModal();
}
async function loadChannelData() {
  try {
    let items;
    if (CONFIG.feedUrl) {
      const response = await fetch(CONFIG.feedUrl);
      if (!response.ok) throw new Error('Feed request failed');
      const data = await response.json();
      items = data.videos || [];
      if (data.statistics) animateStats(data.statistics);
    } else if (CONFIG.apiKey) {
      const base = 'https://www.googleapis.com/youtube/v3/';
      const params = new URLSearchParams({ part: 'snippet,contentDetails', playlistId: UPLOADS_PLAYLIST, maxResults: '9', key: CONFIG.apiKey });
      const [listResponse, statsResponse] = await Promise.all([
        fetch(`${base}playlistItems?${params}`), fetch(`${base}channels?part=statistics&id=${CHANNEL_ID}&key=${encodeURIComponent(CONFIG.apiKey)}`)
      ]);
      if (!listResponse.ok || !statsResponse.ok) throw new Error('YouTube API request failed');
      const [listData, statsData] = await Promise.all([listResponse.json(), statsResponse.json()]);
      items = (listData.items || []).map(item => ({ id: item.snippet.resourceId.videoId, title: item.snippet.title, thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || '', published: new Intl.DateTimeFormat('ar', { dateStyle: 'medium' }).format(new Date(item.snippet.publishedAt)), category: 'all' }));
      const stats = statsData.items?.[0]?.statistics;
      if (stats) animateStats({ subscribers: stats.hiddenSubscriberCount ? null : stats.subscriberCount, views: stats.viewCount, videos: stats.videoCount });
    } else return;
    videos.splice(0, videos.length, ...items);
    renderVideos($('.filter.active')?.dataset.filter || 'all');
  } catch (error) { console.warn('Channel feed unavailable:', error.message); }
}
function animateStats(stats) {
  const values = [stats.subscribers, stats.views, stats.videos];
  $$('[data-count]').forEach((element, index) => {
    const target = Number(values[index]);
    if (!Number.isFinite(target)) { element.textContent = '—'; return; }
    const start = performance.now(), duration = 1100;
    const tick = now => { const progress = Math.min((now - start) / duration, 1); element.textContent = Intl.NumberFormat('ar', { notation: target > 999999 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(Math.round(target * (1 - (1 - progress) ** 3))); if (progress < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
}
renderVideos();
loadChannelData();
$('#year').textContent = new Date().getFullYear();
$$('.filter').forEach(button => button.addEventListener('click', () => { $$('.filter').forEach(item => item.classList.toggle('active', item === button)); renderVideos(button.dataset.filter); }));
$('#video-grid').addEventListener('click', event => { const card = event.target.closest('[data-video-id]'); if (card) openVideo(card.dataset.videoId); });
$('#video-grid').addEventListener('keydown', event => { const card = event.target.closest('[data-video-id]'); if (card && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openVideo(card.dataset.videoId); } });
$('.modal-close').addEventListener('click', () => $('#video-modal').close());
$('#video-modal').addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close(); });
$('#video-modal').addEventListener('close', () => { $('.modal-frame').replaceChildren(); });
const menuButton = $('.menu-toggle');
menuButton.addEventListener('click', () => { const open = $('.nav-links').classList.toggle('open'); menuButton.setAttribute('aria-expanded', String(open)); });
$$('.nav-links a').forEach(link => link.addEventListener('click', () => { $('.nav-links').classList.remove('open'); menuButton.setAttribute('aria-expanded', 'false'); }));
const themeButton = $('.theme-toggle');
const savedTheme = localStorage.getItem('zawiya-theme');
if (savedTheme === 'light') document.body.classList.add('light');
function updateThemeButton() { const light = document.body.classList.contains('light'); $('.theme-icon').textContent = light ? '☾' : '☼'; themeButton.setAttribute('aria-label', light ? 'تفعيل الوضع الداكن' : 'تفعيل الوضع الفاتح'); }
updateThemeButton();
themeButton.addEventListener('click', () => { document.body.classList.toggle('light'); localStorage.setItem('zawiya-theme', document.body.classList.contains('light') ? 'light' : 'dark'); updateThemeButton(); });
window.addEventListener('scroll', () => $('.header').classList.toggle('scrolled', window.scrollY > 10), { passive: true });
$('#newsletter').addEventListener('submit', event => { event.preventDefault(); $('.form-status').textContent = 'شكرًا لاهتمامك! اربط النموذج بخدمة بريدية لبدء استقبال الاشتراكات.'; event.currentTarget.reset(); });
$('.copy-email').addEventListener('click', async () => { try { await navigator.clipboard.writeText(BUSINESS_EMAIL); $('.copy-email').textContent = '✓'; setTimeout(() => $('.copy-email').textContent = '⧉', 1600); } catch { $('.copy-email').title = BUSINESS_EMAIL; } });
$('#contact-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget, data = new FormData(form);
  const subject = encodeURIComponent(`[${data.get('type')}] ${data.get('name')} — ${data.get('email')}`);
  const body = encodeURIComponent(`الاسم: ${data.get('name')}\nالبريد: ${data.get('email')}\nنوع التعاون: ${data.get('type')}\n\n${data.get('message')}`);
  $('.contact-status').textContent = 'سيتم فتح تطبيق البريد لإرسال رسالتك.';
  window.location.href = `mailto:${BUSINESS_EMAIL}?subject=${subject}&body=${body}`;
});
