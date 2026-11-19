'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{execFileSync}=require('child_process'),{chromium}=require('playwright'),H=require('./energy-wave-harness.cjs');
const out=process.env.KD_WAVE_REPORT||path.join(H.root,'design/energy-forged-preview/tests');fs.mkdirSync(out,{recursive:true});
const report={status:'RUNNING',phoneVerified:false,androidWebViewVerified:false,checks:[],themes:[],campaign:null,errors:[],scope:'Four layer passes, real Chromium engine and pipe geometry; controlled test time and synthetic player/device data. No APK build.'};
for(const f of ['connection-model.js','board-renderer.js','feedback.js','onboarding.js','onboarding.css','wheel.js','cloud-model.js','cloud-sync.js','reward-receipts.js','HapticFeedbackPlayer.java','UiFeedbackGate.java','MainActivity.java','AndroidManifest.xml','admob-units.json'])assert.deepEqual(fs.readFileSync(path.join(H.root,f)),execFileSync('git',['show','dd29df6:'+f],{cwd:H.root}),f);
(async()=>{const b=await chromium.launch({args:['--no-sandbox']});try{
 const p=await b.newPage({viewport:{width:430,height:932},deviceScaleFactor:2});p.on('pageerror',e=>report.errors.push(String(e)));
 await p.addInitScript(()=>{const draw=CanvasRenderingContext2D.prototype.drawImage;window.__softHaloBrush={};CanvasRenderingContext2D.prototype.drawImage=function(image,...args){const theme=document.documentElement.dataset.kdTheme;if(this.canvas.id==='kdPipeFlowCanvas'&&image instanceof HTMLCanvasElement&&image.width===96&&image.height===96&&!window.__softHaloBrush[theme]){const c=image.getContext('2d'),data=c.getImageData(0,0,96,96).data;window.__softHaloBrush[theme]={png:image.toDataURL(),alpha:Array.from({length:48},(_,i)=>data[(48*96+48+i)*4+3])};}return draw.call(this,image,...args)}});
 await H.initialize(p,{query:'?energyPreview=1'});
 report.campaign=await p.evaluate(()=>{let edges=0;const errors=[];for(let n=1;n<=300;n++){kdSelectLevel(n);const s=kdLessonPreview(),actual=kdPipeFlow.state(),saved=JSON.parse(localStorage.getItem('kd64_activeGame'));const expected=kdConnectionModel.graph(saved.tiles,s.n,saved.fog);if(JSON.stringify(expected.edges)!==JSON.stringify(actual.edges))errors.push(n);edges+=actual.edges.length;}return {levels:300,edges,errors};});assert.deepEqual(report.campaign.errors,[]);await H.select(p,1);await p.clock.runFor(1800);
 for(const theme of ['gold','ice','fire','shadow','emerald','ruby']){
  await H.select(p,1);await H.theme(p,theme);await p.clock.runFor(1800);const initial=await H.snapshot(p),move={i:4};await H.rotate(p,move.i);const afterMove=await H.snapshot(p);
  await p.clock.runFor(350);const early=await H.state(p);await p.clock.runFor(550);const middle=await H.state(p);assert.equal(middle.style,'energy-reference-3-layered');assert.equal(middle.theme,theme);assert(middle.effects.waves.length>0&&middle.effects.rings.length>0);
  assert.equal(early.effects.rings.length,0,'Rings must wait for the actual elbow crossing');
  assert(early.effects.reflections.length && middle.effects.reflections.length);
  assert.notDeepEqual(middle.effects.reflections[0].center,early.effects.reflections[0].center);
  assert(middle.effects.reflections.every(r=>r.crossRadius<r.radius&&Number.isFinite(r.angle)));
  assert(middle.effects.reflections.every(r=>middle.edges.some(edge=>edge.id===r.id)));
  const first=early.effects.fronts[0],second=middle.effects.fronts[0];assert(first&&second&&second.distance>first.distance+10);
  assert(middle.effects.waves.every(w=>Math.abs(w.channelWidth/w.pipeInnerWidth-.88)<.01));
  assert(middle.effects.rings.every(r=>r.kind==='bend'&&r.profile==='annular-ridge'));assert(middle.effects.rings.some(r=>r.kind==='bend'&&r.cell===4),'Real fully matched elbow must emit outward rings');
  assert(middle.effects.waves.some(w=>early.edges.some(e=>e.id===w.id)&&w.id!=='4:8'),'Energy must propagate beyond the newly joined edge into the real component');
  assert.deepEqual(await H.snapshot(p),afterMove,'Energy animation cannot mutate saves or economy');
  assert(middle.effects.waves.every(w=>middle.edges.some(e=>e.id===w.id)));assert(middle.effects.rings.every(w=>middle.edges.some(e=>e.id===w.id)));
  const brush=await p.evaluate(theme=>window.__softHaloBrush[theme],theme);assert(brush);assert.equal(brush.alpha[0],0);assert(brush.alpha.at(-1)<3);const levels=new Set(brush.alpha.filter(a=>a>0));assert(levels.size>=10,'Halo needs a graded edge, not a solid target circle');assert(Math.max(...brush.alpha)<=240);fs.writeFileSync(path.join(out,'halo-brush-'+theme+'.png'),Buffer.from(brush.png.split(',')[1],'base64'));report.checks.push({theme,haloGradientAlphaLevels:levels.size,haloPeakAlpha:Math.max(...brush.alpha)});assert(middle.stats.haloBrushBytes<=216*1024);
  await p.screenshot({path:path.join(out,'theme-'+theme+'.png'),animations:'allow'});fs.writeFileSync(path.join(out,'theme-'+theme+'-state.json'),JSON.stringify(middle));
  await p.locator('#kdPipeFlowCanvas').evaluate(c=>c.style.setProperty('display','none','important'));await p.screenshot({path:path.join(out,'theme-'+theme+'-metal.png')});await p.locator('#kdPipeFlowCanvas').evaluate(c=>c.style.removeProperty('display'));
  for(const layer of ['channel','wave','rings','settled']){
   await p.evaluate(layer=>kdPipeFlow.showLayer(layer),layer);
   const pass=(await H.state(p)).effects.layers;
   assert(pass[layer]>0&&Object.entries(pass).every(([name,count])=>name===layer||count===0));
   assert.deepEqual(await H.snapshot(p),afterMove);
  }
  await p.evaluate(()=>kdPipeFlow.showLayer('all'));
  const expanded=middle.effects.rings.find(r=>r.cell===4);
  await p.clock.runFor(140);
  const lateRing=(await H.state(p)).effects.rings.find(r=>r.cell===4);
  assert(expanded && lateRing && lateRing.haloOuterRadius>expanded.haloOuterRadius,'Real elbow halo must expand as time advances');
  await p.clock.runFor(1900);const settled=await H.state(p);assert.equal(settled.effects.waves.length,0);assert.equal(settled.effects.rings.length,0);assert.equal(settled.effects.reflections.length,0);assert(settled.canvas);const frame=settled.stats.frames;await p.clock.runFor(400);assert.equal((await H.state(p)).stats.frames,frame,'No perpetual settled animation');
  const broken=await H.nextMove(p,{breakLink:true});await H.rotate(p,broken.i);assert(broken.lost.length>0);const brokenState=await H.state(p);assert(broken.lost.every(id=>!brokenState.edges.some(e=>e.id===id)));await p.clock.runFor(320);assert.equal((await H.state(p)).fading,0);const afterBreak=await H.snapshot(p);await p.locator('#undo').click();assert.deepEqual((await H.snapshot(p)).tiles,afterMove.tiles);assert.equal((await H.snapshot(p)).coins,initial.coins);assert.equal((await H.snapshot(p)).hints,initial.hints);assert(afterBreak.game.moves>afterMove.game.moves);
  const beforeOff=await H.snapshot(p);await p.evaluate(()=>{kdNavigate('settings');document.querySelector('[data-setting=glow]').click();kdNavigate('game');kdSetPaused(true)});await p.clock.runFor(100);assert.equal((await H.state(p)).enabled,false);assert.equal(await p.locator('#kdPipeFlowCanvas').count(),0);assert.equal((await H.state(p)).effects.reflections.length,0);assert.deepEqual(await H.snapshot(p),beforeOff);await p.evaluate(()=>{kdNavigate('settings');document.querySelector('[data-setting=glow]').click();kdNavigate('game');kdSetPaused(true)});await p.clock.runFor(1800);assert((await H.state(p)).canvas);report.themes.push({theme,frontEarly:first.distance,frontMiddle:second.distance,ringCount:middle.effects.rings.length,stationaryFrames:frame,joinBreakUndoOffOn:true});
 }
 await H.select(p,1);await H.solve(p);await p.clock.runFor(100);const start=await H.state(p);assert(start.wave);assert(start.effects.waves.every(w=>w.winning));const ranks=start.ranks;assert(new Set(ranks.filter(r=>r>=0)).size>1);await p.clock.runFor(650);const progressed=await H.state(p);assert(progressed.effects.waves.some(w=>!start.effects.waves.some(a=>a.id===w.id)),'BFS completion reaches later edges');await p.clock.runFor(1800);assert.equal((await H.state(p)).wave,null);assert.equal(await p.evaluate(()=>document.body.classList.contains('kdFlowCelebrating')),false);assert(await p.locator('.kdWinPanel').isVisible());report.checks.push('bounded ordered engine-win wave; unchanged result panel revealed after wave');
 for(const config of [{low:true},{reduce:true}]){
  const q=await b.newPage({viewport:{width:320,height:568}});await H.initialize(q,config);const move=await H.nextMove(q);await H.rotate(q,move.i);await q.clock.runFor(100);const flat=await H.state(q);assert(flat.static);assert.equal(flat.effects.waves.length,0);assert.equal(flat.effects.rings.length,0);assert.equal(flat.effects.reflections.length,0);await q.clock.runFor(500);assert.equal((await H.state(q)).stats.frames,flat.stats.frames);await H.solve(q);await q.clock.runFor(150);assert.equal((await H.state(q)).wave,null);assert(await q.locator('.kdWinPanel').isVisible());report.checks.push(config.low?'low hardware: static light, no animation loop, result immediate':'reduced motion: static light, no rings/wave, result immediate');await q.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';console.log(JSON.stringify(report,null,2));
}finally{fs.writeFileSync(path.join(out,'wave-audit.json'),JSON.stringify(report,null,2));await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
