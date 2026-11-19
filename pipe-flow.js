/* Connection-energy design preview. Sole authority: engine masks + fog from kdLessonPreview.
   No storage, puzzle mutation, input handlers, sound, haptic, reward or network writes. */
(()=>{'use strict';
 const board=document.getElementById('board'),game=document.getElementById('kdGame');if(!board||!game||!window.kdConnectionModel)return;
 const canvas=document.createElement('canvas');canvas.className='kdPipeFlowCanvas';canvas.id='kdPipeFlowCanvas';canvas.setAttribute('aria-hidden','true');
 const ctx=canvas.getContext('2d'),reduce=matchMedia('(prefers-reduced-motion: reduce)');if(!ctx)return;
 const palettes={gold:['#ffd35d','#fff4c8'],ice:['#b9e4ff','#f3fcff'],fire:['#ffc568','#fff1c0'],shadow:['#d1a5ff','#f7e9ff'],emerald:['#78efb6','#e0ffe8'],ruby:['#ff9e71','#fff0ce']};
 const whites={gold:'#fffef5',ice:'#ffffff',fire:'#fffdf5',shadow:'#fffcff',emerald:'#fafffd',ruby:'#fffdf8'},NORMAL_MS=1400,WIN_MS=900;
 const low=(navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=4)||(navigator.deviceMemory>0&&navigator.deviceMemory<=4)||matchMedia('(update: slow)').matches;
 let values=[],net={edges:[],ports:[],ranks:[],maxRank:0},key='',theme='gold',rect=null,boxes=[],segments=[],frame=0,lastFrame=0,wave=null,lastRun='',revision=0,fading=[];
 let stats={frames:0,paintMs:[],updates:0,geometryReads:0};const joined=new Map();
 const enabled=()=>!document.body.classList.contains('kdNoGlow');
 const staticOnly=()=>reduce.matches||low||document.documentElement.hasAttribute('data-kd-gold-low-motion');
 const blocked=()=>game.hidden||document.hidden||!!window.kdOnboarding?.isOpen()||!!window.kdLearning?.isOpen()||!!window.kdStorage?.isOpen?.()||!!window.kdAdPrivacyBusy||!!document.querySelector('.kdRuleHelpOverlay,.kdDailyOverlay');
 const stop=()=>{cancelAnimationFrame(frame);frame=0;canvas.remove();if(document.body.classList.contains('kdFlowCelebrating'))document.body.classList.remove('kdFlowCelebrating');};
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
 function refreshSegments(){segments=[];for(const e of net.edges){const a=arm(values[e.a],e.bit),b=arm(values[e.b],e.opp);let points=[...line(e.a,a,true),...line(e.b,b)];const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));const rank=Math.min(net.ranks[e.a],net.ranks[e.b]);if(net.ranks[e.a]>net.ranks[e.b]){points=points.reverse();lengths.length=0;lengths.push(0);for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));}segments.push({...e,points,lengths,length:lengths.at(-1),rank,width:Math.min(boxes[e.a].w,boxes[e.b].w)/100});}}
 function trace(points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));}
 function dot(s,t){const d=Math.max(0,Math.min(1,t))*s.length;let k=1;while(k<s.lengths.length-1&&s.lengths[k]<d)k++;const f=(d-s.lengths[k-1])/Math.max(.001,s.lengths[k]-s.lengths[k-1]);return [s.points[k-1][0]+(s.points[k][0]-s.points[k-1][0])*f,s.points[k-1][1]+(s.points[k][1]-s.points[k-1][1])*f];}
 function portion(s,from,to){const a=Math.max(0,from),b=Math.min(1,to);if(b<=a)return [];const points=[dot(s,a)];for(let i=1;i<s.lengths.length-1;i++)if(s.lengths[i]>a*s.length&&s.lengths[i]<b*s.length)points.push(s.points[i]);points.push(dot(s,b));return points;}
 function render(now){frame=0;if(!enabled()||blocked()||!rect){stop();return;}const start=performance.now(),flat=staticOnly();let moving=false;ctx.clearRect(0,0,rect.width,rect.height);ctx.lineCap='round';ctx.lineJoin='round';const [color,core]=palettes[theme]||palettes.gold;
  for(const s of segments){const age=Math.max(0,now-(joined.get(s.id)??-1e9)),rise=flat?1:Math.min(1,Math.max(0,age/360));
   trace(s.points);ctx.globalAlpha=.26*rise;ctx.lineWidth=9*s.width;ctx.strokeStyle=color;ctx.stroke();ctx.globalAlpha=.70*rise;ctx.lineWidth=3.2*s.width;ctx.stroke();
   const completion=wave?(now-wave.start)-s.rank*wave.step:-1,winning=completion>=0&&completion<WIN_MS;
   const pulse=!flat&&(age>=0&&age<NORMAL_MS||winning);if(pulse){const t=winning?completion/WIN_MS:age/NORMAL_MS,travel=t*t*(3-2*t),head=travel*1.24,trail=portion(s,head-.24,head),envelope=Math.min(1,t/.10,(1-t)/.16);
    if(trail.length){trace(trail);ctx.globalAlpha=.88*envelope;ctx.strokeStyle=color;ctx.lineWidth=(winning?8.5:7.2)*s.width;ctx.stroke();
     // A narrow dark gold channel separates the white-hot core from the gold metal.
     // Every stroke is confined to the existing matched pipe's centre path.
     ctx.globalAlpha=.84*envelope;ctx.strokeStyle='#302314';ctx.lineWidth=(winning?6.5:5.6)*s.width;ctx.stroke();ctx.globalAlpha=envelope;ctx.strokeStyle=whites[theme]||whites.gold;ctx.lineWidth=(winning?3.8:3)*s.width;ctx.stroke();const position=trail.at(-1);ctx.beginPath();ctx.arc(position[0],position[1],Math.max(.7,1.7*s.width),0,Math.PI*2);ctx.fillStyle=whites[theme]||whites.gold;ctx.fill();}moving=true;}

   // The actual reciprocal port junction, never an unmatched end.
   const a=boxes[s.a],b=boxes[s.b],x=(s.bit===2?a.x+a.w:(a.x+a.w/2)),y=(s.bit===4?a.y+a.h:a.y+a.h/2),xx=s.bit===2?b.x:b.x+b.w/2,yy=s.bit===4?b.y:b.y+b.h/2;
   ctx.globalAlpha=.72*rise;ctx.strokeStyle=core;ctx.lineWidth=5.5*s.width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke();if(!flat&&age>=0&&age<NORMAL_MS)moving=true;
  }
  fading=flat?[]:fading.filter(f=>now-f.start<180);for(const f of fading){trace(f.points);ctx.globalAlpha=.35*(1-(now-f.start)/180);ctx.lineWidth=3*f.width;ctx.strokeStyle=color;ctx.stroke();moving=true;}ctx.globalAlpha=1;if(wave){if(flat||now>wave.start+wave.duration){wave=null;if(document.body.classList.contains('kdFlowCelebrating'))document.body.classList.remove('kdFlowCelebrating');}else moving=true;}
  stats.frames++;stats.paintMs.push(performance.now()-start);if(stats.paintMs.length>240)stats.paintMs.shift();if(moving)schedule();
 }
 function schedule(){if(frame||blocked()||!enabled())return;const interval=net.ports.length>=49?50:33;frame=requestAnimationFrame(now=>{if(now-lastFrame<interval){frame=0;schedule();return;}lastFrame=now;render(now);});}
 function update(host,masks){if(host!==board)return;const learning=window.kdLessonPreview?.(),state=window.kdGetLearningState?.();if(!learning||!state)return;const oldValues=values.slice(),oldSegments=segments.slice();values=Array.from(masks||learning.before);const nextKey=[state.level,state.daily?.date||'',window.kdExtra?.layer||0,values.length].join('|'),now=performance.now(),changed=nextKey!==key;
  if(changed){key=nextKey;joined.clear();wave=null;lastRun='';fading=[];}
  const next=kdConnectionModel.graph(values,learning.n,learning.flags.fog);if(!changed&&!staticOnly())for(const old of oldSegments)if(!next.edges.some(e=>e.id===old.id))for(const [cell,bit] of [[old.a,old.bit],[old.b,old.opp]])if(values[cell]===oldValues[cell]&&!learning.flags.fog[cell]&&boxes[cell])fading.push({points:line(cell,arm(values[cell],bit)),width:old.width,start:now});for(const e of next.edges)if(!joined.has(e.id))joined.set(e.id,changed?-1e9:now);for(const id of joined.keys())if(!next.edges.some(e=>e.id===id))joined.delete(id);net=next;theme=document.documentElement.dataset.kdTheme||'gold';revision++;stats.updates++;
  if(!enabled()||blocked()){stop();return;}
  // Completion is reported by the existing engine/reward flow, not inferred from lit ports.
  if(!state.locked&&lastRun){lastRun='';wave=null;if(document.body.classList.contains('kdFlowCelebrating'))document.body.classList.remove('kdFlowCelebrating');}const run=state.locked&&window.kdLastWin?.id;if(run&&run!==lastRun){lastRun=run;const duration=staticOnly()?0:Math.min(2200,Math.max(1050,net.maxRank*70+WIN_MS));wave={start:now,step:net.maxRank?(duration-WIN_MS)/net.maxRank:0,duration};document.body.classList.add('kdFlowCelebrating');}
  cancelAnimationFrame(frame);frame=requestAnimationFrame(time=>{frame=0;if(!enabled()||blocked()){stop();return;}if(!geometry())return;refreshSegments();if(!canvas.isConnected)document.documentElement.appendChild(canvas);render(time);});
 }
 // A broken link never emits new energy. Its unchanged neighbour's real pipe fades for
 // 180 ms; rotated-away arms vanish immediately, so no stale line crosses the stone.
 function sync(){if(!enabled()||blocked()){stop();return;}update(board,values.length?values:undefined);}
 window.kdPipeFlow={afterRender:update,state:()=>({enabled:enabled(),static:staticOnly(),theme,revision,key,edges:net.edges.map(e=>({...e})),ports:net.ports.slice(),ranks:net.ranks.slice(),wave:wave?{...wave}:null,fading:fading.length,canvas:canvas.isConnected,rect:rect?{...rect}:null,segments:segments.map(s=>({id:s.id,points:s.points.map(p=>p.slice())})),stats:{...stats,paintMs:stats.paintMs.slice()},renderer:'root-canvas2d',style:'contrast-2',phoneVerified:false})};
 try{window.KaraNative?.setTapLightEnabled?.(false);window.KaraNative?.cancelTapLight?.(0);}catch(_){}
 new MutationObserver(sync).observe(game,{attributes:true,attributeFilter:['hidden']});new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});new MutationObserver(()=>{update(board);}).observe(document.documentElement,{attributes:true,attributeFilter:['data-kd-theme']});
 new MutationObserver(sync).observe(document.body,{childList:true});reduce.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);window.addEventListener('resize',sync);window.addEventListener('scroll',sync,{passive:true});const resize=new ResizeObserver(sync);for(const el of [board,game.querySelector('main'),game.querySelector('.instructions'),game.querySelector('.kdTop')])if(el)resize.observe(el);sync();
})();
