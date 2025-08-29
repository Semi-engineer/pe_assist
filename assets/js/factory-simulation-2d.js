// ======================
// Utility & Types
// ======================
const TAU = Math.PI*2;
const rnd = (a,b)=>Math.random()*(b-a)+a;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

const TYPE = { SOURCE:'source', BUFFER:'buffer', MACHINE:'machine', SINK:'sink' };
const COLORS = { node:'#2a3040', stroke:'#46506b', busy:'#f59e0b', idle:'#808aa7', part:'#6ee7ff', done:'#22c55e' };

// Production Parameters - เก็บค่าปัจจัยการผลิต
let productionParams = {
  // Global
  simHours: 8,
  targetProd: 100,
  qualityTarget: 95,
  
  // Material & Cost
  materialCost: 15.50,
  setupCost: 500,
  inventoryCost: 0.5,
  defectCost: 25,
  
  // Labor
  laborRate: 120,
  operatorsPerMachine: 1,
  overheadRate: 80,
  
  // Machine
  machineCost: 200,
  maintenanceRate: 2,
  energyCost: 45,
  utilizationTarget: 85,
  
  // Quality
  defectRate: 2.5,
  reworkRate: 1.2,
  downtimeRate: 5,
  
  // Buffer & Flow
  bufferCapacity: 20,
  transportSpeed: 30,
  batchSize: 10
};

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
let nodes=[]; 
let edges=[]; 
let parts=[]; 
let idCounter=1; 
let connectFrom=null; 
let throughput=0; 
let wip=0; 
let lastBottleneck='-';

// Cost tracking
let totalCosts = {
  material: 0,
  labor: 0,
  machine: 0,
  overhead: 0,
  total: 0
};

// Quality metrics
let qualityMetrics = {
  produced: 0,
  defects: 0,
  efficiency: 0
};

// ======================
// Pan & Zoom
// ======================
const transform = {x:0, y:0, scale:1, minScale:0.25, maxScale:2};
let isDragging = false;
let lastMousePos = {x:0, y:0};
let initialPinchDistance = 0;
let lastPinchScale = 1;

function zoom(delta, clientX, clientY){
  const newScale = clamp(transform.scale + delta * 0.100, transform.minScale, transform.maxScale);
  const factor = newScale / transform.scale;
  transform.scale = newScale;
  
  const mouseX = clientX - canvas.offsetLeft;
  const mouseY = clientY - canvas.offsetTop;
  
  transform.x = mouseX - (mouseX - transform.x) * factor;
  transform.y = mouseY - (mouseY - transform.y) * factor;
}

function pan(dx, dy){
  transform.x += dx;
  transform.y += dy;
}

function resetView(){
  transform.x = 0;
  transform.y = 0;
  transform.scale = 1;
}

function getTransformedPoint(clientX, clientY){
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left - transform.x) / transform.scale;
  const y = (clientY - rect.top - transform.y) / transform.scale;
  return {x,y};
}

// ======================
// Node factory with enhanced parameters
// ======================
function addNode(type,x,y){
  const n={ 
    id:idCounter++, 
    type, 
    x:snap(x), 
    y:snap(y), 
    size:28, 
    params:{}, 
    queue:[], 
    busy:0, 
    current:null,
    // เพิ่มข้อมูลการผลิต
    productionData: {
      totalProcessed: 0,
      totalCost: 0,
      utilization: 0,
      lastMaintenance: 0
    }
  };
  
  if(type===TYPE.SOURCE){ 
    n.params.spawn = Math.max(1, 3600 / (productionParams.targetProd / productionParams.simHours)); 
    n.params.timer=0; 
  }
  if(type===TYPE.MACHINE){ 
    n.params.proc = 180;
    n.params.costPerHour = productionParams.machineCost;
    n.params.operators = productionParams.operatorsPerMachine;
  }
  if(type===TYPE.BUFFER){ 
    n.params.capacity = productionParams.bufferCapacity; 
  }
  
  nodes.push(n); 
  updateStats(); 
  select(n); 
  return n;
}

function addEdge(a,b){ 
  if(a&&b&&a.id!==b.id){ 
    edges.push({from:a.id,to:b.id}); 
    updateStats(); 
  }
}

function resetAll(){ 
  nodes=[]; edges=[]; parts=[]; throughput=0; wip=0; lastBottleneck='-'; selected=null; 
  totalCosts = { material: 0, labor: 0, machine: 0, overhead: 0, total: 0 };
  qualityMetrics = { produced: 0, defects: 0, efficiency: 0 };
  seedLayout(); 
}

// Default layout
function seedLayout(){
  const s = addNode(TYPE.SOURCE, 120, 300);
  const b1= addNode(TYPE.BUFFER, 300, 300);
  const m1= addNode(TYPE.MACHINE, 500, 300);
  const b2= addNode(TYPE.BUFFER, 700, 300);
  const m2= addNode(TYPE.MACHINE, 900, 300);
  const k = addNode(TYPE.SINK, 1080, 300);
  addEdge(s,b1); addEdge(b1,m1); addEdge(m1,b2); addEdge(b2,m2); addEdge(m2,k);
}

// ======================
// Enhanced Parts logic with quality
// ======================
function spawnPart(at){
  const p={ 
    id:'P'+idCounter++, 
    x:at.x, 
    y:at.y, 
    state:'moving', 
    edge:null, 
    t:0, 
    color:COLORS.part,
    quality: Math.random() > (productionParams.defectRate/100) ? 'good' : 'defect',
    cost: productionParams.materialCost
  };
  
  const outs=outEdges(at);
  if(outs.length){ p.edge = outs[0]; p.t=0; }
  parts.push(p);
}

function moveAlongEdge(part,edge,dt){
  const a = nodeById(edge.from); 
  const b = nodeById(edge.to);
  if (!a || !b) {
    // Remove part if its edge is invalid (node deleted)
    parts = parts.filter(p => p !== part);
    return;
  }
  part.t += dt * (productionParams.transportSpeed / 100); 
  if(part.t>1) part.t=1;
  part.x = a.x + (b.x-a.x)*part.t;
  part.y = a.y + (b.y-a.y)*part.t;
  if(part.t>=1){ 
    onArrive(part,b);
  }
}

function onArrive(part,node){
  if(node.type===TYPE.BUFFER){
    if(node.queue.length < node.params.capacity){
      part.state='waiting';
      node.queue.push(part);
    } else {
      // Buffer overflow - part is lost
      parts = parts.filter(p => p.id !== part.id);
    }
  } else if(node.type===TYPE.MACHINE){
    part.state='waiting';
    node.queue.push(part);
  } else if(node.type===TYPE.SINK){
    part.state='done'; 
    part.color = part.quality === 'good' ? COLORS.done : '#ef4444';
    throughput++;
    qualityMetrics.produced++;
    if(part.quality === 'defect') {
      qualityMetrics.defects++;
      totalCosts.material += productionParams.defectCost;
    }
  } else {
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
// Enhanced Simulation update with cost calculation
// ======================
function update(){
  frame++;
  
  // Calculate costs per frame
  const frameHours = 1 / (3600 * 60); // assuming 60 FPS
  
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

  // Machines process with enhanced logic
  for(const m of nodes){
    if(m.type!==TYPE.MACHINE) continue;
    
    // Calculate machine costs
    if(m.busy > 0 || m.current) {
      totalCosts.machine += (productionParams.machineCost * frameHours);
      totalCosts.labor += (productionParams.laborRate * productionParams.operatorsPerMachine * frameHours);
      totalCosts.overhead += (productionParams.overheadRate * frameHours);
      m.productionData.utilization += frameHours;
    }
    
    // Machine downtime simulation
    if(Math.random() < (productionParams.downtimeRate / 100 / 3600)) {
      m.busy = Math.max(m.busy, 60); // Add downtime
    }
    
    if(m.busy>0){ 
      m.busy--; 
      if(m.busy<=0 && m.current){ 
        // Process quality check
        if(m.current.quality === 'good' && Math.random() < (productionParams.reworkRate/100)) {
          m.current.quality = 'rework';
          m.busy = Math.floor(m.params.proc * 0.5); // Rework takes 50% time
          return;
        }
        
        const outs=outEdges(m); 
        if(outs.length){ 
          m.current.state='moving'; 
          m.current.edge=outs[0]; 
          m.current.t=0; 
          m.current.cost += (productionParams.machineCost * (m.params.proc / 3600));
        }
        m.productionData.totalProcessed++;
        m.current=null; 
      }
    }
    
    if(!m.current){ 
      let pres = inEdges(m).map(e=>nodeById(e.from)).filter(Boolean); // filter out undefined
      let candidate = pres.find(n=>n.type===TYPE.BUFFER && n.queue.length>0);
      if(!candidate) candidate = pres.find(n=>n.type===TYPE.SOURCE && parts.some(p=>p.state==='waitingAtSource'&&p.nodeId===n.id));
      if(!candidate){ 
        if(m.queue.length>0) candidate=m; 
      }
      if(candidate){
        const part = candidate===m ? m.queue.shift() : candidate.queue.shift();
        if(part){ 
          m.current=part; 
          part.state='processing'; 
          m.busy = Math.max(1, m.params.proc|0); 
          totalCosts.material += productionParams.materialCost;
        }
      }
    }
  }

  // Buffers with enhanced logic
  for(const b of nodes){
    if(b.type!==TYPE.BUFFER) continue;
    if(b.queue.length===0) continue;
    
    // Inventory holding cost
    totalCosts.overhead += (b.queue.length * productionParams.materialCost * productionParams.inventoryCost/100 * frameHours);
    
    const outs = outEdges(b).map(e=>nodeById(e.to));
    const nextM = outs.find(n=>n.type===TYPE.MACHINE && !n.current);
    if(nextM){ 
      nextM.queue.push(b.queue.shift());
    }
  }

  // Move parts on edges
  const dt = 0.01 * simSpeed;
  for(const p of parts){ 
    if(p.state==='moving' && p.edge){ 
      moveAlongEdge(p,p.edge,dt); 
    } 
  }

  // Update metrics
  wip = parts.filter(p=>p.state!=='done').length;
  totalCosts.total = totalCosts.material + totalCosts.labor + totalCosts.machine + totalCosts.overhead;
  
  // Calculate efficiency
  if(qualityMetrics.produced > 0) {
    qualityMetrics.efficiency = ((qualityMetrics.produced - qualityMetrics.defects) / qualityMetrics.produced) * 100;
  }

  // Enhanced bottleneck detection
  let bottle = null; 
  let score = -1;
  for(const m of nodes.filter(n=>n.type===TYPE.MACHINE)){
    const utilization = frame > 0 ? (m.productionData.utilization / (frame / 3600)) * 100 : 0;
    const queueScore = m.queue.length * 20;
    const processingScore = m.busy > 0 ? 10 : 0;
    const sc = utilization + queueScore + processingScore;
    if(sc > score){ 
      score = sc; 
      bottle = m; 
    }
  }
  lastBottleneck = bottle ? (`M#${bottle.id} (${Math.round(bottle.productionData.utilization / (frame / 3600) * 100)}%)`) : '-';
}

// ======================
// Enhanced Rendering
// ======================
function drawGrid(){
  if(!showGrid) return;
  ctx.strokeStyle = '#1a2030'; 
  ctx.lineWidth=1/transform.scale;
  for(let x=0;x<2000;x+=gridSize){ 
    ctx.beginPath(); 
    ctx.moveTo(x,0); 
    ctx.lineTo(x,1200); 
    ctx.stroke(); 
  }
  for(let y=0;y<1200;y+=gridSize){ 
    ctx.beginPath(); 
    ctx.moveTo(0,y); 
    ctx.lineTo(2000,y); 
    ctx.stroke(); 
  }
}

function drawEdges(){
  ctx.strokeStyle = '#3b445e'; 
  ctx.lineWidth=2/transform.scale;
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
  const len=10/transform.scale;
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
    // Enhanced node visualization
    ctx.fillStyle = COLORS.node; 
    ctx.strokeStyle = COLORS.stroke; 
    ctx.lineWidth = 2/transform.scale;
    
    const sizeX = 30/transform.scale;
    const sizeY = 22/transform.scale;
    
    // Different shapes for different types
    if(n.type === TYPE.SOURCE) {
      ctx.beginPath();
      ctx.roundRect(n.x-sizeX,n.y-sizeY,sizeX*2,sizeY*2,8/transform.scale);
      ctx.fill();
      ctx.strokeStyle = '#22c55e';
      ctx.stroke();
    } else if(n.type === TYPE.SINK) {
      ctx.beginPath();
      ctx.roundRect(n.x-sizeX,n.y-sizeY,sizeX*2,sizeY*2,8/transform.scale);
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.stroke();
    } else {
      ctx.beginPath(); 
      ctx.roundRect(n.x-sizeX,n.y-sizeY,sizeX*2,sizeY*2,8/transform.scale); 
      ctx.fill(); 
      ctx.stroke();
    }
    
    // Enhanced status indicators
    if(n.type===TYPE.MACHINE){
      const utilization = frame > 0 ? (n.productionData.utilization / (frame / 3600)) * 100 : 0;
      ctx.fillStyle = (n.busy>0 ? COLORS.busy : COLORS.idle);
      ctx.fillRect(n.x-sizeX,n.y+sizeY, sizeX*2 * Math.min(1, utilization/100), 4/transform.scale);
      
      // Show utilization percentage
      ctx.fillStyle = '#cbd5e1';
      ctx.font = `${10/transform.scale}px ui-sans-serif`;
      ctx.fillText(`${Math.round(utilization)}%`, n.x-(12/transform.scale), n.y+(28/transform.scale));
    }
    
    if(n.type===TYPE.BUFFER){
      const fillPercent = n.queue.length / n.params.capacity;
      ctx.fillStyle = fillPercent > 0.8 ? '#ef4444' : (fillPercent > 0.5 ? '#f59e0b' : '#22c55e');
      ctx.fillRect(n.x-sizeX,n.y+sizeY, sizeX*2 * fillPercent, 4/transform.scale);
    }
    
    // Enhanced labels
    ctx.fillStyle='#cbd5e1'; 
    ctx.font=`${12/transform.scale}px ui-sans-serif`;
    const label = n.type.toUpperCase()+ ` #${n.id}`;
    ctx.fillText(label, n.x-sizeX, n.y-sizeY-(6/transform.scale));
    
    // Show queue length
    if(n.queue && n.queue.length > 0) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = `${10/transform.scale}px ui-sans-serif`;
      ctx.fillText(`Q:${n.queue.length}`, n.x-sizeX, n.y+sizeY-(10/transform.scale));
    }
    
    // Selected highlight
    if(selected && selected.id===n.id){ 
      ctx.strokeStyle='#6ee7ff'; 
      ctx.lineWidth = 3/transform.scale;
      ctx.strokeRect(n.x-sizeX-(4/transform.scale),n.y-sizeY-(4/transform.scale),sizeX*2+(8/transform.scale),sizeY*2+(8/transform.scale)); 
    }
  }
}

function drawParts(){
  for(const p of parts){
    // Different colors based on quality
    if(p.quality === 'defect') {
      ctx.fillStyle = '#ef4444';
    } else if(p.quality === 'rework') {
      ctx.fillStyle = '#f59e0b';
    } else {
      ctx.fillStyle = p.color;
    }
    
    ctx.beginPath(); 
    ctx.arc(p.x,p.y,6/transform.scale,0,TAU); 
    ctx.fill();
    
    // Quality indicator
    if(p.quality !== 'good') {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1/transform.scale;
      ctx.stroke();
    }
  }
}

function drawHUD(){
  document.getElementById('kpiThroughput').textContent = throughput + ' pcs';
  document.getElementById('kpiWip').textContent = wip;
  document.getElementById('kpiEfficiency').textContent = Math.round(qualityMetrics.efficiency) + '%';
  document.getElementById('kpiCost').textContent = Math.round(totalCosts.total).toLocaleString() + ' ฿';
  document.getElementById('kpiUnitCost').textContent = throughput > 0 ? Math.round(totalCosts.total / throughput).toLocaleString() + ' ฿' : '0 ฿';
  document.getElementById('kpiBottle').textContent = lastBottleneck;
  
  document.getElementById('statNodes').textContent = nodes.length;
  document.getElementById('statEdges').textContent = edges.length;
  document.getElementById('statParts').textContent = parts.length;
  
  // Update cost breakdown
  document.getElementById('costMaterial').textContent = Math.round(totalCosts.material).toLocaleString() + ' ฿';
  document.getElementById('costLabor').textContent = Math.round(totalCosts.labor).toLocaleString() + ' ฿';
  document.getElementById('costMachine').textContent = Math.round(totalCosts.machine).toLocaleString() + ' ฿';
  document.getElementById('costOverhead').textContent = Math.round(totalCosts.overhead).toLocaleString() + ' ฿';
  document.getElementById('costTotal').textContent = Math.round(totalCosts.total).toLocaleString() + ' ฿';
}

function render(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  
  // Apply transformations
  ctx.save();
  ctx.translate(transform.x, transform.y);
  ctx.scale(transform.scale, transform.scale);
  
  drawGrid(); 
  drawEdges(); 
  drawNodes(); 
  drawParts(); 
  
  ctx.restore();
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
    mtx.fillStyle = p.quality === 'good' ? '#6ee7ff' : '#ef4444';
    mtx.fillRect(p.x*sx-2,p.y*sy-2,4,4); 
  }
}

// ======================
// Input & Tools (with Pan & Zoom integration)
// ======================
let drag={active:false, dx:0, dy:0, node:null};

canvas.addEventListener('mousedown',e=>{
  const pos = getTransformedPoint(e.clientX, e.clientY);
  const hit = hitNode(pos.x, pos.y);
  
  if(tool==='select'){
    if(hit){ 
      drag.active=true; 
      drag.node=hit; 
      drag.dx=pos.x-hit.x; 
      drag.dy=pos.y-hit.y; 
      select(hit); 
    }
    else {
      isDragging = true;
      lastMousePos = {x:e.clientX, y:e.clientY};
      select(null);
    }
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
  const pos=getTransformedPoint(e.clientX, e.clientY);
  if(drag.active && drag.node){ 
    drag.node.x = snap(pos.x-drag.dx); 
    drag.node.y=snap(pos.y-drag.dy); 
  }
  if(isDragging && tool === 'select' && !drag.active) {
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;
    pan(dx, dy);
    lastMousePos = {x:e.clientX, y:e.clientY};
  }
});

window.addEventListener('mouseup',()=>{ 
  drag.active=false; 
  drag.node=null;
  isDragging = false; 
});

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const delta = Math.sign(e.deltaY) * -1;
  zoom(delta, e.clientX, e.clientY);
});

// Touch events for mobile
canvas.addEventListener('touchstart', e => {
  if (e.touches.length === 1) {
    const pos = getTransformedPoint(e.touches[0].clientX, e.touches[0].clientY);
    const hit = hitNode(pos.x, pos.y);
    if(hit) {
      drag.active = true;
      drag.node = hit;
      drag.dx = pos.x - hit.x;
      drag.dy = pos.y - hit.y;
      select(hit);
    } else {
      isDragging = true;
      lastMousePos = {x: e.touches[0].clientX, y: e.touches[0].clientY};
    }
  } else if (e.touches.length === 2) {
    isDragging = false;
    const dx = e.touches[1].clientX - e.touches[0].clientX;
    const dy = e.touches[1].clientY - e.touches[0].clientY;
    initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
    lastPinchScale = transform.scale;
  }
});

canvas.addEventListener('touchmove', e => {
  if (drag.active && drag.node) {
    e.preventDefault();
    const pos = getTransformedPoint(e.touches[0].clientX, e.touches[0].clientY);
    drag.node.x = snap(pos.x - drag.dx);
    drag.node.y = snap(pos.y - drag.dy);
  } else if (isDragging && e.touches.length === 1) {
    e.preventDefault();
    const dx = e.touches[0].clientX - lastMousePos.x;
    const dy = e.touches[0].clientY - lastMousePos.y;
    pan(dx, dy);
    lastMousePos = {x: e.touches[0].clientX, y: e.touches[0].clientY};
  } else if (e.touches.length === 2) {
    e.preventDefault();
    const dx = e.touches[1].clientX - e.touches[0].clientX;
    const dy = e.touches[1].clientY - e.touches[0].clientY;
    const currentDistance = Math.sqrt(dx * dx + dy * dy);
    const factor = currentDistance / initialPinchDistance;
    const newScale = lastPinchScale * factor;
    
    const centerClientX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const centerClientY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    
    const scaleFactor = newScale / transform.scale;
    transform.scale = clamp(newScale, transform.minScale, transform.maxScale);
    
    transform.x = centerClientX - (centerClientX - transform.x) * scaleFactor;
    transform.y = centerClientY - (centerClientY - transform.y) * scaleFactor;
  }
});

canvas.addEventListener('touchend', e => {
  drag.active = false;
  drag.node = null;
  isDragging = false;
  initialPinchDistance = 0;
});


function getMouse(e){ 
  const r=canvas.getBoundingClientRect(); 
  return {x:e.clientX-r.left, y:e.clientY-r.top}; 
}

function hitNode(x,y){ 
  const hit = nodes.find(n=>Math.abs(n.x-x)<(36/transform.scale) && Math.abs(n.y-y)<(28/transform.scale));
  return hit;
}

function deleteNode(n){
  edges = edges.filter(e=>e.from!==n.id && e.to!==n.id);
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
document.getElementById('resetViewBtn').addEventListener('click', resetView);

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
  speedLabel.textContent = speed.value+'x'; 
});

// ======================
// Parameter Management
// ======================
function loadParametersFromUI() {
  const paramInputs = document.querySelectorAll('.param-input');
  paramInputs.forEach(input => {
    const paramName = input.id;
    if(paramName && productionParams.hasOwnProperty(paramName)) {
      productionParams[paramName] = parseFloat(input.value) || productionParams[paramName];
    }
  });
}

function applyParameters() {
  loadParametersFromUI();
  
  // Update existing nodes with new parameters
  for(const node of nodes) {
    if(node.type === TYPE.BUFFER) {
      node.params.capacity = productionParams.bufferCapacity;
    }
    if(node.type === TYPE.MACHINE) {
      node.params.costPerHour = productionParams.machineCost;
      node.params.operators = productionParams.operatorsPerMachine;
    }
    if(node.type === TYPE.SOURCE) {
      node.params.spawn = Math.max(1, 3600 / (productionParams.targetProd / productionParams.simHours));
    }
  }
  
  console.log('Parameters applied:', productionParams);
}

// Apply Parameters button
document.getElementById('applyParams').addEventListener('click', applyParameters);

// Auto-load parameters on input change
document.querySelectorAll('.param-input').forEach(input => {
  input.addEventListener('change', () => {
    loadParametersFromUI();
  });
});

// ======================
// Enhanced Inspector
// ======================
const inspector = document.getElementById('inspector');

function select(obj){ 
  selected=obj; 
  renderInspector(); 
}

function renderInspector(){
  inspector.innerHTML='';
  
  if(!selected){ 
    inspector.innerHTML = '<div class="hint">เลือก Node หรือ Part เพื่อดู/แก้ไขค่าได้</div>'; 
    return; 
  }
  
  const n = selected;
  const wrap = document.createElement('div');
  wrap.innerHTML = `<div class="field"><label>Type</label><div class="pill">${n.type.toUpperCase()} #${n.id}</div></div>`;
  
  // Position
  const pos = document.createElement('div'); 
  pos.className='field'; 
  pos.innerHTML = `<label>ตำแหน่ง (x,y)</label><div class="row"><input type="number" id="ix" value="${Math.round(n.x)}"/><input type="number" id="iy" value="${Math.round(n.y)}"/></div>`; 
  wrap.appendChild(pos);

  // Type-specific parameters
  if(n.type===TYPE.SOURCE){
    const f = document.createElement('div'); 
    f.className='field'; 
    f.innerHTML = `<label>Spawn Interval (frames)</label><input type="number" id="isrc" value="${n.params.spawn||180}">
                  <label>Total Spawned</label><div class="pill">${parts.filter(p=>p.id.startsWith('P')).length} parts</div>`;
    wrap.appendChild(f);
  }
  
  if(n.type===TYPE.MACHINE){
    const utilization = frame > 0 ? (n.productionData.utilization / (frame / 3600)) * 100 : 0;
    const f = document.createElement('div'); 
    f.className='field'; 
    f.innerHTML = `<label>Process Time (frames)</label><input type="number" id="iproc" value="${n.params.proc||180}">
                  <label>Utilization</label><div class="pill">${Math.round(utilization)}%</div>
                  <label>Total Processed</label><div class="pill">${n.productionData.totalProcessed} parts</div>
                  <label>Queue Length</label><div class="pill">${n.queue.length}</div>
                  <label>Cost per Hour</label><div class="pill">${n.params.costPerHour} ฿</div>`;
    wrap.appendChild(f);
  }
  
  if(n.type===TYPE.BUFFER){
    const fillPercent = Math.round((n.queue.length / n.params.capacity) * 100);
    const f = document.createElement('div'); 
    f.className='field'; 
    f.innerHTML = `<label>Capacity</label><input type="number" id="icap" value="${n.params.capacity||20}" min="1">
                  <label>Current Load</label><div class="pill">${n.queue.length}/${n.params.capacity} (${fillPercent}%)</div>`;
    wrap.appendChild(f);
  }
  
  if(n.type===TYPE.SINK){
    const qualityRate = qualityMetrics.produced > 0 ? Math.round(((qualityMetrics.produced - qualityMetrics.defects) / qualityMetrics.produced) * 100) : 0;
    const f = document.createElement('div'); 
    f.className='field'; 
    f.innerHTML = `<label>Total Completed</label><div class="pill">${throughput} parts</div>
                  <label>Quality Rate</label><div class="pill">${qualityRate}%</div>
                  <label>Defects</label><div class="pill" style="color:#ef4444">${qualityMetrics.defects} parts</div>`;
    wrap.appendChild(f);
  }

  const apply = document.createElement('div'); 
  apply.className='field'; 
  apply.innerHTML = `<button class="btn primary" id="applyBtn">Apply Changes</button>`; 
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
    
    if(n.type===TYPE.BUFFER && document.getElementById('icap')){ 
      n.params.capacity = Math.max(1, parseInt(document.getElementById('icap').value||n.params.capacity)); 
    }
  };
}

function updateStats(){ 
  document.getElementById('statNodes').textContent = nodes.length; 
  document.getElementById('statEdges').textContent = edges.length; 
}

// ======================
// Main loop & Responsiveness
// ======================
function resizeCanvas(){
  const wrap = canvas.parentElement;
  canvas.width = wrap.clientWidth;
  canvas.height = wrap.clientHeight;
}

window.addEventListener('resize', resizeCanvas);

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

// ======================
// Responsiveness
// ======================
function resizeCanvas() {
  const wrap = canvas.parentElement;
  canvas.width = wrap.clientWidth;
  canvas.height = wrap.clientHeight;
}

// Event listeners for window resize
window.addEventListener('resize', resizeCanvas);

// Initial resize on page load
resizeCanvas();

// Initialize
resizeCanvas();
seedLayout(); 
applyParameters(); // Load initial parameters
tick();