;(function(){
  // =============================
  // Schedule Page: Task CRUD, CSV, Gantt Chart (modular)
  // =============================
  const SCHEDULE_KEY = 'pe_tasks_v3';
  const SCHEDULE_LEGACY_KEY = 'pe_tasks_v2';

  const $ = id => document.getElementById(id);

  // Escape for safe HTML
  function escapeHtml(s){
    return (s ?? '').toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  // Storage
  function loadTasks(){ return JSON.parse(localStorage.getItem(SCHEDULE_KEY) || '[]'); }
  function saveTasks(v){ localStorage.setItem(SCHEDULE_KEY, JSON.stringify(v)); }

  // Migrate legacy
  function migrateTasks(){
    if(localStorage.getItem(SCHEDULE_KEY)) return;
    const v2 = JSON.parse(localStorage.getItem(SCHEDULE_LEGACY_KEY) || '[]');
    if(Array.isArray(v2) && v2.length){
      const v3 = v2.map(r => ({ task: r.task || '', start: r.due || '', end: r.due || '', status: r.status || 'Pending' }));
      saveTasks(v3);
      if(window.toast) toast('แปลงข้อมูล due → start/end แล้ว');
    }
  }

  // CSV helpers
  function toCSV(rows){
    return rows.map(r => r.map(v => {
      const s = (v ?? '').toString();
      return /[,"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',')).join('\n');
  }
  function fromCSV(text){
    const rows = []; const re = /("([^"]|"")*"|[^,\n\r]*)(,|\r?\n|\r|$)/g;
    let row = [], m; while((m = re.exec(text)) !== null){
      let cell = m[1] || '';
      if(cell.startsWith('"')) cell = cell.slice(1, -1).replace(/""/g, '"');
      row.push(cell); const sep = m[3]; if(sep === ',') continue;
      rows.push(row); row = []; if(!sep) break;
    } return rows;
  }

  // Gantt
  function fmtDate(d){
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function drawGanttChart(rows){
    const svg = $('ganttSvg');
    const tooltip = $('tooltip');
    const wrap = $('ganttWrap');
    if(!svg || !tooltip || !wrap) return;
    const width = wrap.clientWidth || 1000;
    const margin = { top: 30, right: 20, bottom: 30, left: 160 };
    const barH = 26, gap = 10;
    const items = rows.filter(r => r.start && r.end);
    const height = Math.max(160, margin.top + margin.bottom + items.length * (barH + gap) + 6);
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    while(svg.firstChild) svg.removeChild(svg.firstChild);
    if(!items.length){
      const msg = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      msg.setAttribute('x', width/2); msg.setAttribute('y', height/2);
      msg.setAttribute('text-anchor','middle'); msg.setAttribute('class','g-axis');
      msg.textContent = 'ไม่มีข้อมูลที่มี Start/End';
      svg.appendChild(msg);
      return;
    }
    const times = items.flatMap(r => [new Date(r.start).getTime(), new Date(r.end).getTime()]);
    let tMin = Math.min(...times), tMax = Math.max(...times);
    const oneDay = 86400000;
    tMin -= oneDay; tMax += oneDay;
    const span = tMax - tMin;
    const spanDays = Math.ceil(span / oneDay);
    let stepDays = 1;
    if(spanDays > 14 && spanDays <= 60) stepDays = 7;
    else if(spanDays > 60 && spanDays <= 365) stepDays = 30;
    else if(spanDays > 365) stepDays = 90;

    function* tickGen(){
      const d0 = new Date(tMin); d0.setHours(0,0,0,0);
      while(d0.getTime() < tMin) d0.setDate(d0.getDate()+1);
      const dt = new Date(d0);
      while(dt.getTime() <= tMax){
        yield new Date(dt.getTime());
        dt.setDate(dt.getDate() + stepDays);
      }
    }

    const x0 = margin.left, x1 = width - margin.right;
    const y0 = margin.top;
    const innerW = x1 - x0;
    const x = t => x0 + ((t - tMin) / (tMax - tMin)) * innerW;

    items.forEach((r, idx) => {
      const y = y0 + idx * (26 + 10);
      const rowBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rowBg.setAttribute('x', 0);
      rowBg.setAttribute('y', y - 2);
      rowBg.setAttribute('width', width);
      rowBg.setAttribute('height', 26 + 4);
      rowBg.setAttribute('class', 'g-ybg');
      rowBg.setAttribute('opacity', idx % 2 === 0 ? '0.35' : '0.15');
      svg.appendChild(rowBg);
    });

    for(const d of tickGen()){
      const xt = x(d.getTime());
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', xt); line.setAttribute('x2', xt);
      line.setAttribute('y1', margin.top - 10); line.setAttribute('y2', height - margin.bottom + 6);
      line.setAttribute('class', 'g-grid');
      svg.appendChild(line);
      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', xt); txt.setAttribute('y', height - margin.bottom + 20);
      txt.setAttribute('text-anchor','middle'); txt.setAttribute('class','g-axis');
      txt.textContent = fmtDate(d);
      svg.appendChild(txt);
    }

    items.forEach((r, idx) => {
      const y = y0 + idx * (26 + 10) + 26/2;
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', margin.left - 10);
      label.setAttribute('y', y);
      label.setAttribute('text-anchor','end');
      label.setAttribute('class','g-label');
      label.textContent = r.task;
      svg.appendChild(label);
    });

    items.forEach((r, idx) => {
      const s = new Date(r.start).getTime();
      const e = new Date(r.end).getTime();
      const y = y0 + idx * (26 + 10);
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x(s));
      rect.setAttribute('y', y);
      rect.setAttribute('width', Math.max(2, x(e) - x(s)));
      rect.setAttribute('height', 26);
      const st = (r.status || 'Pending').toLowerCase();
      rect.setAttribute('class', 'g-task ' + (st === 'pending' ? 'pending' : st === 'wip' ? 'wip' : 'done'));
      rect.addEventListener('mouseenter', ev => {
        const tooltip = $('tooltip'); const wrap = $('ganttWrap'); if(!tooltip || !wrap) return;
        tooltip.style.display = 'block';
        tooltip.innerHTML = `<div><b>${escapeHtml(r.task)}</b></div>
          <div>Start: ${r.start || '-'}</div>
          <div>End&nbsp;&nbsp;: ${r.end || '-'}</div>
          <div>Status: ${r.status || '-'}</div>`;
      });
      rect.addEventListener('mousemove', ev => {
        const tooltip = $('tooltip'); const wrap = $('ganttWrap'); if(!tooltip || !wrap) return;
        const bb = wrap.getBoundingClientRect();
        const pad = 10;
        let left = ev.clientX - bb.left + pad;
        let top = ev.clientY - bb.top + pad;
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
      });
      rect.addEventListener('mouseleave', () => { const tooltip=$('tooltip'); if(tooltip) tooltip.style.display = 'none'; });
      svg.appendChild(rect);
    });

    const ax = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    ax.setAttribute('x', (x0 + x1)/2);
    ax.setAttribute('y', height - 6);
    ax.setAttribute('text-anchor','middle');
    ax.setAttribute('class','g-axis');
    svg.appendChild(ax);
  }

  function renderScheduleTable(){
    const tbody = document.querySelector('#tbl tbody');
    if(!tbody) return;
    const q = (document.getElementById('filter')?.value || '').toLowerCase().trim();
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

  function initSchedulePage(){
    if(!document.getElementById('tbl')) return;
    migrateTasks();
    renderScheduleTable();

    document.getElementById('add')?.addEventListener('click', () => {
      const task = document.getElementById('task').value.trim();
      const start = document.getElementById('start').value;
      const end = document.getElementById('end').value;
      const status = document.getElementById('status').value;
      if(!task) return window.toast ? toast('ใส่ชื่องานก่อนครับ') : alert('ใส่ชื่องานก่อนครับ');
      if(start && end && new Date(end) < new Date(start)) return window.toast ? toast('วันสิ้นสุดต้องไม่ก่อนวันเริ่ม') : alert('วันสิ้นสุดต้องไม่ก่อนวันเริ่ม');
      const data = loadTasks(); data.push({ task, start, end, status }); saveTasks(data);
      document.getElementById('task').value=''; document.getElementById('start').value=''; document.getElementById('end').value='';
      renderScheduleTable(); if(window.toast) toast('เพิ่มรายการแล้ว');
    });

    document.getElementById('clear')?.addEventListener('click', () => {
      if(!confirm('ล้างรายการทั้งหมด?')) return;
      saveTasks([]); renderScheduleTable(); if(window.toast) toast('ล้างรายการแล้ว');
    });

    document.getElementById('filter')?.addEventListener('input', renderScheduleTable);

    const tbody = document.querySelector('#tbl tbody');
    tbody?.addEventListener('click', e => {
      const t = e.target;
      if(t.dataset.toggle !== undefined){
        const i = +t.dataset.toggle; const data = loadTasks();
        const cycle = { Pending:'WIP', WIP:'Done', Done:'Pending' };
        data[i].status = cycle[data[i].status] || 'Pending';
        saveTasks(data); renderScheduleTable();
      }
      if(t.dataset.del !== undefined){
        const i = +t.dataset.del; const data = loadTasks();
        data.splice(i,1); saveTasks(data); renderScheduleTable();
      }
      if(t.dataset.edit !== undefined){
        const i = +t.dataset.edit; const data = loadTasks(); const r = data[i];
        const task = prompt('แก้ไขชื่อ งาน:', r.task) ?? r.task;
        const start = prompt('แก้ไขวันเริ่ม (YYYY-MM-DD):', r.start) ?? r.start;
        const end = prompt('แก้ไขวันสิ้นสุด (YYYY-MM-DD):', r.end) ?? r.end;
        const status = prompt('แก้ไขสถานะ (Pending/WIP/Done):', r.status) ?? r.status;
        data[i] = { task, start, end, status }; saveTasks(data); renderScheduleTable();
      }
    });

    document.getElementById('export')?.addEventListener('click', () => {
      const rows = [["Task","Start","End","Status"], ...loadTasks().map(r => [r.task, r.start, r.end, r.status])];
      const blob = new Blob([toCSV(rows)], { type: 'text/csv' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'schedule.csv'; a.click();
    });

    document.getElementById('import-file')?.addEventListener('change', async e => {
      const file = e.target.files[0]; if(!file) return;
      const text = await file.text();
      const rows = fromCSV(text);
      if(!rows.length) return window.toast ? toast('ไฟล์ว่างหรือรูปแบบผิด') : alert('ไฟล์ว่างหรือรูปแบบผิด');
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
      saveTasks(data); renderScheduleTable(); if(window.toast) toast('นำเข้า CSV แล้ว');
      e.target.value = '';
    });

    window.addEventListener('resize', () => drawGanttChart(loadTasks().filter(r => r.start && r.end)));
  }

  document.addEventListener('DOMContentLoaded', initSchedulePage);

  // expose minimal for debugging
  window.peSchedule = { loadTasks, saveTasks, renderScheduleTable };
})();
