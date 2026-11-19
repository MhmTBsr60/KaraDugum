/* Connection-energy design preview. Sole authority: engine masks + fog from kdLessonPreview.
   No storage, puzzle mutation, input handlers, sound, haptic, reward or network writes. */
(()=>{'use strict';
 const board=document.getElementById('board'),game=document.getElementById('kdGame');if(!board||!game||!window.kdConnectionModel)return;
 const canvas=document.createElement('canvas');canvas.className='kdPipeFlowCanvas';canvas.id='kdPipeFlowCanvas';canvas.setAttribute('aria-hidden','true');
 const ctx=canvas.getContext('2d'),reduce=matchMedia('(prefers-reduced-motion: reduce)');if(!ctx)return;
 const palettes={gold:['#ffd35d','#fff4c8'],ice:['#b9e4ff','#f3fcff'],fire:['#ffc568','#fff1c0'],shadow:['#d1a5ff','#f7e9ff'],emerald:['#78efb6','#e0ffe8'],ruby:['#ff9e71','#fff0ce']};
 const whites={gold:'#fffef5',ice:'#ffffff',fire:'#fffdf5',shadow:'#fffcff',emerald:'#fafffd',ruby:'#fffdf8'},NORMAL_MS=2200,WIN_MS=2200,TRAVEL_MS=1500;
 const low=(navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=4)||(navigator.deviceMemory>0&&navigator.deviceMemory<=4)||matchMedia('(update: slow)').matches;
 let values=[],net={edges:[],ports:[],ranks:[],maxRank:0},key='',theme='gold',rect=null,boxes=[],segments=[],frame=0,lastFrame=0,wave=null,lastRun='',revision=0,fading=[];
 let effects={waves:[],rings:[],fronts:[]},bursts=[],burstId=0,lastMoves=0,lastUndos=0;
 let stats={frames:0,paintMs:[],updates:0,geometryReads:0};const joined=new Map();
 const enabled=()=>!document.body.classList.contains('kdNoGlow');
 const staticOnly=()=>reduce.matches||low||document.documentElement.hasAttribute('data-kd-gold-low-motion');
 const blocked=()=>game.hidden||document.hidden||!!window.kdOnboarding?.isOpen()||!!window.kdLearning?.isOpen()||!!window.kdStorage?.isOpen?.()||!!window.kdAdPrivacyBusy||!!document.querySelector('.kdRuleHelpOverlay,.kdDailyOverlay');
 const stop=()=>{effects={waves:[],rings:[],fronts:[]};bursts=[];cancelAnimationFrame(frame);frame=0;canvas.remove();if(document.body.classList.contains('kdFlowCelebrating'))document.body.classList.remove('kdFlowCelebrating');};
 function geometry(){const b=board.getBoundingClientRect();if(!b.width||!b.height)return false;rect={x:b.left,y:b.top,width:b.width,height:b.height};const scale=Math.min(1.5,devicePixelRatio||1);canvas.width=Math.ceil(b.width*scale);canvas.height=Math.ceil(b.height*scale);Object.assign(canvas.style,{left:b.left+'px',top:b.top+'px',width:b.width+'px',height:b.height+'px'});ctx.setTransform(scale,0,0,scale,0,0);
  boxes=[...board.querySelectorAll(':scope>.tile')].map(e=>{const r=e.getBoundingClientRect(),svg=e.querySelector('.kdSculptedPipe'),s=svg?.getBoundingClientRect();return {x:(s||r).left-b.left,y:(s||r).top-b.top,w:(s||r).width,h:(s||r).height};});stats.geometryReads++;return boxes.length===values.length;}
 // Sample the very same rounded elbows used by theme-renderer.js; only matched arms.
 function arm(mask,bit){let pts=[];if([3,6,12,9].includes(mask)){
   const turn=[3,6,12,9].indexOf(mask),first=[1,2,4,8][turn];
   for(let i=0;i<=12;i++){const t=i/12;if(t<=.5)pts.push([50,t*50]);else{const q=t-.5;pts.push([(1-q)*(1-q)*50+2*(1-q)*q*50+q*q*75,(1-q)*(1-q)*25+2*(1-q)*q*50+q*q*50]);}}
   if(bit!==first){pts=pts.map(([x,y])=>[100-y,100-x]);}
   for(let k=0;k<turn;k++)pts=pts.map(([x,y])=>[100-y,x]);
  }else{const p={1:[50,0],2:[100,50],4:[50,100],8:[0,50]}[bit];pts=[p,[50,50]];}
  return pts;
 }
 function line(a,points,back=false){const b=boxes[a],p=back?points.slice().reverse():points;return p.map(([x,y])=>[b.x+x*b.w/100,b.y+y*b.h/100]);}
 function refreshSegments(){
  segments=[];
  for(const e of net.edges){
   const a=arm(values[e.a],e.bit),b=arm(values[e.b],e.opp);
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
 function trace(points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));}
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
   for(const [cell,at]of [[s.startCell,0],[s.endCell,1]]){
    if(![3,6,12,9].includes(values[cell])||net.ports[cell]!==values[cell])continue;
    const arrival=offset+at*s.length,old=bends.get(cell);
    if(!old||arrival<old.arrival)bends.set(cell,{cell,center:dot(s,at),arrival,width:s.width,id:s.id});
   }
  }
  return {entries,bends:[...bends.values()],distance};
 }
 function stroke(points,color,width,alpha){if(points.length<2||alpha<=0)return;trace(points);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.globalAlpha=Math.min(1,alpha);ctx.stroke();}
 function broadChannel(profile,color,core){
  const {s,head,strength,winning}=profile,w=s.width,channel=(theme==='emerald'||theme==='ruby'?20:13),filled=portion(s,0,head);
  if(filled.length<2)return;
  // The whole reached inner channel is luminous. No dark capsule outline,
  // thin filament or isolated dash; the original outer metal remains uncovered.
  stroke(filled,color,(channel+18)*w,.10*strength);
  stroke(filled,color,(channel+7)*w,.38*strength);
  stroke(filled,color,channel*.98*w,.98*strength);
  stroke(filled,core,channel*.84*w,.97*strength);
  stroke(filled,whites[theme]||whites.gold,channel*.62*w,.96*strength);
  const front=portion(s,head-.22,head);
  if(head<1&&front.length){
   stroke(front,color,(channel+13)*w,.32);
   stroke(front,core,channel*.96*w,1);
   stroke(front,whites[theme]||whites.gold,channel*.78*w,1);
  }
  effects.waves.push({id:s.id,head,tip:dot(s,head),winning,tail:filled,bright:front,channelWidth:channel*.84*w,pipeInnerWidth:channel*w,strength});
 }
 function energyRing(center,w,phase,color,{id,cell,kind}){
  if(phase<=0||phase>=1||effects.rings.length>=(values.length>=49?10:20))return;
  const envelope=Math.sqrt(Math.sin(Math.PI*phase)),radius=(kind==='bend'?12+12*phase:5+8*phase)*w;
  // Concentric annular strokes create an outward halo without a filled disc
  // over the stone. No shadowBlur, particles, image asset or screen flash.
  for(const [scale,width,alpha]of [[1,8,.22],[1,3.1,1],[.74,2.1,.88],[1,1.0,.88]]){
   ctx.beginPath();ctx.arc(center[0],center[1],radius*scale,0,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=width*w;ctx.globalAlpha=alpha*envelope;ctx.stroke();
  }
  effects.rings.push({id,cell,kind,center,radius,phase});
 }
 function render(now){
  frame=0;if(!enabled()||blocked()||!rect){stop();return;}
  const start=performance.now(),flat=staticOnly();let moving=false;
  effects={waves:[],rings:[],fronts:[]};ctx.clearRect(0,0,rect.width,rect.height);ctx.lineCap='round';ctx.lineJoin='round';
  const [color,core]=palettes[theme]||palettes.gold,channel=(theme==='emerald'||theme==='ruby'?20:13);
  for(const s of segments){
   const rise=flat?1:Math.min(1,Math.max(0,now-(joined.get(s.id)??-1e9))/300);
   stroke(s.points,color,channel*.94*s.width,(flat?.16:.27)*rise);
   stroke(s.points,core,channel*.64*s.width,(flat?.12:.24)*rise);
   if(!flat&&rise<1)moving=true;
  }
  const profiles=new Map(),rings=[];
  bursts=flat?[]:bursts.filter(b=>now-b.start<NORMAL_MS&&b.seedIds.some(id=>net.edges.some(e=>e.id===id)));
  const active=flat?[]:wave?[wave]:bursts;
  for(const event of active){
   const age=now-event.start;if(age<0||age>=NORMAL_MS)continue;moving=true;
   const plan=event.plan;if(!plan)continue;
   const distance=Math.min(1,age/TRAVEL_MS)*plan.distance,finish=Math.min(1,(NORMAL_MS-age)/520),tips=[];
   for(const {s,offset}of plan.entries){
    const head=Math.min(1,Math.max(0,(distance-offset)/s.length));if(head<=0)continue;
    const reachedAt=(offset+s.length)/plan.distance*TRAVEL_MS,tailFade=1-Math.max(0,age-reachedAt-180)/1100;
    const strength=Math.max(.12,Math.min(1,tailFade))*finish,old=profiles.get(s.id);
    if(!old||strength>old.strength)profiles.set(s.id,{s,head,strength,winning:!!wave});
    if(head<1)tips.push({id:s.id,tip:dot(s,head),head});
    const jointAt=(offset+s.length*s.junctionAt)/plan.distance*TRAVEL_MS;
    rings.push({center:dot(s,s.junctionAt),width:s.width,phase:(age-jointAt)/430,id:s.id,kind:'joint'});
   }
   for(const bend of plan.bends)rings.push({...bend,phase:(age-bend.arrival/plan.distance*TRAVEL_MS)/720,kind:'bend'});
   effects.fronts.push({id:event.id||'completion',distance,progress:Math.min(1,age/TRAVEL_MS),tips,winning:!!wave});
  }
  for(const profile of profiles.values())broadChannel(profile,color,core);
  // Bends have priority, so the largest boards retain their informative halos.
  rings.sort((a,b)=>(a.kind==='bend'?0:1)-(b.kind==='bend'?0:1));const seen=new Set();
  for(const ring of rings.filter(r=>r.phase>0&&r.phase<1)){const key=ring.kind+':'+(ring.cell??ring.id);if(seen.has(key))continue;seen.add(key);energyRing(ring.center,ring.width,ring.phase,color,ring);}
  fading=flat?[]:fading.filter(f=>now-f.start<240);
  for(const f of fading){stroke(f.points,color,channel*.8*f.width,.35*(1-(now-f.start)/240));moving=true;}
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
  cancelAnimationFrame(frame);frame=requestAnimationFrame(time=>{frame=0;if(!enabled()||blocked()){stop();return;}if(!geometry())return;refreshSegments();for(const b of bursts)b.plan=planEnergy(b.seedIds);if(wave)wave.plan=planEnergy([],true);if(!canvas.isConnected)document.documentElement.appendChild(canvas);render(time);});
 }
 // A broken link never emits new energy. Its unchanged neighbour's real pipe fades for
 // 240 ms; rotated-away arms vanish immediately, so no stale line crosses the stone.
 function sync(){if(!enabled()||blocked()){stop();return;}update(board,values.length?values:undefined);}
 window.kdPipeFlow={afterRender:update,state:()=>({enabled:enabled(),static:staticOnly(),theme,revision,key,edges:net.edges.map(e=>({...e})),ports:net.ports.slice(),ranks:net.ranks.slice(),wave:wave?{start:wave.start,duration:wave.duration}:null,fading:fading.length,canvas:canvas.isConnected,rect:rect?{...rect}:null,segments:segments.map(s=>({id:s.id,points:s.points.map(p=>p.slice())})),stats:{...stats,paintMs:stats.paintMs.slice()},renderer:'root-canvas2d',style:'energy-channel-wave-reference-3',timings:{joinMs:NORMAL_MS,travelMs:TRAVEL_MS,completionMaxMs:WIN_MS,fadeMs:240},effects:JSON.parse(JSON.stringify(effects)),phoneVerified:false})};
 try{window.KaraNative?.setTapLightEnabled?.(false);window.KaraNative?.cancelTapLight?.(0);}catch(_){}
 new MutationObserver(sync).observe(game,{attributes:true,attributeFilter:['hidden']});new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});new MutationObserver(()=>{update(board);}).observe(document.documentElement,{attributes:true,attributeFilter:['data-kd-theme']});
 new MutationObserver(sync).observe(document.body,{childList:true});reduce.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);window.addEventListener('resize',sync);window.addEventListener('scroll',sync,{passive:true});const resize=new ResizeObserver(sync);for(const el of [board,game.querySelector('main'),game.querySelector('.instructions'),game.querySelector('.kdTop')])if(el)resize.observe(el);sync();
})();
