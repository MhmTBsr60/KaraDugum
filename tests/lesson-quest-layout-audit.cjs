const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'index.html'),'utf8'),html=source.replace("const savedGame=get64('activeGame',null);","window.__layoutSnapshot=()=>({tiles:tiles.slice(),moves,hints,usedHints,undos,coins:get64('coins',0),xp:get64('xp',0),layer:window.kdExtra.layer});const savedGame=get64('activeGame',null);");
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webp')?'image/webp':file.endsWith('.png')?'image/png':'text/html');res.end(file.endsWith('/index.html')?html:fs.readFileSync(file));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']}),errors=[];try{
 const p=await browser.newPage({viewport:{width:390,height:844},locale:'tr-TR',reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));
 await p.clock.install({time:new Date('2026-10-30T12:00:00Z')});await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);await p.clock.fastForward(2500);if(await p.locator('.kdDailyClose').count())await p.locator('.kdDailyClose').click();
 const screenshots=process.env.AUDIT_SCREENSHOTS;if(screenshots)fs.mkdirSync(screenshots,{recursive:true});
 const paint=()=>p.evaluate(()=>{const sample=tile=>{const css=getComputedStyle(tile),core=getComputedStyle(tile.querySelector('.kdPipeCore'));return {image:css.backgroundImage,size:css.backgroundSize,position:css.backgroundPosition,width:core.strokeWidth,color:core.stroke,energy:getComputedStyle(tile.querySelector('.kdPipeEnergy')).stroke}};return {game:sample(document.querySelector('#board>.tile')),demo:sample(document.querySelector('.kdLessonBoard>.tile'))}});
 const questMetrics=()=>p.locator('.kdV9Overlay').evaluate(overlay=>{const card=overlay.querySelector('.kdV9Card'),targets=[...overlay.querySelectorAll('.kdV9Row,.kdQuestFinale,#v9Close,.kdModernExtraBack')];return {outer:overlay.scrollHeight-overlay.clientHeight,card:card.scrollHeight-card.clientHeight,horizontal:card.scrollWidth-card.clientWidth,outside:targets.filter(el=>{const r=el.getBoundingClientRect();return r.top<0||r.bottom>innerHeight+1||r.left<0||r.right>innerWidth+1}).map(el=>el.className),clipped:targets.filter(el=>el.scrollHeight>el.clientHeight+1).map(el=>el.className)}});
 for(const theme of ['gold','ice','fire','shadow','emerald','ruby'])for(const level of [1,23,53,83,233]){
  await p.evaluate(({theme,level})=>{localStorage.setItem('kd64_level','300');document.documentElement.setAttribute('data-kd-theme',theme);kdSelectLevel(level);kdNavigate('game')},{theme,level});const before=await p.evaluate(()=>__layoutSnapshot());await p.evaluate(()=>kdLearning.open('lesson'));
  assert.deepEqual((await paint()).demo,(await paint()).game,`${theme}/${level}: demonstration uses the live board texture and pipe palette/width`);
  assert.equal(await p.locator('.kdLessonBoard>.kdBoardOrnament').getAttribute('data-frame-theme'),theme);
  await p.locator('.kdLessonPlay').click();assert.deepEqual((await paint()).demo,(await paint()).game,`${theme}/${level}: affected cells retain the stone texture after demonstration`);assert.deepEqual(await p.evaluate(()=>__layoutSnapshot()),before,'demonstration changed gameplay');
  if(screenshots&&level===23&&['ice','fire'].includes(theme))await p.screenshot({path:path.join(screenshots,`lesson-${theme}-v631.png`)});
  await p.locator('.kdLearningClose').click();
 }
 for(const size of [{width:320,height:568},{width:360,height:640},{width:390,height:844},{width:412,height:915},{width:576,height:1280},{width:844,height:390}]){
  await p.setViewportSize(size);await p.evaluate(()=>{document.documentElement.setAttribute('data-kd-theme','fire');kdSelectLevel(21);kdNavigate('game')});
  const stars=await p.locator('.kdStarGoalButton').evaluate(button=>{const b=button.getBoundingClientRect(),r=button.parentElement.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(button);const text=range.getBoundingClientRect(),help=button.previousElementSibling.getBoundingClientRect();return {fits:text.left>=b.left&&text.right<=b.right,inside:b.left>=r.left&&b.right<=r.right,overlap:Math.min(b.right,help.right)-Math.max(b.left,help.left)>0,viewport:b.right<=innerWidth}});
  assert(stars.fits&&stars.inside&&!stars.overlap&&stars.viewport,`three-star goal button overflow at ${size.width}x${size.height}: ${JSON.stringify(stars)}`);
  await p.locator('.kdStarGoalButton').click();assert(await p.locator('.kdStarGoals').isVisible());await p.locator('.kdLearningClose').click();
  if(screenshots&&size.width===390)await p.screenshot({path:path.join(screenshots,'game-stars-v631.png')});
  for(const date of ['2026-10-29','2026-10-30','2026-10-31','2026-11-01']){
   await p.evaluate(date=>{const today=new Date().toLocaleDateString('en-CA');localStorage.setItem('kd64_v9_quest',JSON.stringify({date:today,tasks:kdProgression.choose(date),baseline:{wins:0,moves:0,perfect:0,time:0},claimed:{}}));localStorage.setItem('kd64_questFinaleClaims','{}');for(const field of ['wins','moves','perfect','time'])localStorage.setItem('kd64_'+field,'0');kdNavigate('home');kdOpenExtras('quests')},date);
   const metrics=await questMetrics();
   assert(metrics.outer<=1&&metrics.card<=1&&metrics.horizontal<=1&&!metrics.outside.length&&!metrics.clipped.length,`quests must fit ${size.width}x${size.height}/${date}: ${JSON.stringify(metrics)}`);
   assert.equal(await p.locator('.kdV9Row').count(),3);assert(await p.locator('.kdQuestFinale').isVisible());assert(await p.locator('.kdQuestFinale button').isDisabled());
   if(screenshots&&date==='2026-10-30'&&[320,390,844].includes(size.width))await p.screenshot({path:path.join(screenshots,`quests-${size.width}-v631.png`)});
   await p.locator('#v9Close').click();
  }
 }
 // All supported translations keep the same compact task layout, including RTL.
 await p.setViewportSize({width:320,height:568});
 const languages=Object.keys(await p.evaluate(()=>kdLocalization.languages));assert.equal(languages.length,25);for(const language of languages){
  await p.evaluate(language=>{localStorage.setItem('kd6_lang',language);kdSelectLevel(21);kdNavigate('game')},language);
  const fits=await p.locator('.kdStarGoalButton').evaluate(button=>{const b=button.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(button);const t=range.getBoundingClientRect();return t.left>=b.left&&t.right<=b.right&&b.left>=0&&b.right<=innerWidth});assert(fits,'translated star button: '+language);
  await p.evaluate(()=>{kdNavigate('home');kdOpenExtras('quests')});const m=await questMetrics();assert(m.outer<=1&&m.card<=1&&m.horizontal<=1&&!m.outside.length&&!m.clipped.length,'translated full-screen quests '+language+': '+JSON.stringify(m));await p.locator('#v9Close').click();
 }
 await p.evaluate(()=>{localStorage.setItem('kd6_lang','tr');kdNavigate('home')});
 // The compact layout still grants each task and finale exactly once.
 await p.setViewportSize({width:320,height:568});await p.evaluate(()=>{for(const field of ['wins','moves','perfect','time'])localStorage.setItem('kd64_'+field,'1000');kdOpenExtras('quests')});const beforeCoins=await p.evaluate(()=>+localStorage.getItem('kd64_coins')),rewards=await p.evaluate(()=>kdProgression.tasks(JSON.parse(localStorage.getItem('kd64_v9_quest'))).reduce((n,t)=>n+t[4],0));for(let i=0;i<3;i++)await p.locator('.kdV9Row button').nth(i).click();assert(await p.locator('.kdQuestFinale button').isEnabled());await p.locator('.kdQuestFinale button').click();assert.equal(await p.evaluate(()=>+localStorage.getItem('kd64_coins')),beforeCoins+rewards+20);assert(await p.locator('.kdQuestFinale button').isDisabled());await p.locator('.kdModernExtraBack').click();assert.equal(await p.locator('.kdV9Overlay').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: six lesson themes match live 4x4–8x8 boards before/after without gameplay mutation; three-star button fits six viewports; all four daily task groups and final reward fit one screen; 25 languages/RTL and reward controls remain usable');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
