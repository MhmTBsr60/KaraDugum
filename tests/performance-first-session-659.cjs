/* Fresh install smoke: measure the first playable session without analytics or personal data. */
'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),raw=fs.readFileSync(path.join(root,'index.html'),'utf8'),hook="const savedGame=get64('activeGame',null);";
const served=raw.replace(hook,"window.__firstSessionAudit={plan:rotationPlan,locked:()=>locked};"+hook);
assert.notEqual(raw,served);
const icon=fs.readFileSync(path.join(root,'android-icons/runtime-icon-512.png'));
assert.equal(icon.readUInt32BE(16),512);assert.equal(icon.readUInt32BE(20),512);
const build=fs.readFileSync(path.join(root,'scripts/prepare-android-rc.sh'),'utf8');
assert(build.includes('minifyEnabled true')&&build.includes('shrinkResources true')&&build.includes("getDefaultProguardFile('proguard-android-optimize.txt')"));
const mime={'.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.html':'text/html'};
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');res.end(f===path.join(root,'index.html')?served:fs.readFileSync(f))});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});try{
 for(const viewport of [{width:320,height:568},{width:390,height:844}]){
  const ctx=await browser.newContext({viewport,locale:'tr-TR',hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  await ctx.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:')?r.continue():r.abort());
  const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  const start=performance.now();await p.goto('http://127.0.0.1:'+server.address().port+'/index.html');await p.locator('#kdSplash').waitFor({state:'detached'});
  const reward=await p.locator('.kdDailyClose').isVisible();if(reward)await p.locator('.kdDailyClose').tap();
  await p.locator('.kdHotPlay').waitFor({state:'visible'});const menuReadyMs=Math.round(performance.now()-start);
  const dims=await p.evaluate(async()=>{const out={};for(const n of ['kara-dugum-home-icons.webp','kara-dugum-theme-stones.webp']){const i=new Image();i.src='assets/'+n;await i.decode();out[n]=[i.naturalWidth,i.naturalHeight]}return out});
  assert.deepEqual(dims,{'kara-dugum-home-icons.webp':[1000,1000],'kara-dugum-theme-stones.webp':[1152,768]});
  await p.locator('.kdHotPlay').tap();await p.locator('#kdOnboardingOverlay').waitFor({state:'visible'});
  const tutorialSteps=4;
  for(let i=0;i<tutorialSteps;i++){await p.locator('[data-onboard-next]').tap();if(i<tutorialSteps-1)await p.locator('#kdOnboardingOverlay').waitFor({state:'visible'});}
  await p.locator('#kdOnboardingOverlay').waitFor({state:'detached'});
  await p.evaluate(()=>{if(window.kdLearning?.isOpen())kdLearning.leave()});
  const readyMs=Math.round(performance.now()-start);
  // Solve using the real planner and ordinary game tile events.
  await p.evaluate(()=>{const plan=__firstSessionAudit.plan();if(!plan||!plan.length)throw Error('First level has no legal solution');for(const i of plan){if(__firstSessionAudit.locked())break;document.querySelector('#board .tile[data-i="'+i+'"]').click();}});
  const win=await p.evaluate(()=>({level:kdLastWin?.level,star:kdLastWin?.star,saved:JSON.parse(localStorage.getItem('kd64_completed')||'{}')[1]}));
  assert.equal(win.level,1);assert(win.star>=1);assert.equal(win.saved,win.star);
  await p.reload();await p.locator('#kdSplash').waitFor({state:'detached'});
  assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('kd64_completed')||'{}')[1]),win.star);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({viewport,menuReadyMs,tutorialSteps,rewardDialog:reward,playableMs:readyMs,level1Complete:true,saveAfterReload:true,errors}));
  await ctx.close();
 }
 console.log('PASS: R8 and resource shrinking remain enabled; smaller artwork; fresh install → reward → tutorial → level 1 → restart preserved');
}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
