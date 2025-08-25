;(function(){
  // =============================
  // Data Flow Network Animation
  // =============================
  function initDataFlowNetwork(){
    const cvs = document.querySelector('#spark');
    if(!cvs) return;
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

    function loop(){
      ctx.clearRect(0, 0, w, h);

      // connections
      ctx.strokeStyle = "rgba(34,211,238,0.2)";
      ctx.lineWidth = 1;
      for(let i=0;i<nodes.length;i++){
        for(let j=i+1;j<nodes.length;j++){
          const n1 = nodes[i], n2 = nodes[j];
          const dx = n1.x - n2.x, dy = n1.y - n2.y;
          if(Math.hypot(dx, dy) < 180){
            ctx.beginPath(); ctx.moveTo(n1.x, n1.y); ctx.lineTo(n2.x, n2.y); ctx.stroke();
          }
        }
      }

      // nodes
      ctx.fillStyle = "#22d3ee";
      nodes.forEach(n => {
        ctx.beginPath(); ctx.arc(n.x, n.y, 3, 0, Math.PI*2); ctx.fill();
        n.x += n.vx; n.y += n.vy;
        if(n.x < 0 || n.x > w) n.vx *= -1;
        if(n.y < 0 || n.y > h) n.vy *= -1;
      });

      // packets
      ctx.fillStyle = "#5ac8fa";
      packets.forEach(p => {
        const from = nodes[p.from];
        const to = nodes[p.to];
        const x = from.x + (to.x - from.x) * p.progress;
        const y = from.y + (to.y - from.y) * p.progress;
        ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI*2); ctx.fill();
        p.progress += 0.01;
        if(p.progress > 1){
          p.from = p.to;
          p.to = Math.floor(Math.random() * nodes.length);
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
