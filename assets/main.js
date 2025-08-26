// =============================
// Utilities
// =============================
const Utils = (() => {
  const qs = (sel, el = document) => el.querySelector(sel);
  const qsa = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const escapeHtml = s => (s ?? '').toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
  const fmtDate = d => {
    const yyyy = d.getFullYear(), mm = String(d.getMonth() + 1).padStart(2,'0'), dd = String(d.getDate()).padStart(2,'0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const toast = (msg, ms = 2500) => {
    const t = qs('.toast'); 
    if (!t) return;
    t.textContent = msg; t.style.display = 'block';
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => t.style.display = 'none', ms);
  };
  return { qs, qsa, escapeHtml, fmtDate, toast };
})();

// =============================
// Partials Loader
// =============================
const Partials = (() => {
  const { qs, qsa } = Utils;

  // หา base path อัตโนมัติ (รองรับ project page)
  const getBasePath = () => {
    const pathParts = location.pathname.split('/');
    const repoIndex = pathParts.indexOf('pe_assist'); // เปลี่ยนเป็นชื่อ repo ของคุณ
    if (repoIndex >= 0) {
      return '/' + pathParts.slice(1, repoIndex + 1).join('/') + '/';
    }
    return '/';
  };
  const basePath = getBasePath();

  const loadPartial = async (selector, file) => {
    try {
      const path = file.startsWith('./') || file.startsWith('/') ? basePath + file.replace(/^(\.\/|\/)/,'') : file;
      const res = await fetch(path, { cache: 'no-cache' });
      if (!res.ok) return console.warn(`Failed to load ${path}`);
      const html = await res.text();
      const el = qs(selector); if (el) el.innerHTML = html;
      highlightNav();
    } catch (err) { console.warn(err); }
  };

  const highlightNav = () => {
    const current = location.pathname.split('/').pop() || 'index.html';
    qsa('a[data-nav]').forEach(a => 
      a.classList.toggle('active', a.getAttribute('href').split('/').pop() === current)
    );
  };

  return { loadPartial, highlightNav };
})();

// =============================
// Theme Manager
// =============================
const Theme = (() => {
  const { qs } = Utils;
  const apply = t => document.documentElement.classList.toggle('light', t==='light');
  const init = () => {
    const saved = localStorage.getItem('theme');
    const prefers = matchMedia('(prefers-color-scheme: light)').matches;
    const theme = saved || (prefers ? 'light' : 'dark');
    apply(theme);

    document.addEventListener('click', e => {
      if (!e.target.closest('#theme-toggle')) return;
      const now = document.documentElement.classList.contains('light') ? 'dark' : 'light';
      localStorage.setItem('theme', now);
      apply(now);
    });
  };
  return { init };
})();

// =============================
// Capacity Planner
// =============================
const CapacityPlanner = (() => {
  const { qs, qsa } = Utils;
  const calc = () => {
    const st = +qs('#st').value||0;
    const avail = +qs('#avail').value||0;
    const mc = +qs('#mc').value||0;
    const oee = (+qs('#oee').value||0)/100;
    const secAvail = avail*60;
    const capPerLine = st>0 ? secAvail/st : 0;
    const cph = st>0 ? (3600/st)*mc*oee : 0;
    const shift = capPerLine*mc*oee;
    const day = shift*2;
    qs('#cph').textContent = Math.floor(cph);
    qs('#shift').textContent = Math.floor(shift);
    qs('#day').textContent = Math.floor(day);
  };
  const init = () => {
    if (!qs('#cph')) return;
    qs('#calc').addEventListener('click', calc);
    qs('#reset').addEventListener('click', () => qsa('.input').forEach(i=>i.value=''));
  };
  return { init };
})();

// =============================
// Schedule & Gantt Module
// =============================
const Schedule = (() => {
  const { qs, qsa, escapeHtml } = Utils;
  const STORAGE = 'pe_tasks_v3';

  const loadTasks = () => JSON.parse(localStorage.getItem(STORAGE)||'[]');
  const saveTasks = v => localStorage.setItem(STORAGE, JSON.stringify(v));
  
  const renderTable = () => {
    const tbody = qs('#tbl tbody'); if (!tbody) return;
    const filter = (qs('#filter')?.value||'').toLowerCase().trim();
    const data = loadTasks().filter(r=>!filter||JSON.stringify(r).toLowerCase().includes(filter));
    tbody.innerHTML = '';
    data.forEach((r,i)=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(r.task)}</td>
        <td>${r.start||'-'}</td>
        <td>${r.end||'-'}</td>
        <td><span class="status-badge status-${r.status}">${r.status}</span></td>
        <td>
          <button class="btn secondary" data-edit="${i}">Edit</button>
          <button class="btn secondary" data-toggle="${i}">Toggle</button>
          <button class="btn secondary" data-del="${i}">Del</button>
        </td>`;
      tbody.appendChild(tr);
    });
    // TODO: call drawGanttChart(data)
  };

  const init = () => {
    if (!qs('#tbl')) return;
    renderTable();
    // Add, Clear, Filter, Table Actions, CSV, etc. 
  };
  return { init };
})();

// =============================
// Back to Top
// =============================
const BackToTop = (() => {
  const { qs } = Utils;
  const init = () => {
    document.addEventListener('click', e => { if (e.target.id==='back-to-top') scrollTo({top:0, behavior:'smooth'}); });
    addEventListener('scroll', () => {
      const btt = qs('#back-to-top');
      if (!btt) return;
      btt.classList.toggle('hidden', scrollY <= 420);
    });
  };
  return { init };
})();

// =============================
// Tiny Charts
// =============================
const Charts = (() => {
  const { qs } = Utils;
  const sparkline = (canvas, data) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.clientWidth;
    const h = canvas.height = canvas.clientHeight;
    const min = Math.min(...data), max = Math.max(...data);
    ctx.clearRect(0,0,w,h);
    ctx.beginPath();
    data.forEach((v,i)=>{ const x=(i/(data.length-1))*w; const y=h-((v-min)/(max-min||1))*h; i?ctx.lineTo(x,y):ctx.moveTo(x,y); });
    ctx.lineWidth=2; ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--brand-2'); ctx.stroke();
  };
  return { sparkline };
})();

// =============================
// =============================
// Load Header & Footer with Fetch
// =============================
document.addEventListener('DOMContentLoaded', () => {
  const loadPartial = async (selector, url) => {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`Failed to load ${url}`);
      const html = await res.text();
      document.querySelector(selector).innerHTML = html;
    } catch (err) {
      console.warn(err);
    }
  };

  // ปรับ path ตามตำแหน่งหน้า (root หรือ subfolder)
  const basePath = location.pathname.includes('/tools/') ? '../' : './';

  loadPartial('#site-header', `${basePath}partials/header.html`);
  loadPartial('#site-footer', `${basePath}partials/footer.html`);
});
