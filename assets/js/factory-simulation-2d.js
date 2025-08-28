// ======================
// Utility & Types
// ======================
const TAU = Math.PI*2;
const rnd = (a,b)=>Math.random()*(b-a)+a;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

const TYPE = { SOURCE:'source', BUFFER:'buffer', MACHINE:'machine', SINK:'sink' };
const COLORS = { node:'#2a3040', stroke:'#46506b', busy:'#f59e0b', idle:'#808aa7', part:'#6ee7ff', done:'#22c55e' };

// Grid
let showGrid = true; 
let gridSize = 40;
function snap(v){ return showGrid ? Math.round(v/gridSize)*gridSize : v; }

// Canvas
const canvas = document.getElementById('view');
const ctx = canvas.getContext('2d');
const mini = document.getElementById('mini');
const mtx = mini.getContext('2d');

// State
let simRunning = true; 
let simSpeed = 1; 
let frame=0; 
let selected=null; 
let tool='select';
let nodes=[]; // {id,type,x,y,size,params:{...},queue:[],busy:0,current:part|null}
let edges=[]; // {from,to}
let parts=[]; // {id,x,y,state,edge,t,route[],color}
let idCounter=1; 
let connectFrom=null; 
let throughput=0; 
let wip=0; 
let lastBottleneck='-';

// ======================
// Node factory
// ======================
function addNode(type,x,y){
  const n={ id:idCounter++, type, x:snap(x), y:snap(y), size:28, params:{}, queue:[], busy:0, current:null };
  if(type===TYPE.SOURCE){ n.params.spawn=180; n.params.timer=0; }
  if(type===TYPE.MACHINE){ n.params.proc=180; }
  if(type===TYPE.BUFFER){ n.params.capacity=Infinity; }
  nodes.push(n); updateStats(); select(n); return n;
}

function addEdge(a,b){ 
  if(a&&b&&a.id!==b.id){ 
    edges.push({from:a.id,to:b.id}); 
    updateStats(); 
  }
}

function resetAll(){ 
  nodes=[]; edges=[]; parts=[]; throughput=0; wip=0; lastBottleneck='-'; selected=null; 
  seedLayout(); 
}

// Default layout
function seedLayout(){
  const s = addNode(TYPE.SOURCE, 120, 320);
  const b1= addNode(TYPE.BUFFER, 320, 320);
  const m1= addNode(TYPE.MACHINE, 520, 320); m1.params.proc=200;
  const b2= addNode(TYPE.BUFFER, 720, 320);
  const m2= addNode(TYPE.MACHINE, 920, 320); m2.params.proc=120;
  const k = addNode(TYPE.SINK, 1080, 320);
  addEdge(s,b1); addEdge(b1,m1); addEdge(m1,b2); addEdge(b2,m2); addEdge(m2,k);
}

// ======================
// Parts logic
// ======================
function spawnPart(at){
  const p={ id:'P'+idCounter++, x:at.x, y:at.y, state:'moving', edge:null, t:0, color:COLORS.part };
  // choose first edge from source
  const outs=outEdges(at);
  if(outs.length){ p.edge = outs[0]; p.t=0; }
  parts.push(p);
}

function moveAlongEdge(part,edge,dt){
  const a = nodeById(edge.from); 
  const b = nodeById(edge.to);
  part.t += dt; 
  if(part.t>1) part.t=1;
  part.x = a.x + (b.x-a.x)*part.t;
  part.y = a.y + (b.y-a.y)*part.t;
  if(part.t>=1){ // arrived at node b
    onArrive(part,b);
  }
}

function onArrive(part,node){
  if(node.type===TYPE.BUFFER){
    part.state='waiting';
    node.queue.push(part);
  } else if(node.type===TYPE.MACHINE){
    part.state='waiting';
    node.queue.push(part);
  } else if(node.type===TYPE.SINK){
    part.state='done'; 
    part.color=COLORS.done; 
    throughput++;
  } else { // e.g. mid edge with SOURCE (should not happen)
    // pass-through to next
    const outs=outEdges(node); 
    if(outs.length){ 
      part.state='moving'; 
      part.edge=outs[0]; 
      part.t=0; 
    }
  }
}

// ======================
// Graph helpers
// ======================
function nodeById(id){ return nodes.find(n=>n.id===id); }
function outEdges(n){ return edges.filter(e=>e.from===n.id); }
function inEdges(n){ return edges.filter(e=>e.to===n.id); }

// ======================
// Simulation update
// ======================
function update(){
  frame++;
  
  // Sources spawn
  for(const n of nodes){
    if(n.type===TYPE.SOURCE){ 
      n.params.timer++; 
      if(n.params.timer>=n.params.spawn){ 
        n.params.timer=0; 
        spawnPart(n); 
      }
    }
  }

  // Machines pull from buffers and process
  for(const m of nodes){
    if(m.type!==TYPE.MACHINE) continue;
    
    if(m.busy>0){ 
      m.busy--; 
      if(m.busy<=0 && m.current){ // push to next
        const outs=outEdges(m); 
        if(outs.length){ 
          m.current.state='moving'; 
          m.current.edge=outs[0]; 
          m.current.t=0; 
        }
        m.current=null; 
      }
    }
    
    if(!m.current){ // try pull from any predecessor buffer or source queue
      // Prefer buffer
      const pres = inEdges(m).map(e=>nodeById(e.from));
      let candidate = pres.find(n=>n.type===TYPE.BUFFER && n.queue.length>0);
      if(!candidate) candidate = pres.find(n=>n.type===TYPE.SOURCE && parts.some(p=>p.state==='waitingAtSource'&&p.nodeId===n.id));
      if(!candidate){ // also allow direct queue on machine (arrivals queued)
        if(m.queue.length>0) candidate=m; 
      }
      if(candidate){
        const part = candidate===m ? m.queue.shift() : candidate.queue.shift();
        if(part){ 
          m.current=part; 
          part.state='processing'; 
          m.busy = Math.max(1, m.params.proc|0); 
        }
      }
    }
  }

  // Buffers try to forward directly if next is machine and idle (optional fast path)
  for(const b of nodes){
    if(b.type!==TYPE.BUFFER) continue;
    if(b.queue.length===0) continue;
    
    // check next machine idle and empty queue
    const outs = outEdges(b).map(e=>nodeById(e.to));
    const nextM = outs.find(n=>n.type===TYPE.MACHINE && !n.current);
    if(nextM){ // move first part into machine queue
      nextM.queue.push(b.queue.shift());
    }
  }

  // Move parts on edges
  const dt = 0.01 * simSpeed; // normalized step
  for(const p of parts){ 
    if(p.state==='moving' && p.edge){ 
      moveAlongEdge(p,p.edge,dt); 
    } 
  }

  // WIP
  wip = parts.filter(p=>p.state!=='done').length;

  // Bottleneck heuristic: machine with highest proc time + non-empty queue
  let bottle = null; 
  let score=-1;
  for(const m of nodes.filter(n=>n.type===TYPE.MACHINE)){
    const sc = (m.params.proc||0) + (m.queue.length*20) + (m.busy>0?10:0);
    if(sc>score){ score=sc; bottle=m; }
  }
  lastBottleneck = bottle? ('M#'+bottle.id+' ('+(bottle.params.proc|0)+'f)') : '-';
}

// ======================
// Rendering
// ======================
function drawGrid(){
  if(!showGrid) return;
  ctx.strokeStyle = '#1a2030'; 
  ctx.lineWidth=1;
  for(let x=0;x<canvas.width;x+=gridSize){ 
    ctx.beginPath(); 
    ctx.moveTo(x,0); 
    ctx.lineTo(x,canvas.height); 
    ctx.stroke(); 
  }
  for(let y=0;y<canvas.height;y+=gridSize){ 
    ctx.beginPath(); 
    ctx.moveTo(0,y); 
    ctx.lineTo(canvas.width,y); 
    ctx.stroke(); 
  }
}

function drawEdges(){
  ctx.strokeStyle = '#3b445e'; 
  ctx.lineWidth=2;
  for(const e of edges){ 
    const a=nodeById(e.from), b=nodeById(e.to); 
    if(!a||!b) continue; 
    drawArrow(a.x,a.y,b.x,b.y); 
  }
}

function drawArrow(x1,y1,x2,y2){
  ctx.beginPath(); 
  ctx.moveTo(x1,y1); 
  ctx.lineTo(x2,y2); 
  ctx.stroke();
  
  const ang = Math.atan2(y2-y1,x2-x1); 
  const len=10;
  ctx.beginPath();
  ctx.moveTo(x2,y2);
  ctx.lineTo(x2-len*Math.cos(ang-Math.PI/6), y2-len*Math.sin(ang-Math.PI/6));
  ctx.lineTo(x2-len*Math.cos(ang+Math.PI/6), y2-len*Math.sin(ang+Math.PI/6));
  ctx.closePath(); 
  ctx.fillStyle='#3b445e'; 
  ctx.fill();
}

function drawNodes(){
  for(const n of nodes){
    // node box
    ctx.fillStyle = COLORS.node; 
    ctx.strokeStyle=COLORS.stroke; 
    ctx.lineWidth=2;
    ctx.beginPath(); 
    ctx.roundRect(n.x-30,n.y-22,60,44,8); 
    ctx.fill(); 
    ctx.stroke();
    
    // status color bar
    if(n.type===TYPE.MACHINE){
      ctx.fillStyle = (n.busy>0? COLORS.busy : COLORS.idle);
      ctx.fillRect(n.x-30,n.y+22, (n.busy>0? (60*(1-n.busy/(n.params.proc||1))) : 60), 4);
    }
    
    // label
    ctx.fillStyle='#cbd5e1'; 
    ctx.font='12px ui-sans-serif';
    const label = n.type.toUpperCase()+ ' #'+n.id;
    ctx.fillText(label, n.x-28, n.y-28);
    
    // selected highlight
    if(selected && selected.id===n.id){ 
      ctx.strokeStyle=VAR_HL; 
      ctx.strokeRect(n.x-34,n.y-26,68,52); 
    }
  }
}
const VAR_HL = '#6ee7ff';

function drawParts(){
  for(const p of parts){
    ctx.fillStyle = p.color; 
    ctx.beginPath(); 
    ctx.arc(p.x,p.y,6,0,TAU); 
    ctx.fill();
  }
}

function drawHUD(){
  document.getElementById('kpiThroughput').textContent = throughput+ ' pcs';
  document.getElementById('kpiWip').textContent = wip;
  document.getElementById('kpiBottle').textContent = lastBottleneck;
  document.getElementById('statNodes').textContent = nodes.length;
  document.getElementById('statEdges').textContent = edges.length;
  document.getElementById('statParts').textContent = parts.length;
}

function render(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawGrid(); 
  drawEdges(); 
  drawNodes(); 
  drawParts(); 
  drawHUD(); 
  drawMini();
}

// Minimap
function drawMini(){
  mtx.clearRect(0,0,mini.width,mini.height);
  const sx = mini.width/canvas.width, sy = mini.height/canvas.height;
  mtx.fillStyle='#0d1322'; 
  mtx.fillRect(0,0,mini.width,mini.height);
  
  // edges
  mtx.strokeStyle='#445';
  for(const e of edges){ 
    const a=nodeById(e.from), b=nodeById(e.to); 
    if(!a||!b) continue; 
    mtx.beginPath(); 
    mtx.moveTo(a.x*sx,a.y*sy); 
    mtx.lineTo(b.x*sx,b.y*sy); 
    mtx.stroke(); 
  }
  
  // nodes
  for(const n of nodes){ 
    mtx.fillStyle='#8892b0'; 
    mtx.fillRect(n.x*sx-3,n.y*sy-3,6,6); 
  }
  
  // parts
  for(const p of parts){ 
    mtx.fillStyle='#6ee7ff'; 
    mtx.fillRect(p.x*sx-2,p.y*sy-2,4,4); 
  }
}

// ======================
// Input & Tools
// ======================
let drag={active:false, dx:0, dy:0, node:null};

canvas.addEventListener('mousedown',e=>{
  const pos = getMouse(e);
  const hit = hitNode(pos.x,pos.y);
  
  if(tool==='select'){
    if(hit){ 
      drag.active=true; 
      drag.node=hit; 
      drag.dx=pos.x-hit.x; 
      drag.dy=pos.y-hit.y; 
      select(hit); 
    }
    else select(null);
  } else if(tool==='delete'){
    if(hit){ deleteNode(hit); }
  } else if(tool==='connect'){
    if(hit){ 
      if(!connectFrom){ 
        connectFrom=hit; 
      } else { 
        if(connectFrom.id!==hit.id){ 
          addEdge(connectFrom,hit); 
        } 
        connectFrom=null; 
      }
    }
  }
});

canvas.addEventListener('mousemove',e=>{
  const pos=getMouse(e);
  if(drag.active && drag.node){ 
    drag.node.x = snap(pos.x-drag.dx); 
    drag.node.y=snap(pos.y-drag.dy); 
  }
});

window.addEventListener('mouseup',()=>{ 
  drag.active=false; 
  drag.node=null; 
});

function getMouse(e){ 
  const r=canvas.getBoundingClientRect(); 
  return {x:e.clientX-r.left, y:e.clientY-r.top}; 
}

function hitNode(x,y){ 
  return nodes.find(n=>Math.abs(n.x-x)<36 && Math.abs(n.y-y)<28); 
}

function deleteNode(n){
  // remove edges attached
  edges = edges.filter(e=>e.from!==n.id && e.to!==n.id);
  
  // remove parts lingering in its queues
  if(n.queue){ n.queue.length=0; }
  
  nodes = nodes.filter(x=>x.id!==n.id); 
  updateStats(); 
  
  if(selected&&selected.id===n.id) select(null);
}

// Toolbar actions
function setTool(newTool){ 
  tool=newTool; 
  document.getElementById('modePill').textContent = newTool.replace(/^./,c=>c.toUpperCase());
  
  for(const b of document.querySelectorAll('[data-tool]')) {
    b.classList.toggle('active', b.dataset.tool===newTool);
  }
}

// Event listeners
for(const b of document.querySelectorAll('[data-tool]')){
  b.addEventListener('click',()=>setTool(b.dataset.tool));
}

for(const b of document.querySelectorAll('[data-add]')){
  b.addEventListener('click',()=>{ 
    setTool('select'); 
    const x= snap(rnd(140, canvas.width-140)); 
    const y=snap(rnd(120, canvas.height-120)); 
    addNode(b.dataset.add,x,y); 
  });
}

document.getElementById('gridToggle').addEventListener('change', e=>{ 
  showGrid = e.target.checked; 
});

document.getElementById('resetLayout').addEventListener('click', resetAll);

// Pause & Speed
const pauseBtn = document.getElementById('pauseBtn');
pauseBtn.addEventListener('click',()=>{ 
  simRunning=!simRunning; 
  pauseBtn.textContent = simRunning? '⏸️ Pause':'▶️ Resume'; 
});

const speed = document.getElementById('speed'); 
const speedLabel=document.getElementById('speedLabel');
speed.addEventListener('input',()=>{ 
  simSpeed = parseInt(speed.value,10); 
  speedLabel.textContent = simSpeed+'x'; 
});

// ======================
// Inspector
// ======================
const inspector = document.getElementById('inspector');

function select(obj){ 
  selected=obj; 
  renderInspector(); 
}

function renderInspector(){
  inspector.innerHTML='';
  
  if(!selected){ 
    inspector.innerHTML = '<div class="hint">ไม่มีรายการที่เลือก</div>'; 
    return; 
  }
  
  const n = selected;
  const wrap = document.createElement('div');
  wrap.innerHTML = `<div class="field"><label>Type</label><div class="pill">${n.type.toUpperCase()} #${n.id}</div></div>`;
  
  // Position
  const pos = document.createElement('div'); 
  pos.className='field'; 
  pos.innerHTML = `<label>ตำแหน่ง (x,y)</label><div class="row"><input type="number" id="ix" value="${n.x}"/><input type="number" id="iy" value="${n.y}"/></div>`; 
  wrap.appendChild(pos);

  if(n.type===TYPE.SOURCE){
    const f = document.createElement('div'); 
    f.className='field'; 
    f.innerHTML = `<label>Spawn Interval (frames)</label><input type="number" id="isrc" value="${n.params.spawn||180}">`;
    wrap.appendChild(f);
  }
  
  if(n.type===TYPE.MACHINE){
    const f = document.createElement('div'); 
    f.className='field'; 
    f.innerHTML = `<label>Process Time (frames)</label><input type="number" id="iproc" value="${n.params.proc||180}">`;
    
    const q = document.createElement('div'); 
    q.className='field'; 
    q.innerHTML = `<label>Queue Length</label><div class="pill">${n.queue.length}</div>`;
    
    wrap.appendChild(f); 
    wrap.appendChild(q);
  }
  
  if(n.type===TYPE.BUFFER){
    const q = document.createElement('div'); 
    q.className='field'; 
    q.innerHTML = `<label>Queue Length</label><div class="pill">${n.queue.length}</div>`; 
    wrap.appendChild(q);
  }
  
  if(n.type===TYPE.SINK){
    const s = document.createElement('div'); 
    s.className='field'; 
    s.innerHTML = `<label>Completed</label><div class="pill">${throughput} pcs</div>`; 
    wrap.appendChild(s);
  }

  const apply = document.createElement('div'); 
  apply.className='field'; 
  apply.innerHTML = `<button class="btn" id="applyBtn">Apply</button>`; 
  wrap.appendChild(apply);
  inspector.appendChild(wrap);

  document.getElementById('applyBtn').onclick = ()=>{
    n.x = snap(parseFloat(document.getElementById('ix').value)||n.x);
    n.y = snap(parseFloat(document.getElementById('iy').value)||n.y);
    
    if(n.type===TYPE.SOURCE){ 
      n.params.spawn = Math.max(1, parseInt(document.getElementById('isrc').value||n.params.spawn)); 
    }
    
    if(n.type===TYPE.MACHINE){ 
      n.params.proc = Math.max(1, parseInt(document.getElementById('iproc').value||n.params.proc)); 
    }
  };
}

function updateStats(){ 
  document.getElementById('statNodes').textContent = nodes.length; 
  document.getElementById('statEdges').textContent = edges.length; 
}

// ======================
// Main loop
// ======================
function tick(){
  if(simRunning){ 
    for(let i=0;i<simSpeed;i++) update(); 
  }
  render(); 
  requestAnimationFrame(tick);
}

// Polyfill roundRect for older browsers
if(!CanvasRenderingContext2D.prototype.roundRect){
  CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){ 
    if(typeof r==='number') r={tl:r,tr:r,br:r,bl:r}; 
    else r={tl:8,tr:8,br:8,bl:8}; 
    this.beginPath(); 
    this.moveTo(x+r.tl,y); 
    this.lineTo(x+w-r.tr,y); 
    this.quadraticCurveTo(x+w,y,x+w,y+r.tr); 
    this.lineTo(x+w,y+h-r.br); 
    this.quadraticCurveTo(x+w,y+h,x+w-r.br,y+h); 
    this.lineTo(x+r.bl,y+h); 
    this.quadraticCurveTo(x,y+h,x,y+h-r.bl); 
    this.lineTo(x,y+r.tl); 
    this.quadraticCurveTo(x,y,x+r.tl,y); 
    return this; 
  };
}

// Initialize simulation
seedLayout(); 
tick();