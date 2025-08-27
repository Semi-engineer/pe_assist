;(function(){
  // =============================
  // Factory Simulation Animation
  // =============================
  function initDataFlowNetwork(){
    const cvs = document.querySelector('#spark');
    if(!cvs) return;
    const ctx = cvs.getContext('2d');
    let w, h;
    const resize = () => { w = cvs.width = cvs.clientWidth; h = cvs.height = cvs.clientHeight; };
    window.addEventListener('resize', resize);
    resize();

    // Machines (เปลี่ยนจาก nodes)
    const machines = Array.from({ length: 12 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.2, // ลดความเร็ว
      vy: (Math.random() - 0.5) * 0.2
    }));

    // Products (เปลี่ยนจาก packets)
    const products = Array.from({ length: 18 }, () => ({
      from: Math.floor(Math.random() * machines.length),
      to: Math.floor(Math.random() * machines.length),
      progress: Math.random()
    }));

    function loop(){
      ctx.clearRect(0, 0, w, h);

      // Conveyor Belts (สายพานลำเลียง)
      ctx.strokeStyle = "rgba(100,100,100,0.5)"; // เปลี่ยนสีให้ดูเป็นอุตสาหกรรมมากขึ้น
      ctx.lineWidth = 1;
      for(let i=0;i<machines.length;i++){
        for(let j=i+1;j<machines.length;j++){
          const m1 = machines[i], m2 = machines[j];
          const dx = m1.x - m2.x, dy = m1.y - m2.y;
          if(Math.hypot(dx, dy) < 180){
            ctx.beginPath(); ctx.moveTo(m1.x, m1.y); ctx.lineTo(m2.x, m2.y); ctx.stroke();
          }
        }
      }

      // Machines (จุดเครื่องจักร)
      ctx.fillStyle = "#555"; // เปลี่ยนสีจุดเครื่องจักร
      machines.forEach(m => {
        ctx.beginPath(); ctx.arc(m.x, m.y, 4, 0, Math.PI*2); ctx.fill(); // ปรับขนาดให้ใหญ่ขึ้นเล็กน้อย
        m.x += m.vx; m.y += m.vy;
        if(m.x < 0 || m.x > w) m.vx *= -1;
        if(m.y < 0 || m.y > h) m.vy *= -1;
      });

      // Products (จุดสินค้า)
      ctx.fillStyle = "#ff6a00"; // เปลี่ยนสีจุดสินค้า
      products.forEach(p => {
        const from = machines[p.from];
        const to = machines[p.to];
        const x = from.x + (to.x - from.x) * p.progress;
        const y = from.y + (to.y - from.y) * p.progress;
        ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI*2); ctx.fill(); // ปรับขนาดให้ใหญ่ขึ้นเล็กน้อย
        p.progress += 0.01;
        if(p.progress > 1){
          p.from = p.to;
          p.to = Math.floor(Math.random() * machines.length);
          p.progress = 0;
        }
      });

      requestAnimationFrame(loop);
    }
    loop();
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initDataFlowNetwork, 100);
  });
})();