/* Synthetic CPU comparison, not Android FPS/ANR certification. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,serve,init,variant}=require('./harness.cjs');
const summary=a=>{a.sort((a,b)=>a-b);return {medianMs:a[Math.floor(a.length/2)],p95Ms:a[Math.min(a.length-1,Math.floor(a.length*.95))],maxMs:a.at(-1)}};
(async()=>{const {server,url}=await serve(),b=await chromium.launch({args:['--no-sandbox']});const report={scope:'Chromium CPU throttling, 40 real tile dispatches/scene; forced layout, two RAF; not Android/GPU measurements',scenes:[],errors:[]},states={};
try{for(const profile of [{id:'compact-6x',width:320,height:568,cpu:6},{id:'standard-4x',width:390,height:844,cpu:4}])for(const level of [53,91,151])for(const name of ['current','A','final']){
 const p=await init(b,url,'tr',{width:profile.width,height:profile.height},{realClock:true});p.on('pageerror',e=>report.errors.push(e.message));
 const c=await p.context().newCDPSession(p);await c.send('Emulation.setCPUThrottlingRate',{rate:profile.cpu});await p.emulateMedia({reducedMotion:'no-preference'});
 await p.evaluate(level=>{kdSelectLevel(level);kdNavigate('game');kdLearning.leave();document.body.classList.remove('kdNoGlow');},level);await variant(p,name);
 if(name!=='final')await p.evaluate(()=>kdFinalPreview.destroy());
 await c.send('HeapProfiler.collectGarbage');const heapBefore=await c.send('Runtime.getHeapUsage');
 const data=await p.evaluate(async()=>{
  const handlers=[],frames=[],nodes=[...document.querySelectorAll('#board>.tile')];
  for(let i=0;i<40;i++){const cells=[...document.querySelectorAll('#board>.tile:not(.good)')],t=performance.now();cells[(i*7+3)%cells.length].click();document.getElementById('board').getBoundingClientRect();handlers.push(performance.now()-t);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));frames.push(performance.now()-t);}
  const syncs=window.kdFinalPreview?.stats().syncs;await new Promise(r=>setTimeout(r,180));
  return {handlers,frames,observerIdle:syncs===window.kdFinalPreview?.stats().syncs,retained:nodes.filter((e,i)=>document.querySelectorAll('#board>.tile')[i]===e).length,total:nodes.length,state:{level:kdGetLearningState().level,moves:kdGetLearningState().moves,masks:[...document.querySelectorAll('#board>.tile')].map(e=>e.dataset.pipe),resources:Object.fromEntries(['coins','xp','hintCoupons','completed'].map(k=>[k,localStorage.getItem('kd64_'+k)]))}};
 });
 await c.send('HeapProfiler.collectGarbage');const heapAfter=await c.send('Runtime.getHeapUsage');
 assert.equal(data.retained,data.total);assert(data.observerIdle);const key=profile.id+'/'+level;if(name==='current')states[key]=data.state;else assert.deepEqual(data.state,states[key]);
 const scene={profile:profile.id,level,variant:name,handler:summary(data.handlers),dispatchToSecondFrame:summary(data.frames),retainedCells:data.retained,observerIdle:true,gcHeapDeltaBytes:heapAfter.usedSize-heapBefore.usedSize};report.scenes.push(scene);console.log(JSON.stringify(scene));await p.close();
}assert.deepEqual(report.errors,[]);report.status='pass';}finally{fs.writeFileSync(path.join(__dirname,'benchmark.json'),JSON.stringify(report,null,2));await b.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1});
