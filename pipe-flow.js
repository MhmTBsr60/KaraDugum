/* Connection-energy design preview. Sole authority: engine masks + fog from kdLessonPreview.
   No storage, puzzle mutation, input handlers, sound, haptic, reward or network writes. */
(()=>{'use strict';
 const board=document.getElementById('board'),game=document.getElementById('kdGame');if(!board||!game||!window.kdConnectionModel)return;
 const canvas=document.createElement('canvas');canvas.className='kdPipeFlowCanvas';canvas.id='kdPipeFlowCanvas';canvas.setAttribute('aria-hidden','true');
 const ctx=canvas.getContext('2d'),reduce=matchMedia('(prefers-reduced-motion: reduce)');if(!ctx)return;
 const palettes={gold:['#ffac24','#ffe09c'],ice:['#b9e4ff','#f3fcff'],fire:['#ffc568','#fff1c0'],shadow:['#d1a5ff','#f7e9ff'],emerald:['#78efb6','#e0ffe8'],ruby:['#ff9e71','#fff0ce']};
 const whites={gold:'#fffef5',ice:'#ffffff',fire:'#fffdf5',shadow:'#fffcff',emerald:'#fafffd',ruby:'#fffdf8'},NORMAL_MS=2200,WIN_MS=2200,TRAVEL_MS=1500;
 const low=(navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=4)||(navigator.deviceMemory>0&&navigator.deviceMemory<=4)||matchMedia('(update: slow)').matches;
 let values=[],net={edges:[],ports:[],ranks:[],maxRank:0},key='',theme='gold',rect=null,boxes=[],segments=[],frame=0,lastFrame=0,wave=null,lastRun='',revision=0,fading=[];
 const haloSprites=new Map(), channelTextures=new Map(), svgArms=new Map();
 const steady=document.createElement('canvas'),steadyContext=steady.getContext('2d');
 const stoneStencil=document.createElement('canvas'),stoneLight=document.createElement('canvas');
 const stencilContext=stoneStencil.getContext('2d'),stoneContext=stoneLight.getContext('2d');
 const stoneBrushes=new Map();
 const stoneScale=.85;
 const layerNames=['settled','rings','channel','wave'];
 let previewLayer='all', pixelScale=1;
 const previewAllowed=new URLSearchParams(location.search).has('energyPreview');
 const showLayer=name=>previewLayer==='all'||previewLayer===name;
 const emptyEffects=()=>({waves:[],rings:[],fronts:[],reflections:[],layers:{settled:0,rings:0,channel:0,wave:0}});
 const channelWidth=()=>theme==='emerald'||theme==='ruby'?20:13;
 let effects=emptyEffects(),bursts=[],burstId=0,lastMoves=0,lastUndos=0;
 let stats={frames:0,paintMs:[],updates:0,geometryReads:0};const joined=new Map();
 const enabled=()=>!document.body.classList.contains('kdNoGlow');
 const staticOnly=()=>reduce.matches||low||document.documentElement.hasAttribute('data-kd-gold-low-motion');
 const blocked=()=>game.hidden||document.hidden||!!window.kdOnboarding?.isOpen()||!!window.kdLearning?.isOpen()||!!window.kdStorage?.isOpen?.()||!!window.kdAdPrivacyBusy||!!document.querySelector('.kdRuleHelpOverlay,.kdDailyOverlay');
 const stop=()=>{effects=emptyEffects();bursts=[];wave=null;fading=[];cancelAnimationFrame(frame);frame=0;canvas.remove();if(document.body.classList.contains('kdFlowCelebrating'))document.body.classList.remove('kdFlowCelebrating');};
 function geometry(){const b=board.getBoundingClientRect();if(!b.width||!b.height)return false;rect={x:b.left,y:b.top,width:b.width,height:b.height};pixelScale=Math.min(1.5,devicePixelRatio||1);const scale=pixelScale,w=Math.ceil(b.width*scale),h=Math.ceil(b.height*scale);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}Object.assign(canvas.style,{left:b.left+'px',top:b.top+'px',width:b.width+'px',height:b.height+'px'});ctx.setTransform(scale,0,0,scale,0,0);
  boxes=[...board.querySelectorAll(':scope>.tile')].map(e=>{const r=e.getBoundingClientRect(),svg=e.querySelector('.kdSculptedPipe'),s=svg?.getBoundingClientRect();return {x:(s||r).left-b.left,y:(s||r).top-b.top,w:(s||r).width,h:(s||r).height,
   tile:{x:r.left-b.left,y:r.top-b.top,w:r.width,h:r.height},mask:Number(svg?.dataset.pipeMask),
   shell:svg?.querySelector('.kdPipeShell')?.getAttribute('d')};});stats.geometryReads++;return boxes.length===values.length;}
 const elbowFirstPort={3:1,6:2,12:4,9:8};
 const portPoint={1:[50,0],2:[100,50],4:[50,100],8:[0,50]};
 function readSvgArm(mask,bit,path){
  if(!elbowFirstPort[mask])return [portPoint[bit],[50,50]];
  const length=path.getTotalLength(),from=bit===elbowFirstPort[mask]?0:length;
  const points=Array.from({length:17},(_,step)=>{
   const {x,y}=path.getPointAtLength(from+(length/2-from)*step/16);
   return [x,y];
  });
  return points;
 }
 function arm(mask,bit){
  // Normalised SVG geometry is identical across themes. Each quarter turn
  // comes from the actual path mounted by theme-renderer, with no second elbow formula.
  if(!elbowFirstPort[mask])return [portPoint[bit],[50,50]];
  return svgArms.get(mask)?.get(bit)??[];
 }
 function cacheSvgArms(){
  for(const tile of board.querySelectorAll(':scope>.tile')){
   const svg=tile.querySelector('.kdSculptedPipe');
   const mask=Number(svg?.dataset.pipeMask);
   if(!elbowFirstPort[mask]||svgArms.has(mask))continue;
   const path=svg.querySelector('.kdPipeShell'),arms=new Map();
   for(const bit of [1,2,4,8])if(mask&bit)arms.set(bit,readSvgArm(mask,bit,path));
   svgArms.set(mask,arms);
  }
 }
 function line(a,points,back=false){const b=boxes[a],p=back?points.slice().reverse():points;return p.map(([x,y])=>[b.x+x*b.w/100,b.y+y*b.h/100]);}
 function refreshSegments(){
  segments=[];
  cacheSvgArms();
  for(const e of net.edges){
   const a=arm(values[e.a],e.bit),b=arm(values[e.b],e.opp);
   if(!a.length||!b.length)continue;
   let points=[...line(e.a,a,true),...line(e.b,b)];
   const lengths=[0];
   for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
   // The physical joint lies half-way across the two reciprocal port openings.
   let junctionDistance=(lengths[a.length-1]+lengths[a.length])/2;
   const rank=Math.min(net.ranks[e.a],net.ranks[e.b]);let startCell=e.a,endCell=e.b;
   if(net.ranks[e.a]>net.ranks[e.b]){
    startCell=e.b;endCell=e.a;junctionDistance=lengths.at(-1)-junctionDistance;points=points.reverse();lengths.length=0;lengths.push(0);
    for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
   }
   segments.push({...e,startCell,endCell,points,lengths,length:lengths.at(-1),rank,junctionAt:junctionDistance/Math.max(.001,lengths.at(-1)),width:Math.min(boxes[e.a].w,boxes[e.b].w)/100});
  }
 }
 function dot(s,t){const d=Math.max(0,Math.min(1,t))*s.length;let k=1;while(k<s.lengths.length-1&&s.lengths[k]<d)k++;const f=(d-s.lengths[k-1])/Math.max(.001,s.lengths[k]-s.lengths[k-1]);return [s.points[k-1][0]+(s.points[k][0]-s.points[k-1][0])*f,s.points[k-1][1]+(s.points[k][1]-s.points[k-1][1])*f];}
 function portion(s,from,to){const a=Math.max(0,from),b=Math.min(1,to);if(b<=a)return [];const points=[dot(s,a)];for(let i=1;i<s.lengths.length-1;i++)if(s.lengths[i]>a*s.length&&s.lengths[i]<b*s.length)points.push(s.points[i]);points.push(dot(s,b));return points;}
 // Geometry plans are built only after actual board layout updates, never per paint.
 // Dijkstra distance orders the cosmetic wave on the CURRENT reciprocal graph.
 function planEnergy(seedIds,all=false){
  const adj=values.map(()=>[]),allowed=new Set(),roots=[];
  for(const s of segments){adj[s.a].push([s.b,s]);adj[s.b].push([s.a,s]);}
  const seeds=all?segments:segments.filter(s=>seedIds.includes(s.id));
  for(const seed of seeds){
   if(allowed.has(seed.a))continue;
   const nodes=[seed.a];allowed.add(seed.a);
   for(let k=0;k<nodes.length;k++)for(const [to]of adj[nodes[k]])if(!allowed.has(to)){allowed.add(to);nodes.push(to);}
   const leaves=nodes.filter(i=>adj[i].length===1);roots.push(Math.min(...(leaves.length?leaves:nodes)));
  }
  const dist=values.map(()=>Infinity),done=new Set();for(const root of roots)dist[root]=0;
  for(let k=0;k<values.length;k++){
   let node=-1;for(const i of allowed)if(!done.has(i)&&(node<0||dist[i]<dist[node]))node=i;
   if(node<0||!Number.isFinite(dist[node]))break;done.add(node);
   for(const [to,s]of adj[node])dist[to]=Math.min(dist[to],dist[node]+s.length);
  }
  const entries=[],bends=new Map();let distance=1;
  for(const source of segments){
   if(!allowed.has(source.a))continue;
   const backwards=dist[source.startCell]>dist[source.endCell],points=backwards?source.points.slice().reverse():source.points,lengths=[0];
   for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
   const s={...source,points,lengths,startCell:backwards?source.endCell:source.startCell,endCell:backwards?source.startCell:source.endCell,junctionAt:backwards?1-source.junctionAt:source.junctionAt};
   const offset=Math.min(dist[source.a],dist[source.b]);entries.push({s,offset});distance=Math.max(distance,offset+s.length);
   const [color,core]=palettes[theme]||palettes.gold;
   s.texture=source.texture??(source.texture=lumenTexture(source,color,core));
   for(const [cell,at]of [[s.startCell,0],[s.endCell,1]]){
    if(![3,6,12,9].includes(values[cell])||net.ports[cell]!==values[cell])continue;
    const arrival=offset+at*s.length,old=bends.get(cell);
    if(!old||arrival<old.arrival)bends.set(cell,{cell,center:dot(s,at),arrival,width:s.width,id:s.id});
   }
  }
  return {entries,bends:[...bends.values()],distance};
 }
 function trace(points,target=ctx){
  target.beginPath();
  points.forEach(([x,y],i)=>i?target.lineTo(x,y):target.moveTo(x,y));
 }
 function buildRibbon(points,radius){
  const ribbon=new Path2D();
  if(points.length<2)return ribbon;
  const rim=[[],[]];
  for(let i=0;i<points.length;i++){
   const [x,y]=points[i],before=points[Math.max(0,i-1)],after=points[Math.min(points.length-1,i+1)];
   const dx=after[0]-before[0],dy=after[1]-before[1],length=Math.hypot(dx,dy)||1;
   const w=typeof radius==='function'?radius(i/(points.length-1)):radius;
   rim[0].push([x-dy*w/length,y+dx*w/length]);
   rim[1].push([x+dy*w/length,y-dx*w/length]);
  }
  [...rim[0],...rim[1].reverse()].forEach(([x,y],i)=>i?ribbon.lineTo(x,y):ribbon.moveTo(x,y));
  ribbon.closePath();
  return ribbon;
 }
 function rgb(hex){return hex.slice(1).match(/../g).map(value=>parseInt(value,16));}
 function mix(a,b,t){return a.map((value,i)=>Math.round(value+(b[i]-value)*t));}
 function rgba(hex,alpha){return 'rgba('+rgb(hex).join(',')+','+alpha+')';}
 function stroke(points,color,width,alpha,target=ctx){
  if(points.length<2||alpha<=0)return;
  trace(points,target);target.strokeStyle=color;target.lineWidth=width;target.globalAlpha=alpha;target.stroke();
 }

 // Layer 1: bake the across-pipe colour profile once in a small transparent
 // texture. Revealing a section clips the texture in the direction of travel.
 // Butt edges and the measured lumen keep the pipe casing visible.
 function lumenTexture(s,color,core){
  const width=channelWidth()*s.width;
  const x=Math.floor(Math.min(...s.points.map(p=>p[0]))-width/2-2);
  const y=Math.floor(Math.min(...s.points.map(p=>p[1]))-width/2-2);
  const w=Math.ceil(Math.max(...s.points.map(p=>p[0]))+width/2+2)-x;
  const h=Math.ceil(Math.max(...s.points.map(p=>p[1]))+width/2+2)-y;
  const points=s.points.map(([a,b])=>[a-x,b-y]);
  const signature=[theme,pixelScale,width.toFixed(2),w,h,points.map(p=>p.map(n=>n.toFixed(1)))].join('|');
  let surface=channelTextures.get(signature);
  if(!surface){
   surface=document.createElement('canvas');
   surface.width=Math.ceil(w*pixelScale);surface.height=Math.ceil(h*pixelScale);
   const painter=surface.getContext('2d');
   if(!painter)return null;
   painter.setTransform(pixelScale,0,0,pixelScale,0,0);
   painter.lineJoin='round';painter.lineCap='butt';trace(points,painter);
   const edge=rgb(color),shoulder=rgb(core),center=rgb(whites[theme]||whites.gold);
   // The narrow white core is inside a continuous saturated gold shoulder.
   // Many subpixel steps are baked here, outside the animation loop.
   for(let step=0;step<18;step++){
    const t=step/17,hot=t<.42?mix(edge,shoulder,t/.42):mix(shoulder,center,Math.min(1,(t-.42)/.40));
    painter.strokeStyle='rgb('+hot.join(',')+')';
    painter.globalAlpha=Math.min(1,.36+t*2.2);
    painter.lineWidth=width*(1-t*.87);
    painter.stroke();
   }
   if(channelTextures.size>=64)channelTextures.delete(channelTextures.keys().next().value);
   channelTextures.set(signature,surface);
  }
  return {surface,x,y,w,h};
 }
 function drawChannel(s,points,head,strength){
  if(!showLayer('channel')||points.length<2)return;
  const width=channelWidth()*s.width;
  const texture=s.texture;
  if(!texture)return;
  ctx.save();
  if(head<1)ctx.clip(buildRibbon(points,width*.65+1));
  ctx.globalAlpha=strength;
  ctx.drawImage(texture.surface,texture.x,texture.y,texture.w,texture.h);
  ctx.restore();
  effects.layers.channel++;
 }

 // Layer 2: a shaped leading lobe with longitudinal falloff. Its colour and
 // opacity use global propagation distance, so the crest can cross a seam.
 // The moving crest illuminates nearby stone. Cache its receiving surface
 // by layout: inset tiles keep their grid and every metal silhouette is cut out.
 function rebuildStoneStencil(){
  if(!stencilContext||!stoneContext||staticOnly())return;
  for(const surface of [stoneStencil,stoneLight]){
   const w=Math.ceil(rect.width*stoneScale),h=Math.ceil(rect.height*stoneScale);
   if(surface.width!==w||surface.height!==h){surface.width=w;surface.height=h;}
  }
  const painter=stencilContext;
  painter.setTransform(stoneScale,0,0,stoneScale,0,0);
  painter.clearRect(0,0,rect.width,rect.height);
  painter.fillStyle='#fff';
  painter.globalCompositeOperation='source-over';
  const inset=2.3;
  for(const box of boxes){
   const t=box.tile;
   painter.beginPath();painter.roundRect(t.x+inset,t.y+inset,t.w-2*inset,t.h-2*inset,3);
   painter.fill();
  }
  painter.globalCompositeOperation='destination-out';
  painter.strokeStyle='#fff';painter.lineJoin='round';painter.lineCap='round';
  for(const box of boxes){
   if(!box.shell)continue;
   painter.save();painter.translate(box.x,box.y);painter.scale(box.w/100,box.h/100);
   const tube=channelWidth();
   painter.lineWidth=tube+12;
   painter.stroke(new Path2D(box.shell));
   if(!elbowFirstPort[box.mask]&&box.mask!==5&&box.mask!==10){
    painter.beginPath();painter.arc(50,50,tube/2+7.5,0,2*Math.PI);painter.fill();
   }
   for(const [bit,x,y] of [[1,50,13],[2,87,50],[4,50,87],[8,13,50]]){
    if(!(box.mask&bit))continue;
    const across=(tube+16)/2,along=6.5,vertical=bit===1||bit===4;
    const rx=vertical?across:along,ry=vertical?along:across;
    painter.fillRect(x-rx,y-ry,rx*2,ry*2);
   }
   painter.restore();
  }
  painter.globalCompositeOperation='source-over';
 }

 function stoneBrush(color){
  if(stoneBrushes.has(color))return stoneBrushes.get(color);
  const surface=document.createElement('canvas');surface.width=64;surface.height=64;
  const painter=surface.getContext('2d');
  if(!painter)return null;
  const beam=painter.createRadialGradient(32,32,2,32,32,32);
  for(const [at,alpha] of [[0,.24],[.26,.20],[.52,.13],[.77,.05],[1,0]])beam.addColorStop(at,rgba(color,alpha));
  painter.fillStyle=beam;painter.fillRect(0,0,64,64);
  stoneBrushes.set(color,surface);
  return surface;
 }
 function drawStoneReflections(profiles,color){
  if(!stoneContext||!stencilContext||!showLayer('wave')||!profiles.size)return;
  const colorOnStone=theme==='gold'||theme==='fire'?'#ffad57':color;
  const brush=stoneBrush(colorOnStone);
  if(!brush)return;
  const limit=values.length>=49?1:3;
  const painter=stoneContext;
  painter.setTransform(stoneScale,0,0,stoneScale,0,0);
  painter.globalCompositeOperation='source-over';
  painter.clearRect(0,0,rect.width,rect.height);
  for(const {s,frontDistance} of profiles.values()){
   const travel=58*s.width/s.length,hot=frontDistance-travel*.46;
   if(hot<0||hot>1)continue;
   const [x,y]=dot(s,hot),radius=37*s.width;
   painter.drawImage(brush,x-radius,y-radius,radius*2,radius*2);
   effects.reflections.push({id:s.id,center:[x,y],radius});
   if(effects.reflections.length>=limit)break;
  }
  if(!effects.reflections.length)return;
  painter.globalCompositeOperation='destination-in';
  painter.drawImage(stoneStencil,0,0,stoneStencil.width/stoneScale,stoneStencil.height/stoneScale);
  ctx.save();
  ctx.globalAlpha=1;ctx.globalCompositeOperation='screen';
  ctx.drawImage(stoneLight,0,0,stoneLight.width/stoneScale,stoneLight.height/stoneScale);
  ctx.restore();
 }

 function drawCrest(s,frontDistance,color,core){
  const travel=58*s.width/s.length;
  const from=Math.max(0,frontDistance-travel),to=Math.min(1,frontDistance);
  if(to<=from)return [];
  const count=10,points=Array.from({length:count+1},(_,i)=>dot(s,from+(to-from)*i/count));
  const white=whites[theme]||whites.gold;
  if(!showLayer('wave'))return points;
  const width=channelWidth()*s.width;
  const progress=t=>1-(frontDistance-(from+(to-from)*t))/travel;
  const envelope=t=>{
   const p=Math.max(0,Math.min(1,t));
   return p<.76?(p/.76)**.72:((1-p)/.24)**.45;
  };
  const gradient=ctx.createLinearGradient(...points[0],...points.at(-1));
  for(let band=0;band<=8;band++){
   const t=band/8,phase=progress(t);
   const tone=phase<.5?color:phase<.74?core:white;
   gradient.addColorStop(t,rgba(tone,envelope(phase)*.97));
  }
  ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='screen';
  ctx.fillStyle=gradient;
  ctx.fill(buildRibbon(points,t=>width*.48*envelope(progress(t))));
  ctx.restore();
  effects.layers.wave++;
  return points;
 }

 // Layer 3: a narrow annular ridge with soft shoulders and a transparent
 // centre. The SVG elbow's half-length point anchors the outgoing rings.
 function ringBrush(color){
  if(haloSprites.has(color))return haloSprites.get(color);
  const brush=document.createElement('canvas');brush.width=brush.height=96;
  const painter=brush.getContext('2d');if(!painter)return null;
  const gradient=painter.createRadialGradient(48,48,0,48,48,47);
  const shoulder=theme==='gold'||theme==='fire'?'#ffa52c':color,crest=theme==='gold'||theme==='fire'?'#ffd488':color;
  for(const [at,tone,alpha]of [[0,color,0],[.53,color,0],[.63,shoulder,.10],
   [.71,shoulder,.29],[.753,crest,.90],[.81,crest,.90],[.85,shoulder,.38],[.92,shoulder,.10],[1,color,0]]){
   gradient.addColorStop(at,rgba(tone,alpha));
  }
  painter.fillStyle=gradient;painter.fillRect(0,0,96,96);
  haloSprites.set(color,brush);return brush;
 }
 function drawRing({cell,id,center,width,phase},color){
  const dense=values.length>=49;
  if(phase<=0||phase>=1||effects.rings.length>=(dense?8:16))return;
  const brush=ringBrush(color);
  if(!brush)return;
  const spread=1-(1-phase)**2,extent=(dense?14+15*spread:16+22*spread)*width;
  const strength=Math.min(1,phase/.13)*(1-phase)**.55;
  if(showLayer('rings')){
   ctx.save();
   ctx.globalAlpha=strength;
   ctx.drawImage(brush,center[0]-extent,center[1]-extent,extent*2,extent*2);
   if(!dense){
    const echo=extent*.73;
    ctx.globalAlpha=strength*.56;
    ctx.drawImage(brush,center[0]-echo,center[1]-echo,echo*2,echo*2);
   }
   ctx.restore();effects.layers.rings++;
  }
  effects.rings.push({id,cell,kind:'bend',center,radius:extent*.78,phase,profile:'annular-ridge',haloOuterRadius:extent});
 }

 // Layer 4: prepaint the stationary connected network when layout or masks
 // change. During motion this pass is a single blit, plus finite disconnections.
 function rebuildSettled(color,core){
  if(!steadyContext)return;
  if(steady.width!==canvas.width||steady.height!==canvas.height){
   steady.width=canvas.width;steady.height=canvas.height;
  }
  steadyContext.setTransform(pixelScale,0,0,pixelScale,0,0);
  steadyContext.clearRect(0,0,rect.width,rect.height);
  steadyContext.lineJoin='round';steadyContext.lineCap='butt';
  const width=channelWidth();
  for(const s of segments){
   stroke(s.points,color,width*.96*s.width,.25,steadyContext);
   stroke(s.points,core,width*.59*s.width,.23,steadyContext);
  }
 }
 function drawSettled(now,color,flat){
  if(!showLayer('settled'))return;
  ctx.globalAlpha=1;
  if(steadyContext)ctx.drawImage(steady,0,0,steady.width/pixelScale,steady.height/pixelScale);
  effects.layers.settled=segments.length;
  if(!flat)for(const f of fading)stroke(f.points,color,channelWidth()*.8*f.width,.35*(1-(now-f.start)/240));
 }
 function render(now){
  frame=0;if(!enabled()||blocked()||!rect){stop();return;}
  const start=performance.now(),flat=staticOnly();let moving=false;
  effects=emptyEffects();ctx.clearRect(0,0,rect.width,rect.height);ctx.lineCap='round';ctx.lineJoin='round';
  const [color,core]=palettes[theme]||palettes.gold;
  fading=flat?[]:fading.filter(f=>now-f.start<240);
  drawSettled(now,color,flat);
  if(fading.length)moving=true;
  const profiles=new Map(),rings=[];
  bursts=flat?[]:bursts.filter(b=>now-b.start<NORMAL_MS&&b.seedIds.some(id=>net.edges.some(e=>e.id===id)));
  const active=flat?[]:wave?[wave]:bursts;
  for(const event of active){
   const age=now-event.start;
   if(age<0||age>=NORMAL_MS)continue;
   moving=true;
   const plan=event.plan;
   if(!plan)continue;
   const distance=Math.min(1,age/TRAVEL_MS)*plan.distance,finish=Math.min(1,(NORMAL_MS-age)/500),tips=[];
   for(const {s,offset}of plan.entries){
    const frontDistance=(age/TRAVEL_MS*plan.distance-offset)/s.length;
    const head=Math.min(1,Math.max(0,frontDistance));
    if(head<=0)continue;
    const reachedAt=(offset+s.length)/plan.distance*TRAVEL_MS;
    const strength=Math.max(.63,1-Math.max(0,age-reachedAt-120)/2600)*finish;
    const old=profiles.get(s.id);
    if(!old||strength>old.strength)profiles.set(s.id,{s,head,frontDistance,strength,winning:!!wave});
    if(head<1)tips.push({id:s.id,tip:dot(s,head),head});
   }
   for(const bend of plan.bends)rings.push({...bend,phase:(age-bend.arrival/plan.distance*TRAVEL_MS)/690});
   effects.fronts.push({id:event.id||'completion',distance,progress:Math.min(1,age/TRAVEL_MS),tips,winning:!!wave});
  }
  drawStoneReflections(profiles,color);
  rings.sort((a,b)=>Math.abs(a.phase-.32)-Math.abs(b.phase-.32));
  const seen=new Set();
  for(const ring of rings){
   if(ring.phase<=0||ring.phase>=1||seen.has(ring.cell))continue;
   seen.add(ring.cell);drawRing(ring,color);
  }
  for(const [id,profile]of profiles){
   const {s,head,strength,winning,frontDistance}=profile,width=channelWidth()*s.width,tail=portion(s,0,head);
   drawChannel(s,tail,head,strength);
   effects.waves.push({id,head,tip:dot(s,head),winning,tail,bright:[],channelWidth:width*.88,pipeInnerWidth:width,strength,segment:s,frontDistance});
  }
  for(const item of effects.waves){
   item.bright=drawCrest(item.segment,item.frontDistance,color,core);
   delete item.segment;delete item.frontDistance;
  }
  ctx.globalAlpha=1;
  if(wave&&(flat||now>=wave.start+wave.duration)){wave=null;bursts=[];document.body.classList.remove('kdFlowCelebrating');}
  stats.frames++;stats.paintMs.push(performance.now()-start);if(stats.paintMs.length>240)stats.paintMs.shift();if(moving)schedule();
 }

 function schedule(){if(frame||blocked()||!enabled())return;const interval=net.ports.length>=49?50:33;frame=requestAnimationFrame(now=>{if(now-lastFrame<interval){frame=0;schedule();return;}lastFrame=now;render(now);});}
 function update(host,masks){if(host!==board)return;const learning=window.kdLessonPreview?.(),state=window.kdGetLearningState?.();if(!learning||!state)return;const oldValues=values.slice(),oldSegments=segments.slice();values=Array.from(masks||learning.before);const nextKey=[state.level,state.daily?.date||'',window.kdExtra?.layer||0,values.length].join('|'),now=performance.now(),changed=nextKey!==key||state.moves===0&&lastMoves>0&&(state.undos||0)<=lastUndos;lastMoves=state.moves;lastUndos=state.undos||0;
  if(changed){key=nextKey;joined.clear();wave=null;lastRun='';fading=[];bursts=[];}
  const next=kdConnectionModel.graph(values,learning.n,learning.flags.fog);if(!changed&&!staticOnly())for(const old of oldSegments)if(!next.edges.some(e=>e.id===old.id))for(const [cell,bit] of [[old.a,old.bit],[old.b,old.opp]])if(values[cell]===oldValues[cell]&&!learning.flags.fog[cell]&&boxes[cell])fading.push({points:line(cell,arm(values[cell],bit)),width:old.width,start:now});const newIds=changed?[]:next.edges.filter(e=>!joined.has(e.id)).map(e=>e.id);if(newIds.length&&!staticOnly()&&enabled()){bursts.push({id:++burstId,start:now,seedIds:newIds});bursts=bursts.slice(-3);}for(const e of next.edges)if(!joined.has(e.id))joined.set(e.id,changed?-1e9:now);for(const id of joined.keys())if(!next.edges.some(e=>e.id===id))joined.delete(id);net=next;theme=document.documentElement.dataset.kdTheme||'gold';revision++;stats.updates++;
  if(!enabled()||blocked()){stop();return;}
  // Completion is reported by the existing engine/reward flow, not inferred from lit ports.
  if(!state.locked&&lastRun){lastRun='';wave=null;if(document.body.classList.contains('kdFlowCelebrating'))document.body.classList.remove('kdFlowCelebrating');}const run=state.locked&&window.kdLastWin?.id;if(run&&run!==lastRun){lastRun=run;const duration=staticOnly()?0:WIN_MS;wave={start:now,duration};document.body.classList.add('kdFlowCelebrating');}
  cancelAnimationFrame(frame);frame=requestAnimationFrame(time=>{frame=0;if(!enabled()||blocked()){stop();return;}if(!geometry())return;refreshSegments();rebuildStoneStencil();rebuildSettled(...(palettes[theme]||palettes.gold));for(const b of bursts)b.plan=planEnergy(b.seedIds);if(wave)wave.plan=planEnergy([],true);if(!canvas.isConnected)document.documentElement.appendChild(canvas);render(time);});
 }
 // A broken link never emits new energy. Its unchanged neighbour's real pipe fades for
 // 240 ms; rotated-away arms vanish immediately, so no stale line crosses the stone.
 function sync(){if(!enabled()||blocked()){stop();return;}update(board,values.length?values:undefined);}
 window.kdPipeFlow={afterRender:update,state:()=>({enabled:enabled(),static:staticOnly(),theme,revision,key,edges:net.edges.map(e=>({...e})),ports:net.ports.slice(),ranks:net.ranks.slice(),wave:wave?{start:wave.start,duration:wave.duration}:null,fading:fading.length,canvas:canvas.isConnected,rect:rect?{...rect}:null,segments:segments.map(s=>({id:s.id,points:s.points.map(p=>p.slice())})),previewLayer,stats:{...stats,textureCount:channelTextures.size,paintMs:stats.paintMs.slice(),haloBrushes:haloSprites.size,haloBrushBytes:haloSprites.size*96*96*4},renderer:'canvas2d-four-passes',style:'energy-reference-3-layered',timings:{joinMs:NORMAL_MS,travelMs:TRAVEL_MS,completionMaxMs:WIN_MS,fadeMs:240},effects:JSON.parse(JSON.stringify(effects)),phoneVerified:false})};
 if(previewAllowed)window.kdPipeFlow.showLayer=name=>{
  if(name!=='all'&&!layerNames.includes(name))throw new RangeError('Unknown energy layer');
  previewLayer=name;
  if(rect&&canvas.isConnected){cancelAnimationFrame(frame);render(performance.now());}
 };
 try{window.KaraNative?.setTapLightEnabled?.(false);window.KaraNative?.cancelTapLight?.(0);}catch(_){}
 new MutationObserver(sync).observe(game,{attributes:true,attributeFilter:['hidden']});new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});new MutationObserver(()=>{update(board);}).observe(document.documentElement,{attributes:true,attributeFilter:['data-kd-theme']});
 new MutationObserver(sync).observe(document.body,{childList:true});reduce.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);window.addEventListener('resize',sync);window.addEventListener('scroll',sync,{passive:true});const resize=new ResizeObserver(sync);for(const el of [board,game.querySelector('main'),game.querySelector('.instructions'),game.querySelector('.kdTop')])if(el)resize.observe(el);sync();
})();
