/* Render the unchanged 6.36 WebView UI with an isolated, illustrative local save. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),version='6.36',sourceCommit='6c57c65aea9e6fbcb7e22ae75027687aa91794f1',out=path.resolve(process.argv[2]||path.join(root,'store-listing',version));
const appPaths=['index.html','MainActivity.java','assets','screens.css','reference.css','modern-panels.css','theme-skins.css','theme-renderer.js','board-renderer.js','localization.js','learning.js','learning.css','daily-challenge.js','daily-challenge.css','weekly-quests.js','mechanic-progress.js','cloud-model.js','cloud-sync.js','wheel.js','reward-receipts.js','privacy-settings.js'];
execFileSync('git',['diff','--exit-code',sourceCommit,'--',...appPaths],{cwd:root,stdio:['ignore','pipe','pipe']});
const original=fs.readFileSync(path.join(root,'index.html'),'utf8'),hook="const savedGame=get64('activeGame',null);",html=original.replace(hook,"window.__storePlan=rotationPlan;window.__storeLocked=()=>locked;"+hook);
if(html===original)throw Error('Capture hook is unavailable');
const scenes=[
 ['01-home','Ana menü','Home'],
 ['02-night-temple','Gece Tapınağı · Aynalı düğümler','Night Temple · Mirrored nodes'],
 ['03-emerald-temple','Zümrüt Mabedi · Enerji anahtarları','Emerald Sanctuary · Energy switches'],
 ['04-ruby-fire','Yakut Ateşi · Çift katman','Ruby Fire · Two layers'],
 ['05-mechanic-mastery','Mekanik ustalığı','Mechanic mastery'],
 ['06-daily-challenge','Günün Bulmacası','Daily puzzle'],
 ['07-weekly-quests','Haftalık görevler','Weekly quests'],
 ['08-six-themes','Altı tema','Six themes']
];
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webp')?'image/webp':file.endsWith('.png')?'image/png':'text/html');res.end(file.endsWith('/index.html')?html:fs.readFileSync(file));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']}),manifest={version,versionCode:96,appSourceCommit:sourceCommit,indexSha256:crypto.createHash('sha256').update(original).digest('hex'),rendering:'Unmodified packaged WebView UI, Chromium mobile rendering; not a physical-device capture',fixture:'Illustrative local demo save; no real tester or account data; no real ads requested',cssViewport:{width:360,height:640},deviceScaleFactor:3,files:[]};try{
 for(const [locale,code]of [['tr-TR','tr'],['en-US','en']]){
  const context=await browser.newContext({viewport:{width:360,height:640},deviceScaleFactor:3,isMobile:true,hasTouch:true,locale,reducedMotion:'reduce',timezoneId:'Europe/Istanbul'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.addInitScript(code=>{localStorage.setItem('kd6_lang',code);localStorage.setItem('kd64_level','132');localStorage.setItem('kd64_completed',JSON.stringify(Object.fromEntries(Array.from({length:131},(_,i)=>[i+1,(i+1)%7===0?1:(i+1)%5===0?2:3]))));localStorage.setItem('kd64_journeyClaims',JSON.stringify({50:true,100:true}));localStorage.setItem('kd64_coins','3500')},code);
  await page.clock.install({time:new Date('2026-10-30T10:00:00Z')});await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);await page.clock.fastForward(2500);if(await page.locator('.kdDailyClose').count())await page.locator('.kdDailyClose').click();
  const folder=path.join(out,locale,'images','phoneScreenshots');fs.mkdirSync(folder,{recursive:true});
  async function shot(index){await page.clock.fastForward(1500);const scene=scenes[index-1],file=path.join(folder,scene[0]+'.jpg');await page.screenshot({path:file,type:'jpeg',quality:95,animations:'disabled'});manifest.files.push({locale,order:index,path:path.relative(out,file).replaceAll(path.sep,'/'),caption:scene[locale==='tr-TR'?1:2],width:1080,height:1920,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')});}
  async function theme(id){await page.evaluate(()=>kdNavigate('shop'));const button=page.locator('[data-shop-theme="'+id+'"]');if(await button.isEnabled())await button.click();}
  async function board(id,level){await theme(id);await page.evaluate(level=>{kdSelectLevel(level);kdNavigate('game');const plan=__storePlan();if(!plan)throw Error('No legal plan for capture');for(const i of plan.slice(0,5)){if(__storeLocked())break;document.querySelector('#board>.tile[data-i="'+i+'"]').click()}},level);await page.clock.fastForward(12000);}
  await shot(1);
  for(const id of ['ice','emerald','ruby'])await theme(id);
  await board('ice',17);await shot(2);await board('emerald',21);await shot(3);await board('ruby',23);await shot(4);
  await theme('gold');
  for(const level of [17,32,47]){await page.evaluate(level=>{kdSelectLevel(level);kdNavigate('game')},level);await page.clock.fastForward(12000);await page.evaluate(()=>{for(const i of __storePlan()){if(__storeLocked())break;document.querySelector('#board>.tile[data-i="'+i+'"]').click()}if(!__storeLocked())throw Error('Demo run did not finish')});await page.locator('.kdWinClose').click();await page.clock.fastForward(2000);}
  await page.evaluate(()=>{kdNavigate('levels');document.querySelector('.kdMechanicMastery').open=true;document.querySelector('.kdMechanicMastery').scrollIntoView({block:'start'})});await shot(5);
  await page.evaluate(()=>kdNavigate('daily'));await shot(6);
  await page.evaluate(()=>{kdNavigate('home');kdOpenExtras('quests')});await page.locator('[data-quest-period="weekly"]').click();await shot(7);await page.locator('#v9Close').click();
  await page.evaluate(()=>{kdNavigate('shop');document.getElementById('kdShop-themes').scrollIntoView({block:'start'})});await shot(8);
  if(errors.length)throw Error(locale+': '+errors.join('; '));await context.close();
 }
 fs.writeFileSync(path.join(out,'screenshots-manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log('Captured '+manifest.files.length+' store screenshots for '+version+' in '+out);
}finally{await browser.close();server.close();}})().catch(error=>{console.error(error);server.close();process.exitCode=1});
