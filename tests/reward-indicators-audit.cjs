'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webp')?'image/webp':file.endsWith('.png')?'image/png':'text/html');res.end(fs.readFileSync(file));
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 const errors=[];const day='2026-11-09';
 try{
  async function page(date=day+'T12:00:00Z',claimed=false){
   const p=await browser.newPage({viewport:{width:390,height:844},locale:'tr-TR',timezoneId:'UTC',reducedMotion:'reduce'});
   p.on('pageerror',error=>errors.push(error.message));p.on('dialog',dialog=>dialog.accept());
   await p.route('**/*',route=>{const url=new URL(route.request().url());return url.hostname==='127.0.0.1'?route.continue():route.abort();});
   await p.addInitScript(({date,claimed})=>{
    // Bridge callbacks are local test doubles: no ad request or Google account connection occurs.
    window.__indicatorAds=[];window.__indicatorRemote={};
    window.KaraNative={upload(){},achievements(){},ackReward(){},rewardedWheel:id=>__indicatorAds.push(id),syncSave(raw){const incoming=JSON.parse(raw),uid=incoming.full.account;__indicatorRemote[uid]={...incoming,full:KdCloudModel.merge(__indicatorRemote[uid]?.full,incoming.full)};kdNativeEvent('cloudSave',__indicatorRemote[uid]);}};
    if(localStorage.getItem('__rewardIndicatorFixture'))return;
    localStorage.setItem('__rewardIndicatorFixture','1');
    const today=date.slice(0,10);
    for(const [key,value]of Object.entries({level:300,coins:500,xp:0,hintCoupons:0,dailyDate:today,completed:{},best:{},journeyClaims:{},v9_achievements:{},achievementPeaks:{},v12_chest:claimed?{date:today,streak:1}:{},shopDailyDate:claimed?today:'',shopWheelDate:claimed?today:'',wheelState:{date:today,freeUsed:claimed,adCount:claimed?3:0,bonusUsed:claimed,pending:null},v9_quest:{date:today,tasks:[['win','3 bulmaca çöz','wins',3,15],['moves','Çözülen bulmacalarda 40 hamle','moves',40,10],['perfect','1 kusursuz çözüm kazan','perfect',1,15]],baseline:{wins:0,moves:0,perfect:0,time:0},claimed:{}}}))localStorage.setItem('kd64_'+key,JSON.stringify(value));
    localStorage.setItem('kd3_sound','0');
   },{date,claimed});
   await p.clock.install({time:new Date(date)});await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);
   await p.clock.fastForward(3500);await p.clock.runFor(600);if(await p.locator('.kdDailyClose').count())await p.locator('.kdDailyClose').click();
   await p.waitForFunction(()=>!!window.kdRewardAvailability);await p.clock.pauseAt(await p.evaluate(()=>new Date(Date.now()+1000).toISOString()));await flush(p);return p;
  }
  async function flush(p){await p.evaluate(()=>window.dispatchEvent(new Event('kd:rewards-changed')));await p.clock.runFor(100);}
  async function go(p,route){await p.evaluate(route=>kdNavigate(route),route);await flush(p);}
  const wallet=p=>p.evaluate(()=>Object.fromEntries(['coins','xp','hintCoupons'].map(key=>[key,Number(localStorage.getItem('kd64_'+key)||0)])));
  const count=(p,kind)=>p.evaluate(kind=>kdRewardAvailability.count(kind),kind);
  async function badge(p,selector,expected,label){
   const result=await p.locator(selector).evaluate(card=>{const badge=card.querySelector(':scope>.kdRewardBadge');return {text:badge?.textContent||'',id:badge?.id||'',described:(card.getAttribute('aria-describedby')||'').split(/\s+/),label:card.getAttribute('aria-label'),available:card.classList.contains('kdRewardAvailable')};});
   assert.equal(result.text,expected?String(expected):'',selector+' badge');assert.equal(result.available,expected>0,selector+' readiness class');
   if(expected){assert(result.id);assert(result.described.includes(result.id),'Badge must be connected through aria-describedby');assert.equal(await p.locator('#'+result.id).count(),1,'Badge IDs must be unique');}
   if(label!==undefined)assert.equal(result.label,label,'The original action aria-label must stay unchanged');
  }
  async function shop(p,expected){
   assert.deepEqual(await p.evaluate(()=>kdRewardAvailability.shop()),expected);
   for(const [selector,ready,state]of [['#kdShop-daily',expected.dailyReady,expected.dailyReady?'ready':'claimed'],['#kdShop-wheel',expected.freeReady||expected.bonusReady,expected.pending?'pending':expected.freeReady||expected.bonusReady?'ready':'locked']]){
    assert.equal(await p.locator(selector).getAttribute('data-reward-state'),state);assert.equal(await p.locator(selector+' .kdReadyTag:visible').count(),ready?1:0);
   }
   assert.equal(await p.locator('.kdShopRewards').isVisible(),expected.total>0);
   if(expected.total){assert((await p.locator('.kdShopRewards>strong').textContent()).startsWith(String(expected.total)+' '));assert.equal(await p.locator('.kdShopRewards [data-shop-reward="daily"]').isVisible(),expected.dailyReady);assert.equal(await p.locator('.kdShopRewards [data-shop-reward="wheel"]').isVisible(),expected.freeReady||expected.bonusReady);}
   assert.equal(await p.locator('.kdPackCard .kdReadyTag,.kdThemeCard .kdReadyTag,[data-shop-ad] .kdReadyTag,.kdPackCard .kdRewardBadge,.kdThemeCard .kdRewardBadge,[data-shop-ad] .kdRewardBadge').count(),0,'Purchases and ad offers are not claimable gifts');
  }
  const empty={dailyReady:false,freeReady:false,bonusReady:false,pending:false,total:0};

  // Public projection and repeated refreshes must not award currency or change claim facts.
  const idle=await page();
  await badge(idle,'.kdHotShop',2,'MAĞAZA');await badge(idle,'.kdHotChest',1,'SANDIK');await badge(idle,'.kdHotTasks',0,'GÖREVLER');await badge(idle,'.kdHotLevels',0,'BÖLÜMLER');await badge(idle,'.kdHotStats',0,'İstatistikler');
  assert.equal(await idle.locator('.kdDailyEntry .kdRewardBadge').count(),0,'An unplayed daily puzzle must not advertise an earned reward');
  const beforeReads=await wallet(idle);
  const claimsBefore=await idle.evaluate(()=>Object.fromEntries(['shopDailyDate','shopWheelDate','wheelState','journeyClaims','v9_achievements','questFinaleClaims','weeklyClaims'].map(key=>[key,localStorage.getItem('kd64_'+key)])));
  await idle.evaluate(()=>{for(let i=0;i<20;i++){kdRewardAvailability.shop();for(const kind of ['shop','quests','chest','levels','achievements'])kdRewardAvailability.count(kind);window.dispatchEvent(new Event('kd:rewards-changed'));}});await idle.clock.runFor(200);
  assert.deepEqual(await wallet(idle),beforeReads);assert.deepEqual(await idle.evaluate(()=>Object.fromEntries(['shopDailyDate','shopWheelDate','wheelState','journeyClaims','v9_achievements','questFinaleClaims','weeklyClaims'].map(key=>[key,localStorage.getItem('kd64_'+key)]))),claimsBefore);
  // Observe indicator mutations and storage writes after lifecycle handlers have settled.
  await idle.evaluate(()=>{window.__indicatorProbe={writes:0,mutations:0};const set=Storage.prototype.setItem,remove=Storage.prototype.removeItem;Storage.prototype.setItem=function(k,v){if(this===localStorage)__indicatorProbe.writes++;return set.call(this,k,v)};Storage.prototype.removeItem=function(k){if(this===localStorage)__indicatorProbe.writes++;return remove.call(this,k)};new MutationObserver(records=>{for(const r of records){const target=r.target.nodeType===1?r.target:r.target.parentElement;if(target?.closest('.kdRewardBadge,.kdShopRewards,.kdReadyTag')||[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&n.matches('.kdRewardBadge,.kdReadyTag,.kdShopRewards')))__indicatorProbe.mutations++;}}).observe(document.getElementById('kdShell'),{subtree:true,childList:true,characterData:true,attributes:true});});
  await idle.clock.runFor(1000);await idle.clock.fastForward(10000);assert.deepEqual(await idle.evaluate(()=>__indicatorProbe),{writes:0,mutations:0},'Visible idle indicators must not poll/write/rebuild');
  await idle.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await idle.clock.runFor(100);
  await idle.evaluate(()=>{__indicatorProbe.writes=0;__indicatorProbe.mutations=0;window.dispatchEvent(new Event('kd:rewards-changed'));});await idle.clock.runFor(1000);await idle.clock.fastForward(10000);assert.deepEqual(await idle.evaluate(()=>__indicatorProbe),{writes:0,mutations:0},'Hidden indicators must not write or mutate');
  await idle.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await idle.clock.runFor(100);
  await go(idle,'game');const hiddenMarkup=await idle.locator('#kdShell').innerHTML();await flush(idle);assert.equal(await idle.locator('#kdShell').innerHTML(),hiddenMarkup,'A hidden game-menu shell must stay untouched');assert.deepEqual(await wallet(idle),beforeReads);await idle.close();

  // Actual shop claims remove markers immediately; wheel pending/bonus states stay truthful.
  const p=await page();await go(p,'shop');await shop(p,{dailyReady:true,freeReady:true,bonusReady:false,pending:false,total:2});
  if(process.env.AUDIT_SCREENSHOTS){fs.mkdirSync(process.env.AUDIT_SCREENSHOTS,{recursive:true});await p.screenshot({path:path.join(process.env.AUDIT_SCREENSHOTS,'shop-rewards-ready.png'),fullPage:true});}const start=await wallet(p);await p.locator('[data-shop-daily]').click();await flush(p);assert.equal((await wallet(p)).coins,start.coins+25);await shop(p,{...empty,freeReady:true,total:1});
  await p.locator('[data-shop-daily]').dispatchEvent('click');assert.equal((await wallet(p)).coins,start.coins+25);
  await p.locator('#kdShop-wheel').click();await p.evaluate(()=>Math.random=()=>0);await p.locator('.kdWheelSpin').click();await p.evaluate(()=>window.dispatchEvent(new Event('kd:rewards-changed')));await p.clock.runFor(30);await shop(p,{...empty,pending:true});
  assert.equal((await wallet(p)).coins,start.coins+25,'A pending spin must not pay early');await p.clock.runFor(300);assert.equal((await wallet(p)).coins,start.coins+35);await shop(p,empty);
  for(let i=1;i<=3;i++){await p.locator('.kdWheelAd').click();const id=await p.evaluate(()=>__indicatorAds.at(-1));await p.evaluate(id=>{kdNativeEvent('adReward','wheel:'+id);kdNativeEvent('adReward','wheel:'+id);},id);await flush(p);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('kd64_wheelState')).adCount),i);await shop(p,i===3?{...empty,bonusReady:true,total:1}:empty);}
  await p.locator('.kdWheelSpin').click();await p.clock.runFor(30);await shop(p,{...empty,pending:true});await p.clock.runFor(300);await shop(p,empty);assert.equal((await wallet(p)).coins,start.coins+55);await p.locator('.kdWheelClose').click();
  await go(p,'home');await badge(p,'.kdHotShop',0,'MAĞAZA');const paid=await wallet(p);await p.reload();await p.clock.fastForward(3500);await p.clock.runFor(600);await go(p,'shop');await shop(p,empty);assert.deepEqual(await wallet(p),paid,'Reload must neither restore a badge nor repeat a claim');await p.close();

  // Journey and achievement projections point to their real in-screen claim actions.
  const progress=await page();await progress.evaluate(()=>{localStorage.setItem('kd64_completed',JSON.stringify(Object.fromEntries(Array.from({length:50},(_,i)=>[i+1,2]))));kdReloadProgress();});await go(progress,'home');
  assert.equal(await count(progress,'levels'),1);assert.equal(await count(progress,'achievements'),4);await badge(progress,'.kdHotLevels',1,'BÖLÜMLER');await badge(progress,'.kdHotStats',4,'İstatistikler');
  await go(progress,'profile');await badge(progress,'[data-profile-tab="achievements"]',4);await progress.locator('[data-profile-tab="achievements"]').click();await flush(progress);assert.equal(await progress.locator('.kdModernAchievementGrid article[data-reward-state="ready"]').count(),4);
  const beforeAchievement=await wallet(progress);await progress.locator('[data-achievement-claim="first"]').click();await flush(progress);assert.equal((await wallet(progress)).coins,beforeAchievement.coins+5);await badge(progress,'[data-profile-tab="achievements"]',3);assert.equal(await progress.locator('.kdModernAchievementGrid article[data-reward-state="ready"]').count(),3);
  await go(progress,'levels');assert.equal(await progress.locator('.kdGoalCard').getAttribute('data-reward-state'),'ready');const beforeJourney=await wallet(progress);await progress.locator('[data-journey-claim]').click();await flush(progress);assert.deepEqual(await wallet(progress),{coins:beforeJourney.coins+150,xp:beforeJourney.xp,hintCoupons:beforeJourney.hintCoupons+2});assert.equal(await count(progress,'levels'),0);assert.notEqual(await progress.locator('.kdGoalCard').getAttribute('data-reward-state'),'ready');
  await go(progress,'home');await badge(progress,'.kdHotLevels',0,'BÖLÜMLER');await badge(progress,'.kdHotStats',3,'İstatistikler');

  // Combined daily/weekly badges count only rewards whose buttons can actually be claimed.
  await progress.evaluate(()=>{for(const [key,value]of Object.entries({wins:3,moves:40,perfect:1}))localStorage.setItem('kd64_'+key,JSON.stringify(value));for(let i=0;i<15;i++)kdWeekly.recordWin({id:'indicator_week_'+i,level:17,moves:30,star:3});});await flush(progress);await badge(progress,'.kdHotTasks',6,'GÖREVLER');
  await progress.locator('.kdHotTasks').click();await flush(progress);assert.equal(await progress.locator('.kdV9Row[data-reward-state="ready"]').count(),3);assert(await progress.locator('.kdQuestFinale button').isDisabled());const beforeQuests=await wallet(progress);
  for(let i=0;i<3;i++){await progress.locator('.kdV9Row button').nth(i).click();await flush(progress);}assert.equal(await count(progress,'quests'),4);assert.equal(await progress.locator('.kdQuestFinale').getAttribute('data-reward-state'),'ready');await progress.locator('.kdQuestFinale button').click();await flush(progress);assert.equal(await count(progress,'quests'),3);
  await progress.locator('[data-quest-period="weekly"]').click();await flush(progress);assert.equal(await progress.locator('.kdV9Row[data-reward-state="ready"]').count(),3);for(let i=0;i<3;i++){await progress.locator('.kdV9Row button').nth(i).click();await flush(progress);}assert.equal(await count(progress,'quests'),1);assert.equal(await progress.locator('.kdWeeklyFinale').getAttribute('data-reward-state'),'ready');await progress.locator('.kdWeeklyFinale button').click();await flush(progress);assert.equal(await count(progress,'quests'),0);assert.deepEqual(await wallet(progress),{coins:beforeQuests.coins+220,xp:beforeQuests.xp,hintCoupons:beforeQuests.hintCoupons+3});await progress.clock.fastForward(2800);await progress.locator('#v9Close').click();await badge(progress,'.kdHotTasks',0,'GÖREVLER');await progress.close();

  // An already-open home/shop refreshes once at local midnight without awarding anything.
  const midnight=await page(day+'T23:59:40Z',true);await badge(midnight,'.kdHotShop',0,'MAĞAZA');await badge(midnight,'.kdHotChest',0,'SANDIK');const beforeMidnight=await wallet(midnight);await midnight.clock.fastForward(21000);await midnight.clock.runFor(100);await badge(midnight,'.kdHotShop',2,'MAĞAZA');await badge(midnight,'.kdHotChest',1,'SANDIK');assert.deepEqual(await wallet(midnight),beforeMidnight);await go(midnight,'shop');await shop(midnight,{dailyReady:true,freeReady:true,bonusReady:false,pending:false,total:2});assert.deepEqual(await wallet(midnight),beforeMidnight);await midnight.close();

  // Real account/cloud handlers remove stale markers, preserve owners, and do not pay display refreshes.
  const account=await page();async function user(uid){await account.evaluate(uid=>kdNativeEvent('user',{uid,name:uid}),uid);await account.clock.fastForward(2400);await account.clock.runFor(100);assert(await account.evaluate(()=>kdEconomy.ready()));await go(account,'home');}
  await user('indicator-A');await badge(account,'.kdHotShop',2,'MAĞAZA');await go(account,'shop');await account.locator('[data-shop-daily]').click();await account.clock.fastForward(2400);await account.clock.runFor(100);await go(account,'home');await badge(account,'.kdHotShop',1,'MAĞAZA');
  await user('indicator-B');await badge(account,'.kdHotShop',2,'MAĞAZA');await user('indicator-A');await badge(account,'.kdHotShop',1,'MAĞAZA');const beforeCloud=await wallet(account);
  const cloud=await account.evaluate(date=>{const full=KdCloudModel.normalize(kdCloud.exportFull()),stamp=KdCloudModel.clock(full)+1;full.state.wheelState={n:stamp,d:'d_indicator_remote',v:{date,freeUsed:true,adCount:0,bonusUsed:false,pending:null}};full.ops['wheel:'+date+':free']={n:stamp+1,d:'d_indicator_remote',coins:0,xp:0,hintCoupons:0};__indicatorRemote[full.account]={full};kdNativeEvent('cloudSave',{full});return full;},day);
  await account.clock.runFor(200);await badge(account,'.kdHotShop',0,'MAĞAZA');assert.deepEqual(await wallet(account),beforeCloud,'A cloud claim fact must not pay a display bonus');await go(account,'shop');await shop(account,empty);
  await user('indicator-B');await badge(account,'.kdHotShop',2,'MAĞAZA');const foreign=await wallet(account);await account.evaluate(full=>kdNativeEvent('cloudSave',{full}),cloud);await flush(account);await badge(account,'.kdHotShop',2,'MAĞAZA');assert.deepEqual(await wallet(account),foreign);await account.close();
  assert.deepEqual(errors,[]);console.log('PASS: truthful home/profile/shop/quest reward markers, accessible badge descriptions, read-only/idle/hidden behavior, pending/bonus wheel states, one-time claims/reload, midnight refresh, and account/cloud isolation without real ads');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
