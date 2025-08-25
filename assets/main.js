// =============================
// Capacity Planner Tool Logic
// =============================
function initCapacityPlanner() {
  // Only run on capacity-planner page
  if (!document.getElementById('cph')) return;
  const $ = id => document.getElementById(id);
  const qsa = sel => Array.from(document.querySelectorAll(sel));
  // Calculate and update results
  function calc() {
    const st = +$('st').value || 0;
    const avail = +$('avail').value || 0;
    const mc = +$('mc').value || 0;
    const oee = (+$('oee').value || 0) / 100;
    const secAvail = avail * 60;
    const capPerLine = st > 0 ? (secAvail / st) : 0;
    const cph = st > 0 ? (3600 / st) * mc * oee : 0;
    const shift = capPerLine * mc * oee;
    const day = shift * 2; // assume 2 shifts/day
    $('cph').textContent = Math.floor(cph);
    $('shift').textContent = Math.floor(shift);
    $('day').textContent = Math.floor(day);
  }
  // Event listeners
  $('calc').addEventListener('click', calc);
  $('reset').addEventListener('click', () => qsa('.input').forEach(i => i.value = ''));
}

// Initialize Capacity Planner if present
document.addEventListener('DOMContentLoaded', () => {
  initCapacityPlanner();
});
// =============================
// Index Page: KPI Chart Initialization
// =============================
document.addEventListener('DOMContentLoaded', () => {
  // Only run on index page if KPI charts exist
  if (document.getElementById('kpi-oee-chart')) {
    // Example KPI data (edit as needed)
    const data = {
      oee: [78, 80, 79, 82, 84, 83, 85, 86, 85, 86],
      avl: [88, 90, 89, 91, 92, 91, 92, 93, 92, 92],
      perf: [82, 83, 84, 85, 85, 86, 87, 88, 88, 88],
      qty: [96, 97, 97, 98, 98, 98, 98, 98, 99, 98]
    };
    setTimeout(() => {
      ['oee', 'avl', 'perf', 'qty'].forEach(k => {
        const c = document.getElementById(`kpi-${k}-chart`);
        if (c && typeof sparkline === 'function') {
          sparkline(c, data[k]);
        }
      });
    }, 300);
  }
});
// =============================
// Schedule Page: Task CRUD, CSV, Gantt Chart (modular, reusable)
// =============================

// --- Constants and DOM helpers ---
const SCHEDULE_KEY = 'pe_tasks_v3';
const SCHEDULE_LEGACY_KEY = 'pe_tasks_v2';
const $ = id => document.getElementById(id);

// --- Escape HTML for safe rendering ---
function escapeHtml(s) {
  return (s ?? '').toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
}

// --- Task CRUD (LocalStorage) ---
function loadTasks() {
  return JSON.parse(localStorage.getItem(SCHEDULE_KEY) || '[]');
}
function saveTasks(v) {
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(v));
}

// --- Migrate legacy data if needed ---
function migrateTasks() {
  if (localStorage.getItem(SCHEDULE_KEY)) return;
  const v2 = JSON.parse(localStorage.getItem(SCHEDULE_LEGACY_KEY) || '[]');
  if (Array.isArray(v2) && v2.length) {
    const v3 = v2.map(r => ({
      task: r.task || '',
      start: r.due || '',
      end: r.due || '',
      status: r.status || 'Pending'
    }));
    saveTasks(v3);
    toast('แปลงข้อมูล due → start/end แล้ว');
  }
}

// --- Render schedule table ---
function renderScheduleTable() {
  const tbody = document.querySelector('#tbl tbody');
  if (!tbody) return;
  const q = ($('filter')?.value || '').toLowerCase().trim();
  const data = loadTasks().filter(r => !q || JSON.stringify(r).toLowerCase().includes(q));
  tbody.innerHTML = '';
  data.forEach((r, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(r.task)}</td>
      <td>${r.start || '-'}</td>
      <td>${r.end || '-'}</td>
      <td><span class="status-badge status-${r.status}">${r.status}</span></td>
      <td>
        <button class="btn secondary" data-edit="${i}">Edit</button>
        <button class="btn secondary" data-toggle="${i}">Toggle</button>
        <button class="btn secondary" data-del="${i}">Del</button>
      </td>`;
    tbody.appendChild(tr);
  });
  drawGanttChart(data);
}

// --- CSV helpers (compatible with legacy) ---
function toCSV(rows) {
  return rows.map(r => r.map(v => {
    const s = (v ?? '').toString();
    return /[,"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',')).join('\n');
}
function fromCSV(text) {
  const rows = []; const re = /("([^"]|"")*"|[^,\n\r]*)(,|\r?\n|\r|$)/g;
  let row = [], m; while ((m = re.exec(text)) !== null) {
    let cell = m[1] || '';
    if (cell.startsWith('"')) cell = cell.slice(1, -1).replace(/""/g, '"');
    row.push(cell); const sep = m[3]; if (sep === ',') continue;
    rows.push(row); row = []; if (!sep) break;
  } return rows;
}

// --- Gantt Chart (SVG) ---
function drawGanttChart(rows) {
  const svg = $('ganttSvg');
  const tooltip = $('tooltip');
  const wrap = $('ganttWrap');
  if (!svg || !tooltip || !wrap) return;
  const width = wrap.clientWidth || 1000;
  const margin = { top: 30, right: 20, bottom: 30, left: 160 };
  const barH = 26, gap = 10;
  const items = rows.filter(r => r.start && r.end);
  const height = Math.max(160, margin.top + margin.bottom + items.length * (barH + gap) + 6);
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  if (!items.length) {
    const msg = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    msg.setAttribute('x', width / 2); msg.setAttribute('y', height / 2);
    msg.setAttribute('text-anchor', 'middle'); msg.setAttribute('class', 'g-axis');
    msg.textContent = 'ไม่มีข้อมูลที่มี Start/End';
    svg.appendChild(msg);
    return;
  }
  // Time domain
  const times = items.flatMap(r => [new Date(r.start).getTime(), new Date(r.end).getTime()]);
  let tMin = Math.min(...times), tMax = Math.max(...times);
  const oneDay = 86400000;
  tMin -= oneDay; tMax += oneDay;
  const span = tMax - tMin;
  // Axis ticks
  const spanDays = Math.ceil(span / oneDay);
  let stepDays = 1;
  if (spanDays > 14 && spanDays <= 60) stepDays = 7;
  else if (spanDays > 60 && spanDays <= 365) stepDays = 30;
  else if (spanDays > 365) stepDays = 90;
  function* tickGen() {
    const d0 = new Date(tMin); d0.setHours(0, 0, 0, 0);
    while (d0.getTime() < tMin) d0.setDate(d0.getDate() + 1);
    const dt = new Date(d0);
    while (dt.getTime() <= tMax) {
      yield new Date(dt.getTime());
      dt.setDate(dt.getDate() + stepDays);
    }
  }
  // Scale
  const x0 = margin.left, x1 = width - margin.right;
  const y0 = margin.top;
  const innerW = x1 - x0;
  const x = t => x0 + ((t - tMin) / (tMax - tMin)) * innerW;
  // Row backgrounds
  items.forEach((r, idx) => {
    const y = y0 + idx * (barH + gap);
    const rowBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rowBg.setAttribute('x', 0);
    rowBg.setAttribute('y', y - 2);
    rowBg.setAttribute('width', width);
    rowBg.setAttribute('height', barH + 4);
    rowBg.setAttribute('class', 'g-ybg');
    rowBg.setAttribute('opacity', idx % 2 === 0 ? '0.35' : '0.15');
    svg.appendChild(rowBg);
  });
  // Vertical grid + x labels
  for (const d of tickGen()) {
    const xt = x(d.getTime());
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', xt); line.setAttribute('x2', xt);
    line.setAttribute('y1', margin.top - 10); line.setAttribute('y2', height - margin.bottom + 6);
    line.setAttribute('class', 'g-grid');
    svg.appendChild(line);
    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', xt);
    txt.setAttribute('y', height - margin.bottom + 20);
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('class', 'g-axis');
    txt.textContent = fmtDate(d);
    svg.appendChild(txt);
  }
  // Y labels (task names)
  items.forEach((r, idx) => {
    const y = y0 + idx * (barH + gap) + barH / 2;
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', margin.left - 10);
    label.setAttribute('y', y);
    label.setAttribute('text-anchor', 'end');
    label.setAttribute('class', 'g-label');
    label.textContent = r.task;
    svg.appendChild(label);
  });
  // Bars
  items.forEach((r, idx) => {
    const s = new Date(r.start).getTime();
    const e = new Date(r.end).getTime();
    const y = y0 + idx * (barH + gap);
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x(s));
    rect.setAttribute('y', y);
    rect.setAttribute('width', Math.max(2, x(e) - x(s)));
    rect.setAttribute('height', barH);
    const st = (r.status || 'Pending').toLowerCase();
    rect.setAttribute('class', 'g-task ' + (st === 'pending' ? 'pending' : st === 'wip' ? 'wip' : 'done'));
    rect.addEventListener('mouseenter', ev => {
      tooltip.style.display = 'block';
      tooltip.innerHTML = `
        <div><b>${escapeHtml(r.task)}</b></div>
        <div>Start: ${r.start || '-'}</div>
        <div>End&nbsp;&nbsp;: ${r.end || '-'}</div>
        <div>Status: ${r.status || '-'}</div>`;
    });
    rect.addEventListener('mousemove', ev => {
      const bb = wrap.getBoundingClientRect();
      const pad = 10;
      // Prevent tooltip from overflowing right/bottom
      let left = ev.clientX - bb.left + pad;
      let top = ev.clientY - bb.top + pad;
      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
    });
    rect.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
    svg.appendChild(rect);
  });
  // X axis title
  const ax = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  ax.setAttribute('x', (x0 + x1) / 2);
  ax.setAttribute('y', height - 6);
  ax.setAttribute('text-anchor', 'middle');
  ax.setAttribute('class', 'g-axis');
  ax.textContent = 'เวลา';
  svg.appendChild(ax);
}
function fmtDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// --- Schedule page event handlers ---
function initSchedulePage() {
  if (!$("tbl")) return; // Only run on schedule page
  migrateTasks();
  renderScheduleTable();
  // Add
  $('add').addEventListener('click', () => {
    const task = $('task').value.trim();
    const start = $('start').value;
    const end = $('end').value;
    const status = $('status').value;
    if (!task) return toast('ใส่ชื่องานก่อนครับ');
    if (start && end && new Date(end) < new Date(start)) return toast('วันสิ้นสุดต้องไม่ก่อนวันเริ่ม');
    const data = loadTasks(); data.push({ task, start, end, status }); saveTasks(data);
    $('task').value = ''; $('start').value = ''; $('end').value = '';
    renderScheduleTable(); toast('เพิ่มรายการแล้ว');
  });
  // Clear
  $('clear').addEventListener('click', () => {
    if (!confirm('ล้างรายการทั้งหมด?')) return;
    saveTasks([]); renderScheduleTable(); toast('ล้างรายการแล้ว');
  });
  // Filter
  $('filter').addEventListener('input', renderScheduleTable);
  // Table actions
  const tbody = document.querySelector('#tbl tbody');
  tbody.addEventListener('click', e => {
    const t = e.target;
    if (t.dataset.toggle !== undefined) {
      const i = +t.dataset.toggle; const data = loadTasks();
      const cycle = { Pending: 'WIP', WIP: 'Done', Done: 'Pending' };
      data[i].status = cycle[data[i].status] || 'Pending';
      saveTasks(data); renderScheduleTable();
    }
    if (t.dataset.del !== undefined) {
      const i = +t.dataset.del; const data = loadTasks();
      data.splice(i, 1); saveTasks(data); renderScheduleTable();
    }
    if (t.dataset.edit !== undefined) {
      const i = +t.dataset.edit; const data = loadTasks(); const r = data[i];
      const task = prompt('แก้ไขชื่อ งาน:', r.task) ?? r.task;
      const start = prompt('แก้ไขวันเริ่ม (YYYY-MM-DD):', r.start) ?? r.start;
      const end = prompt('แก้ไขวันสิ้นสุด (YYYY-MM-DD):', r.end) ?? r.end;
      const status = prompt('แก้ไขสถานะ (Pending/WIP/Done):', r.status) ?? r.status;
      data[i] = { task, start, end, status }; saveTasks(data); renderScheduleTable();
    }
  });
  // Export CSV
  $('export').addEventListener('click', () => {
    const rows = [["Task", "Start", "End", "Status"], ...loadTasks().map(r => [r.task, r.start, r.end, r.status])];
    const blob = new Blob([toCSV(rows)], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'schedule.csv'; a.click();
  });
  // Import CSV
  $('import-file').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    const text = await file.text(); const rows = fromCSV(text); if (!rows.length) return toast('ไฟล์ว่างหรือรูปแบบผิด');
    const header = rows.shift().map(h => h.trim().toLowerCase());
    const isNew = header.includes('start') || header.includes('end');
    const idx = name => header.indexOf(name);
    const map = {
      task: idx('task'),
      start: isNew ? idx('start') : idx('due'),
      end: isNew ? idx('end') : idx('due'),
      status: idx('status')
    };
    const data = rows.map(r => ({ task: r[map.task] || '', start: r[map.start] || '', end: r[map.end] || '', status: r[map.status] || 'Pending' })).filter(r => r.task);
    saveTasks(data); renderScheduleTable(); toast('นำเข้า CSV แล้ว');
    e.target.value = '';
  });
  // Responsive redraw
  window.addEventListener('resize', () => drawGanttChart(loadTasks().filter(r => r.start && r.end)));
}

// --- Initialize schedule page if present ---
document.addEventListener('DOMContentLoaded', () => {
  if ($('tbl')) initSchedulePage();
});
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
async function loadPartial(selector, file) {
  try {
    const basePath = getBasePath();
    const fullPath = file.startsWith('./') ? basePath + file.substring(2) : file;
    
    // Try different cache strategies
    const response = await fetch(fullPath, { 
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      console.warn(`Failed to load ${fullPath}: ${response.status}`);
      return;
    }
    
    const html = await response.text();
    const element = qs(selector);
    if (element) {
      element.innerHTML = html;
      highlightActiveNav();
    }
  } catch (error) {
    console.warn(`Error loading partial ${file}:`, error);
  }
}

function highlightActiveNav() {
  const current = location.pathname.split('/').pop() || 'index.html';
  qsa('a[data-nav]').forEach(a => {
    let href = a.getAttribute('href');
    // Normalize href for comparison
    const hrefFile = href.split('/').pop();
    if ((current === 'index.html' && hrefFile === 'index.html') || current === hrefFile) {
      a.classList.add('active');
    } else {
      a.classList.remove('active');
    }
  });
}

// =============================
// Theme
// =============================
function applyTheme(t) { 
  document.documentElement.classList.toggle('light', t === 'light'); 
}

function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersLight = matchMedia && matchMedia('(prefers-color-scheme: light)').matches;
  const theme = saved || (prefersLight ? 'light' : 'dark');
  applyTheme(theme);

  // Use event delegation for theme toggle since header loads async
  document.addEventListener('click', e => {
    const btn = e.target.closest('#theme-toggle');
    if (!btn) return;
    const now = document.documentElement.classList.contains('light') ? 'dark' : 'light';
    localStorage.setItem('theme', now);
    applyTheme(now);
  });
}

// =============================
// Back to top
// =============================
function initBackToTop() {
  // Use event delegation since footer loads async
  document.addEventListener('click', e => {
    if (e.target.id === 'back-to-top') {
      scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  // Show/hide back to top button
  addEventListener('scroll', () => {
    const btt = qs('#back-to-top');
    if (btt) {
      if (scrollY > 420) {
        btt.classList.remove('hidden');
      } else {
        btt.classList.add('hidden');
      }
    }
  });
}

// =============================
// Search filter
// =============================
function attachFilter(inputSel, itemSel) {
  const input = qs(inputSel);
  if (!input) return;
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
function showModal(html) {
  const backdrop = qs('.modal-backdrop'); 
  const modal = qs('.modal');
  if (backdrop && modal) {
    qs('.modal .body').innerHTML = html;
    backdrop.style.display = 'block'; 
    modal.style.display = 'block';
  }
}

function hideModal() {
  const backdrop = qs('.modal-backdrop'); 
  const modal = qs('.modal');
  if (backdrop && modal) {
    backdrop.style.display = 'none'; 
    modal.style.display = 'none';
  }
}

function initModal() {
  // Use event delegation since footer loads async
  document.addEventListener('click', e => {
    if (e.target.matches('[data-modal-close]') || e.target.classList.contains('modal-backdrop')) {
      hideModal();
    }
  });
}

// =============================
// Toast
// =============================
let toastTimer;
function toast(msg, ms = 2500) {
  const t = qs('.toast'); 
  if (t) {
    t.textContent = msg; 
    t.style.display = 'block';
    clearTimeout(toastTimer); 
    toastTimer = setTimeout(() => t.style.display = 'none', ms);
  }
}

// =============================
// Tiny charts
// =============================
function sparkline(canvas, data) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.clientWidth;
  const h = canvas.height = canvas.clientHeight;
  const min = Math.min(...data);
  const max = Math.max(...data);
  ctx.clearRect(0, 0, w, h);
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * h;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.lineWidth = 2; 
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--brand-2'); 
  ctx.stroke();
}

// =============================
// CSV helpers
// =============================
function toCSV(rows) {
  return rows.map(r => r.map(x => `"${String(x).replaceAll('"', '""')}"`).join(',')).join('\n');
}

function fromCSV(text) {
  return text.trim().split(/\r?\n/).map(line => line.split(',').map(x => x.replace(/^"|"$/g, '')));
}

// =============================
// Data Flow Network Animation
// =============================
function initDataFlowNetwork() {
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
    nodes.forEach((n1, i) => {
      nodes.forEach((n2, j) => {
        if (i < j) {
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          if (Math.sqrt(dx * dx + dy * dy) < 180) {
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }
        }
      });
    });

    // Draw nodes
    ctx.fillStyle = "#22d3ee";
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 3, 0, Math.PI * 2);
      ctx.fill();
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
    });

    // Draw packets
    ctx.fillStyle = "#5ac8fa";
    packets.forEach(p => {
      const from = nodes[p.from];
      const to = nodes[p.to];
      const x = from.x + (to.x - from.x) * p.progress;
      const y = from.y + (to.y - from.y) * p.progress;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
      p.progress += 0.01;
      if (p.progress > 1) {
        p.from = p.to;
        p.to = Math.floor(Math.random() * nodes.length);
        p.progress = 0;
      }
    });

    requestAnimationFrame(loop);
  }

  loop();
}

// =============================
// Initialize all on DOM ready
// =============================
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize theme and other features first
  initTheme();
  initBackToTop();
  initModal();
  
  // Load partials
  await Promise.all([
    loadPartial('#site-header', './partials/header.html'),
    loadPartial('#site-footer', './partials/footer.html')
  ]);
  
  // Wait a bit for DOM to update, then highlight nav
  setTimeout(() => {
    highlightActiveNav();
  }, 100);
  
  // Initialize sparkline charts if present
  setTimeout(() => {
    ['oee', 'avl', 'perf', 'qty'].forEach(k => {
      const c = qs(`#kpi-${k}-chart`);
      if (c) sparkline(c, [78, 80, 79, 82, 84, 83, 85, 86, 85, 86]);
    });
  }, 200);

  // Initialize Data Flow Network animation
  setTimeout(() => {
    initDataFlowNetwork();
  }, 100);

  // Initialize tool filter if present
  attachFilter('#tool-filter', '#tool-list .item');
});