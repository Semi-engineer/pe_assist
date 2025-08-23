// Utilities
const qs = (sel, el=document) => el.querySelector(sel);
const qsa = (sel, el=document) => Array.from(el.querySelectorAll(sel));

// Partials loader + active nav
async function loadPartial(selector, file){
  try{
    const res = await fetch(file, {cache:'no-store'});
    if(!res.ok) return;
    const html = await res.text();
    qs(selector).innerHTML = html;
    highlightActiveNav();
  }catch(e){/* ignore */}
}
function highlightActiveNav(){
  const current = location.pathname.split('/').pop() || 'index.html';
  qsa('a[data-nav]').forEach(a => {
    const href = a.getAttribute('href');
    if ((current === 'index.html' && href.endsWith('index.html')) || current === href){
      a.classList.add('active');
    } else a.classList.remove('active');
  });
}

// Theme
function applyTheme(t){ document.documentElement.classList.toggle('light', t==='light'); }
function initTheme(){
  const saved = localStorage.getItem('theme');
  const prefersLight = matchMedia && matchMedia('(prefers-color-scheme: light)').matches;
  const theme = saved || (prefersLight ? 'light' : 'dark');
  applyTheme(theme);
  document.addEventListener('click', e => {
    const btn = e.target.closest('#theme-toggle');
    if(!btn) return;
    const now = document.documentElement.classList.contains('light') ? 'dark' : 'light';
    localStorage.setItem('theme', now); applyTheme(now);
  });
}

// Back to top
function initBackToTop(){
  const btt = qs('#back-to-top');
  if(!btt) return;
  addEventListener('scroll', () => {
    if (scrollY > 420) btt.classList.remove('hidden'); else btt.classList.add('hidden');
  });
  btt.addEventListener('click', () => scrollTo({top:0, behavior:'smooth'}));
}

// Search filter
function attachFilter(inputSel, itemSel){
  const input = qs(inputSel);
  if(!input) return;
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    qsa(itemSel).forEach(el => { el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none'; });
  });
}

// Modal
function showModal(html){
  const backdrop = qs('.modal-backdrop'); const modal = qs('.modal');
  qs('.modal .body').innerHTML = html;
  backdrop.style.display = 'block'; modal.style.display = 'block';
}
function hideModal(){
  const backdrop = qs('.modal-backdrop'); const modal = qs('.modal');
  backdrop.style.display = 'none'; modal.style.display = 'none';
}
function initModal(){
  document.addEventListener('click', e => {
    if (e.target.matches('[data-modal-close]') || e.target.classList.contains('modal-backdrop')) hideModal();
  });
}

// Toast
let toastTimer;
function toast(msg, ms=2500){
  const t = qs('.toast'); t.textContent = msg; t.style.display = 'block';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.style.display = 'none', ms);
}

// Tiny charts
function sparkline(canvas, data){
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.clientWidth, h = canvas.height = canvas.clientHeight;
  const min = Math.min(...data), max = Math.max(...data);
  ctx.clearRect(0,0,w,h);
  ctx.beginPath();
  data.forEach((v,i) => {
    const x = (i/(data.length-1))*w;
    const y = h - ((v-min)/(max-min||1))*h;
    i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  });
  ctx.lineWidth = 2; ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--brand-2'); ctx.stroke();
}

// CSV helpers
function toCSV(rows){
  return rows.map(r => r.map(x => `"${String(x).replaceAll('"','""')}"`).join(',')).join('\n');
}
function fromCSV(text){
  return text.trim().split(/\r?\n/).map(line => line.split(',').map(x => x.replace(/^"|"$/g,'')));
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadPartial('#site-header', './partials/header.html');
  await loadPartial('#site-footer', './partials/footer.html');
  initTheme(); initBackToTop(); initModal(); highlightActiveNav();
});
