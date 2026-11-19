/* Existing generic Chromium WebView shell only. Never builds or repackages the game. */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{execFileSync}=require('child_process'),{_android}=require('playwright'),H=require('./energy-wave-harness.cjs');
const out=process.env.KD_WAVE_ANDROID_OUT||'/tmp/kd-energy-softglow-android';fs.mkdirSync(out,{recursive:true});
const delay=t=>new Promise(r=>setTimeout(r,t));
let webBounds=null;
async function nativeTap(p,selector){
 await delay(450);
 // The shell toolbar can finish relayout after wm density changes. Read its
 // CURRENT native WebView bounds instead of retaining the first frame's bounds.
 execFileSync('adb',['shell','uiautomator','dump','/sdcard/kd-softglow-ui.xml'],{timeout:15000});
 const xml=execFileSync('adb',['exec-out','cat','/sdcard/kd-softglow-ui.xml']).toString();fs.writeFileSync(path.join(out,'ui.xml'),xml);
 const views=[...xml.matchAll(/<node\b[^>]*class="android\.webkit\.WebView"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g)].map(m=>m.slice(1).map(Number));
 assert(views.length,'Native WebView bounds required');webBounds=views.sort((a,b)=>(b[2]-b[0])*(b[3]-b[1])-(a[2]-a[0])*(a[3]-a[1]))[0];
 const r=await p.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);window.__kdNativeTargetClicked=false;window.__kdNativeActualClick=null;e.addEventListener('click',()=>window.__kdNativeTargetClicked=true,{once:true});document.addEventListener('click',event=>window.__kdNativeActualClick={tag:event.target.tagName,classes:event.target.className,tile:event.target.closest('[data-i]')?.dataset.i,go:event.target.closest('[data-go]')?.dataset.go,x:event.clientX,y:event.clientY},{once:true,capture:true});return {x:r.x+r.width/2,y:r.y+r.height/2,vw:innerWidth,vh:innerHeight,dpr:devicePixelRatio,hit:e===hit||e.contains(hit)}});assert(r.hit,'Intended control must own its DOM hit target');
 const [x,y,right,bottom]=webBounds,scale=(right-x)/r.vw;
 // CSS pixels scale uniformly. Layout viewport height is not a reliable
 // independent Y scale in Android's embedded browser.
 const px=Math.round(x+r.x*scale),py=Math.round(y+r.y*scale);assert(px>=x&&px<right&&py>=y&&py<bottom);
 execFileSync('adb',['shell','input','tap',String(px),String(py)]);
 const deadline=Date.now()+2000;let tapped=false;while(Date.now()<deadline){if(await p.evaluate(()=>window.__kdNativeTargetClicked)){tapped=true;break;}await delay(60);}
 const actual=await p.evaluate(()=>window.__kdNativeActualClick);console.log('Native input proof:',JSON.stringify({selector,bounds:webBounds,css:r,pixel:{x:px,y:py},actual,tapped}));assert(tapped,'Native input must dispatch on intended element: '+JSON.stringify({selector,bounds:webBounds,css:r,px,py,actual}));
}
async function rotate(p,i){const before=await p.evaluate(()=>kdGetLearningState().moves);await nativeTap(p,'#board>.tile[data-i="'+i+'"]');assert.equal(await p.evaluate(()=>kdGetLearningState().moves),before+1,'Real Android tap must rotate exactly once');}

async function surface(name){await delay(450);fs.writeFileSync(path.join(out,name+'.png'),execFileSync('adb',['exec-out','screencap','-p'],{maxBuffer:12e6}));}
(async()=>{const [device]=await _android.devices();assert(device,'Android emulator missing');const report={status:'RUNNING',phoneVerified:false,noGameApkBuilt:true,noAabBuilt:true,previewInjectedIntoGameApk:false,host:'Android system-image built-in org.chromium.webview_shell, HTTP served real source files; no native game bridge',clockControlled:true,capableHardwareSimulated:true,themes:[],errors:[]};try{
 const w=await device.webView({pkg:'org.chromium.webview_shell'}),p=await w.page();p.on('pageerror',e=>report.errors.push(String(e)));report.userAgent=await p.evaluate(()=>navigator.userAgent);
 await H.initialize(p,{base:'http://127.0.0.1:8765/'});console.log('Actual source loaded in system WebView');assert.equal((await H.state(p)).style,'energy-reference-3-softglow');
 for(const theme of ['gold','ice','fire','shadow','emerald','ruby']){
  await H.select(p,1);await H.theme(p,theme);await p.clock.runFor(1800);const m={i:4};await rotate(p,m.i);await p.clock.runFor(900);const f=await H.state(p);assert(f.effects.waves.length&&f.effects.rings.some(r=>r.kind==='bend'));assert(f.effects.rings.every(r=>r.profile==='soft-annular'));assert(f.stats.haloBrushBytes<=216*1024);assert.equal(f.theme,theme);await surface('theme-'+theme);report.themes.push({theme,waves:f.effects.waves.length,rings:f.effects.rings.length});console.log('Surface captured:',theme);fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify(report,null,2));
 }
 await H.select(p,1);await H.theme(p,'gold');await p.clock.runFor(1800);const move={i:4};await rotate(p,move.i);await p.clock.runFor(350);const first=await H.state(p);await surface('wave-early');await p.clock.runFor(550);const middle=await H.state(p);await surface('wave-middle');assert(middle.effects.fronts[0].distance>first.effects.fronts[0].distance);
 await p.locator('#kdPipeFlowCanvas').evaluate(c=>c.style.setProperty('display','none','important'));await surface('wave-metal');await p.locator('#kdPipeFlowCanvas').evaluate(c=>c.style.removeProperty('display'));await p.clock.runFor(1800);await surface('wave-settled');const settled=await H.state(p);assert.equal(settled.effects.waves.length,0);
 const before=await H.snapshot(p);await p.evaluate(()=>{kdNavigate('settings');document.querySelector('[data-setting=glow]').click();kdNavigate('game');kdSetPaused(true)});await p.clock.runFor(100);assert.equal(await p.locator('#kdPipeFlowCanvas').count(),0);await surface('light-off');assert.deepEqual(await H.snapshot(p),before);await p.evaluate(()=>{kdNavigate('settings');document.querySelector('[data-setting=glow]').click();kdNavigate('game');kdSetPaused(true)});await p.clock.runFor(1700);
 const broken=await H.nextMove(p,{breakLink:true});await rotate(p,broken.i);await p.clock.runFor(320);assert.equal((await H.state(p)).fading,0);assert(broken.lost.length>0);const brokenState=await H.state(p);assert(broken.lost.every(id=>!brokenState.edges.some(e=>e.id===id)));await nativeTap(p,'#undo');await p.clock.runFor(1800);assert.deepEqual((await H.snapshot(p)).tiles,before.tiles);
 await H.solve(p);await p.clock.runFor(650);const completion=await H.state(p);assert(completion.wave&&completion.effects.waves.length>0&&completion.effects.waves.every(w=>w.winning));await surface('completion');await p.clock.runFor(1800);assert.equal((await H.state(p)).wave,null);
 // Replay through the real existing result button before testing the board again.
 // A winning modal correctly owns pointer input until it is dismissed.
 await p.locator('.kdWinReplay').dispatchEvent('click');
 await p.emulateMedia({reducedMotion:'reduce'});await H.select(p,1);await rotate(p,(await H.nextMove(p)).i);await p.clock.runFor(200);const reduced=await H.state(p);assert(reduced.static&&reduced.effects.waves.length===0&&reduced.effects.rings.length===0);await surface('reduced-static');
 report.nativeBoardTaps=true;report.nativeUndoTap=true;report.replayViaDOMClick=true;report.status='PASS';Object.assign(report,{first,middle,settled,completion,reduced,viewport:await p.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio})),sourceUrl:p.url()});assert.deepEqual(report.errors,[]);
 execFileSync('adb',['shell','uiautomator','dump','/sdcard/kd-wave-ui.xml']);fs.writeFileSync(path.join(out,'ui.xml'),execFileSync('adb',['exec-out','cat','/sdcard/kd-wave-ui.xml']));
 console.log('PASS: actual Android WebView source preview, 6 themes, moving head/rings, break/undo, off/on, completion and reduced motion. Surface PNG proof verified separately.');
}finally{fs.writeFileSync(path.join(out,'webview-report.json'),JSON.stringify(report,null,2));await device.close()}})().catch(e=>{console.error(e);process.exitCode=1});
