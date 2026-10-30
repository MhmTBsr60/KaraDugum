const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'index.html'),'utf8'),html=source.replace("const savedGame=get64('activeGame',null);","window.__transitionSnapshot=()=>({tiles:tiles.slice(),moves,hints,usedHints,undos,coins:get64('coins',0),xp:get64('xp',0),layer:window.kdExtra.layer});const savedGame=get64('activeGame',null);");
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webp')?'image/webp':file.endsWith('.png')?'image/png':'text/html');res.end(file.endsWith('/index.html')?html:fs.readFileSync(file));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']}),errors=[];try{
 const p=await browser.newPage({viewport:{width:390,height:844},locale:'tr-TR',reducedMotion:'reduce',deviceScaleFactor:3,isMobile:true,hasTouch:true});p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>{window.sentCloud=[];window.KaraNative={syncSave:raw=>sentCloud.push(JSON.parse(raw)),upload(){},achievements(){}}});await p.clock.install({time:new Date('2026-10-30T12:00:00Z')});await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);await p.clock.fastForward(2500);if(await p.locator('.kdDailyClose').count())await p.locator('.kdDailyClose').click();
 await p.evaluate(()=>{localStorage.setItem('kd64_level','300');for(const theme of ['ice','fire','shadow','emerald','ruby'])localStorage.setItem('kd64_shopTheme_'+theme,'true');kdNavigate('shop')});
 await p.locator('[data-shop-theme="ice"]').click();await p.reload();await p.clock.fastForward(2500);assert.equal(await p.locator('html').getAttribute('data-kd-theme'),'ice');
 await p.evaluate(()=>{kdNativeEvent('user',{uid:'transition_account',name:'Theme player'});const data=sentCloud.at(-1);kdNativeEvent('cloudSave',{...data,full:KdCloudModel.merge(null,data.full)})});
 await p.evaluate(()=>{kdSelectLevel(23);kdNavigate('game');kdLearning.open('lesson')});await p.locator('.kdLessonPlay').click();const phase=await p.locator('.kdLessonPhase').innerText(),before=await p.evaluate(()=>__transitionSnapshot()),masks=await p.locator('.kdLessonTile svg').evaluateAll(nodes=>nodes.map(n=>n.dataset.pipeMask));
 for(const theme of ['fire','shadow','emerald','ruby','gold','ice']){
  // Deliver the real cloud restore callback while the demonstration remains open.
  await p.evaluate(theme=>{const data={...sentCloud.at(-1),full:KdCloudModel.merge(null,kdCloud.exportFull())},stamp=KdCloudModel.clock(data.full)+1;for(const key of ['shopActiveTheme','v9_theme'])data.full.state[key]={n:stamp,d:'d_restore',v:theme};kdNativeEvent('cloudSave',data)},theme);
  assert.equal(await p.locator('.kdLessonBoard').getAttribute('data-kd-preview'),theme,'open lesson follows a newly restored theme');
  assert.equal(await p.locator('.kdLessonBoard>.kdBoardOrnament').getAttribute('data-frame-theme'),theme);
  assert(await p.locator('.kdLessonTile svg').evaluateAll((nodes,t)=>nodes.every(n=>n.dataset.pipeTheme===t),theme),'open lesson pipes use the new theme');
  assert.deepEqual(await p.locator('.kdLessonTile svg').evaluateAll(nodes=>nodes.map(n=>n.dataset.pipeMask)),masks,'theme refresh must retain the demonstrated masks');
  assert.equal(await p.locator('.kdLessonPhase').innerText(),phase);assert.deepEqual(await p.evaluate(()=>__transitionSnapshot()),before,'theme refresh must not mutate gameplay');
 }
 // Rotation keeps the same open example and does not advance the paused clock.
 const elapsed=await p.evaluate(()=>kdGetLearningState().elapsed);await p.setViewportSize({width:844,height:390});await p.clock.fastForward(5000);assert.equal(await p.evaluate(()=>kdGetLearningState().elapsed),elapsed);assert.equal(await p.locator('.kdLessonPhase').innerText(),phase);assert.equal(await p.evaluate(()=>kdHandleBack()),true);assert.equal(await p.locator('#kdLearningOverlay').count(),0);
 await p.setViewportSize({width:320,height:568});await p.evaluate(()=>{kdNavigate('home');kdOpenExtras('quests')});
 const rewardState=await p.evaluate(()=>localStorage.getItem('kd64_v9_quest'));
 for(const size of [{width:844,height:390},{width:390,height:844},{width:320,height:568}]){
  await p.setViewportSize(size);assert.equal(await p.locator('.kdV9Row').count(),3);assert.equal(await p.evaluate(()=>localStorage.getItem('kd64_v9_quest')),rewardState);
  const layout=await p.locator('.kdQuestsFull').evaluate(overlay=>{const card=overlay.querySelector('.kdV9Card'),r=overlay.querySelector('#v9Close').getBoundingClientRect();return {scroll:card.scrollHeight-card.clientHeight,width:card.scrollWidth-card.clientWidth,bottom:r.bottom}});assert(layout.scroll<=1&&layout.width<=1&&layout.bottom<=size.height+1,'open task screen stays within the rotated viewport');
 }
 assert.equal(await p.evaluate(()=>kdHandleBack()),true);assert.equal(await p.locator('.kdV9Overlay').count(),0);
 await p.evaluate(()=>kdNavigate('shop'));await p.evaluate(()=>document.documentElement.setAttribute('data-kd-theme','fire'));
 assert(await p.locator('.kdLivePreview').evaluateAll(previews=>previews.every(preview=>[...preview.querySelectorAll('.kdSculptedPipe')].every(pipe=>pipe.dataset.pipeTheme===preview.dataset.kdPreview))),'store previews retain their independent theme palettes');
 assert.deepEqual(errors,[]);console.log('PASS: stored theme survives reload; an open lesson follows six cloud theme restores without losing its phase, masks or game state; store palettes remain independent; rotation preserves the paused example and full-screen quest state/back navigation');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
