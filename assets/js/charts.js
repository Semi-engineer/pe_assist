;(function(){
  // =============================
  // Tiny charts (Sparkline) + KPI init
  // =============================
  function sparkline(canvas, data){
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.clientWidth || 120;
    const h = canvas.height = canvas.clientHeight || 32;
    if(w === 0 || h === 0) return;
    const min = Math.min(...data);
    const max = Math.max(...data);
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * h;
      if(i){ ctx.lineTo(x, y); } else { ctx.moveTo(x, y); }
    });
    ctx.lineWidth = 2;
    const brand = getComputedStyle(document.documentElement).getPropertyValue('--brand-2') || '#0ea5e9';
    ctx.strokeStyle = brand.trim() || '#0ea5e9';
    ctx.stroke();
  }

  function initKPICharts(){
    if(!document.getElementById('kpi-oee-chart')) return;
    const data = {
      oee:  [78,80,79,82,84,83,85,86,85,86],
      avl:  [88,90,89,91,92,91,92,93,92,92],
      perf: [82,83,84,85,85,86,87,88,88,88],
      qty:  [96,97,97,98,98,98,98,98,99,98]
    };
    setTimeout(()=>{
      ['oee','avl','perf','qty'].forEach(k=>{
        const c = document.getElementById(`kpi-${k}-chart`);
        if(c) sparkline(c, data[k]);
      });
    }, 200);
  }

  document.addEventListener('DOMContentLoaded', initKPICharts);
  // expose for reuse
  window.sparkline = window.sparkline || sparkline;
})();
