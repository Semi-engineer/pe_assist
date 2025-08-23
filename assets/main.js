// =============================
// Utilities
// =============================
const qs = (sel, el=document) => el.querySelector(sel);
const qsa = (sel, el=document) => Array.from(el.querySelectorAll(sel));

// =============================
// Path resolver for GitHub Pages
// =============================
function getBasePath() {
  const path = location.pathname;
  const isInTools = path.includes('/tools/');
  return isInTools ? '../' : './';
}

// =============================
// Partials loader + active nav
// =============================
async function loadPartial(selector, file){
  try{
    const basePath = getBasePath();
    const fullPath = file.startsWith('./') ? basePath + file.substring(2) : file;
    const res = await fetch(fullPath, {cache:'no-store'});
    if(!res.ok) return;
    const html = await res.text();
    qs(selector).innerHTML = html;
    highlightActiveNav();
  }catch(e){/* ignore */}
}

function highlightActiveNav(){
  const current = location.pathname.split('/').pop() || 'index.html';
  qsa('a[data-nav]').forEach(a => {
    let href = a.getAttribute('href');
    // Normalize href for comparison
    const hrefFile = href.split('/').pop();
    if ((current === 'index.html' && hrefFile === 'index.html') || current === hrefFile){
      a.classList.add('active');
    } else a.classList.remove('active');
  });
}

// =============================
// Theme
// =============================
function applyTheme(t){ 
  document.documentElement.classList.toggle('light', t==='light'); 
}

function initTheme(){
  const saved = localStorage.getItem('theme');
  const prefersLight = matchMedia && matchMedia('(prefers-color-scheme: light)').matches;
  const theme = saved || (prefersLight ? 'light' : 'dark');
  applyTheme(theme);

  document.addEventListener('click', e => {
    const btn = e.target.closest('#theme-toggle');
    if(!btn) return;
    const now = document.documentElement.classList.contains('light') ? 'dark' : 'light';
    localStorage.setItem('theme', now);
    applyTheme(now);
  });
}

// =============================
// Back to top
// =============================
function initBackToTop(){
  const btt = qs('#back-to-top');
  if(!btt) return;
  addEventListener('scroll', () => {
    if (scrollY > 420) btt.classList.remove('hidden'); else btt.classList.add('hidden');
  });
  btt.addEventListener('click', () => scrollTo({top:0, behavior:'smooth'}));
}

// =============================
// Search filter
// =============================
function attachFilter(inputSel, itemSel){
  const input = qs(inputSel);
  if(!input) return;
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    qsa(itemSel).forEach(el => { 
      el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none'; 
    });
  });
}

// =============================
// Modal
// =============================
function showModal(html){
  const backdrop = qs('.modal-backdrop'); 
  const modal = qs('.modal');
  qs('.modal .body').innerHTML = html;
  backdrop.style.display = 'block'; 
  modal.style.display = 'block';
}

function hideModal(){
  const backdrop = qs('.modal-backdrop'); 
  const modal = qs('.modal');
  backdrop.style.display = 'none'; 
  modal.style.display = 'none';
}

function initModal(){
  document.addEventListener('click', e => {
    if (e.target.matches('[data-modal-close]') || e.target.classList.contains('modal-backdrop')) 
      hideModal();
  });
}

// =============================
// Toast
// =============================
let toastTimer;
function toast(msg, ms=2500){
  const t = qs('.toast'); 
  t.textContent = msg; 
  t.style.display = 'block';
  clearTimeout(toastTimer); 
  toastTimer = setTimeout(() => t.style.display = 'none', ms);
}

// =============================
// Tiny charts
// =============================
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
  ctx.lineWidth = 2; 
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--brand-2'); 
  ctx.stroke();
}

// =============================
// CSV helpers
// =============================
function toCSV(rows){
  return rows.map(r => r.map(x => `"${String(x).replaceAll('"','""')}"`).join(',')).join('\n');
}

function fromCSV(text){
  return text.trim().split(/\r?\n/).map(line => line.split(',').map(x => x.replace(/^"|"$/g,'')));
}

// =============================
// Data Flow Network Animation
// =============================
function initDataFlowNetwork(){
  const cvs = qs('#spark');
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  let w, h;
  const resize = () => { w = cvs.width = cvs.clientWidth; h = cvs.height = cvs.clientHeight; };
  window.addEventListener('resize', resize);
  resize();

  const nodes = Array.from({ length: 25 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3
  }));

  const packets = Array.from({ length: 30 }, () => ({
    from: Math.floor(Math.random() * nodes.length),
    to: Math.floor(Math.random() * nodes.length),
    progress: Math.random()
  }));

  function loop() {
    ctx.clearRect(0, 0, w, h);

    // Draw connections
    ctx.strokeStyle = "rgba(34,211,238,0.2)";
    ctx.lineWidth = 1;
    nodes.forEach((n1,i)=>{
      nodes.forEach((n2,j)=>{
        if(i<j){
          const dx=n1.x-n2.x, dy=n1.y-n2.y;
          if(Math.sqrt(dx*dx+dy*dy)<180){
            ctx.beginPath(); ctx.moveTo(n1.x,n1.y); ctx.lineTo(n2.x,n2.y); ctx.stroke();
          }
        }
      });
    });

    // Draw nodes
    ctx.fillStyle = "#22d3ee";
    nodes.forEach(n=>{
      ctx.beginPath(); ctx.arc(n.x,n.y,3,0,Math.PI*2); ctx.fill();
      n.x+=n.vx; n.y+=n.vy;
      if(n.x<0||n.x>w)n.vx*=-1;
      if(n.y<0||n.y>h)n.vy*=-1;
    });

    // Draw packets
    ctx.fillStyle = "#5ac8fa";
    packets.forEach(p=>{
      const from=nodes[p.from], to=nodes[p.to];
      const x=from.x+(to.x-from.x)*p.progress;
      const y=from.y+(to.y-from.y)*p.progress;
      ctx.beginPath(); ctx.arc(x,y,2,0,Math.PI*2); ctx.fill();
      p.progress+=0.01;
      if(p.progress>1){ p.from=p.to; p.to=Math.floor(Math.random()*nodes.length); p.progress=0; }
    });

    requestAnimationFrame(loop);
  }

  loop();
}

// =============================
// Initialize all on DOM ready
// =============================
document.addEventListener('DOMContentLoaded', async () => {
  await loadPartial('#site-header', './partials/header.html');
  await loadPartial('#site-footer', './partials/footer.html');
  initTheme(); initBackToTop(); initModal(); highlightActiveNav();
  
  // Initialize sparkline charts if present
  ['oee','avl','perf','qty'].forEach(k=>{
    const c = qs(`#kpi-${k}-chart`);
    if(c) setTimeout(()=> sparkline(c, [78,80,79,82,84,83,85,86,85,86]),50);
  });

  // Initialize Data Flow Network animation
  initDataFlowNetwork();

  // Initialize tool filter if present
  attachFilter('#tool-filter', '#tool-list .item');
});