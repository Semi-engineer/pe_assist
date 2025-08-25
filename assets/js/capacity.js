;(function(){
  // =============================
  // Capacity Planner Tool Logic
  // =============================
  function $(id){ return document.getElementById(id); }

  function calc(){
    const st = +$('st').value || 0;
    const avail = +$('avail').value || 0;     // minutes
    const mc = +$('mc').value || 0;           // machines
    const oee = (+$('oee').value || 0) / 100; // % → ratio
    const secAvail = avail * 60;
    const capPerLine = st > 0 ? (secAvail / st) : 0;
    const cph = st > 0 ? (3600 / st) * mc * oee : 0;
    const shift = capPerLine * mc * oee;
    const day = shift * 2; // assume 2 shifts/day
    const set = (id, v)=>{ const el=$(id); if(el) el.textContent = Math.floor(v); };
    set('cph', cph); set('shift', shift); set('day', day);
  }

  function reset(){
    document.querySelectorAll('#capacity-planner .input, .capacity .input, .cp-input, input.cp').forEach(i => i.value='');
    ['cph','shift','day'].forEach(id=>{ const el=$(id); if(el) el.textContent='0'; });
  }

  function initCapacityPlanner(){
    // Only run on capacity-planner page
    if(!document.getElementById('cph')) return;
    const calcBtn = document.getElementById('calc');
    const resetBtn = document.getElementById('reset');
    if(calcBtn) calcBtn.addEventListener('click', calc);
    if(resetBtn) resetBtn.addEventListener('click', reset);
  }

  document.addEventListener('DOMContentLoaded', initCapacityPlanner);
})();
