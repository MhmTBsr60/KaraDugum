'use strict';
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const anchor="const savedGame=get64('activeGame',null);";
// Observe the shipped engine and obtain legal moves; every win still uses real tile clicks.
const html=source.replace(anchor,'window.__mechanicQuestAudit={plan:rotationPlan,locked:()=>locked};'+anchor);
assert.notEqual(html,source,'Game observation hook is missing');
const oldDay='2026-11-08',day='2026-11-09';
const oldQuest={date:oldDay,tasks:[
 ['win','2 bulmaca çöz','wins',2,15],
 ['moves','Çözülen bulmacalarda 30 hamle','moves',30,10],
 ['time','Bulmacaları çözerek 3 dakika oyna','time',180,15]
],baseline:{wins:0,moves:0,perfect:0,time:0},claimed:{}};

const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
  res.writeHead(404);res.end();return;
 }
 const type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webp')?'image/webp':file.endsWith('.png')?'image/png':'text/html';
 res.setHeader('Content-Type',type);
 res.end(file===path.join(root,'index.html')?html:fs.readFileSync(file));
});

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},locale:'tr-TR',timezoneId:'Europe/Istanbul',reducedMotion:'reduce'});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('dialog',dialog=>dialog.accept());
  await page.addInitScript(quest=>{
   // Valid existing campaign progress with one already-completed tutorial to improve.
   localStorage.setItem('kd64_level','300');
   localStorage.setItem('kd64_completed','{"1":2}');
   localStorage.setItem('kd64_v9_quest',JSON.stringify(quest));
  },oldQuest);
  await page.clock.install({time:new Date(oldDay+'T12:00:00Z')});
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await page.clock.fastForward(2600);
  if(await page.locator('.kdDailyClose').count())await page.locator('.kdDailyClose').click();

  const quest=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('kd64_v9_quest')));
  const wallet=()=>page.evaluate(()=>Object.fromEntries(['coins','xp','hintCoupons'].map(key=>[key,Number(localStorage.getItem('kd64_'+key)||0)])));
  const receipts=()=>page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('kd64_mechanicQuestRuns')||'{}')));
  async function openQuests(){await page.evaluate(()=>kdOpenExtras('quests'));await page.locator('.kdQuestsFull').waitFor({state:'visible'});}
  async function closeQuests(){await page.locator('#v9Close').click();}
  async function solve(level){
   await page.evaluate(level=>{
    kdSelectLevel(level);kdNavigate('game');
    const plan=__mechanicQuestAudit.plan();
    if(!plan)throw Error('Legal solution plan is unavailable for level '+level);
    for(const index of plan){
     if(__mechanicQuestAudit.locked())break;
     document.querySelector(`#board>.tile[data-i="${index}"]`).click();
    }
   },level);
   assert(await page.evaluate(()=>__mechanicQuestAudit.locked()),'Level '+level+' must finish through legal moves');
   await page.locator('.kdWinPanel').waitFor({state:'visible'});
   const win=await page.evaluate(()=>({...kdLastWin}));
   assert.equal(win.level,level);
   assert.equal(win.star,3);
   assert.equal(win.usedHints,0);
   await page.locator('.kdWinClose').click();
   return win;
  }

  // Existing tasks remain immutable during their day. Midnight creates a new selection.
  await openQuests();
  assert.deepEqual(await quest(),oldQuest,'An update must not replace the current daily task set');
  assert((await page.locator('#v9Rows').textContent()).includes('Bulmacaları çözerek 3 dakika oyna'));
  await closeQuests();
  await page.clock.setSystemTime(new Date(day+'T12:00:00Z'));
  await openQuests();
  const fresh=await quest();
  assert.equal(fresh.date,day);
  assert.equal(fresh.tasks[0][0],'mechanics');
  assert.equal(fresh.tasks[0][3],2);
  assert.equal(fresh.tasks[2][0],'improved');
  assert.equal(fresh.tasks[2][3],1);
  assert.deepEqual(fresh.claimed,{});
  await closeQuests();

  // Improving an existing tutorial counts for star improvement, without becoming a mechanic.
  const tutorial=await solve(1);
  assert.equal(tutorial.priorStar,2);
  assert.deepEqual(await page.evaluate(date=>({
   mechanics:kdMechanicQuests.progress({date},'mechanics'),
   improved:kdMechanicQuests.progress({date},'improved')
  }),day),{mechanics:0,improved:1});
  const tutorialReceipt=(await receipts())[0];
  assert.equal(await page.evaluate(event=>kdMechanicQuests.decode(event).mode,tutorialReceipt),15);

  // Two real, different special mechanics satisfy the variety goal.
  await solve(11);
  const second=await solve(17);
  const rawReceipts=await receipts();
  assert.equal(rawReceipts.length,3);
  assert.equal(new Set(rawReceipts).size,3);
  assert.deepEqual(await page.evaluate(date=>({
   mechanics:kdMechanicQuests.progress({date},'mechanics'),
   improved:kdMechanicQuests.progress({date},'improved')
  }),day),{mechanics:2,improved:1});
  const walletBeforeDuplicate=await wallet();
  assert.equal(await page.evaluate(win=>kdMechanicQuests.recordWin(win),second),false,'The same run must not create another receipt');
  assert.deepEqual(await receipts(),rawReceipts);
  assert.deepEqual(await wallet(),walletBeforeDuplicate,'Run receipts must never pay currency or XP');

  // Future events cannot advance today's quests. Conflicting IDs resolve identically in either order.
  const aggregateChecks=await page.evaluate(date=>{
   const future=kdMechanicQuests.encode({id:'audit_future',level:18,star:3,priorStar:2},'2026-11-10');
   const earned=kdMechanicQuests.encode({id:'audit_conflict',level:17,star:3,priorStar:2},date);
   const conservative=kdMechanicQuests.encode({id:'audit_conflict',level:17,star:3,priorStar:0},date);
   return {
    future:kdMechanicQuests.aggregate([future],date),
    first:kdMechanicQuests.aggregate([earned,conservative],date),
    reversed:kdMechanicQuests.aggregate([conservative,earned],date)
   };
  },day);
  assert.deepEqual(aggregateChecks.future,{mechanics:0,improved:0});
  assert.deepEqual(aggregateChecks.first,{mechanics:1,improved:0});
  assert.deepEqual(aggregateChecks.reversed,aggregateChecks.first);

  // Guest receipts migrate through the real zero-resource cloud ledger exactly once.
  const walletBeforeAdoption=await wallet();
  await page.evaluate(()=>kdCloud.activate('quest-audit-A'));
  const adopted=await page.evaluate(date=>({
   owner:kdEconomy.owner(),
   receipts:[...kdCloud.project().claims].filter(event=>event.startsWith('mechanicrun:')),
   guestCopy:localStorage.getItem('kd64_mechanicQuestRuns'),
   mechanics:kdMechanicQuests.progress({date},'mechanics'),
   improved:kdMechanicQuests.progress({date},'improved')
  }),day);
  assert.equal(adopted.owner,'quest-audit-A');
  assert.deepEqual(adopted.receipts.sort(),rawReceipts.slice().sort());
  assert.equal(adopted.guestCopy,null);
  assert.equal(adopted.mechanics,2);
  assert.equal(adopted.improved,1);
  assert.deepEqual(await wallet(),walletBeforeAdoption,'Adoption of zero-resource receipts must preserve the wallet');
  await page.evaluate(()=>kdMechanicQuests.adopt());
  assert.deepEqual(await wallet(),walletBeforeAdoption);
  assert.equal(await page.evaluate(()=>[...kdCloud.project().claims].filter(event=>event.startsWith('mechanicrun:')).length),3);

  await page.evaluate(()=>kdCloud.activate('quest-audit-B'));
  assert.deepEqual(await page.evaluate(date=>({
   mechanics:kdMechanicQuests.progress({date},'mechanics'),
   improved:kdMechanicQuests.progress({date},'improved')
  }),day),{mechanics:0,improved:0},'Another account must not inherit guest/A receipts');
  await page.evaluate(()=>kdCloud.activate('quest-audit-A'));
  assert.deepEqual(await page.evaluate(date=>({
   mechanics:kdMechanicQuests.progress({date},'mechanics'),
   improved:kdMechanicQuests.progress({date},'improved')
  }),day),{mechanics:2,improved:1});

  // Claim through the actual daily-quest UI, then retry a stale/disabled control.
  await openQuests();
  assert.equal((await quest()).tasks[0][0],'mechanics');
  assert((await page.locator('.kdV9Row').first().textContent()).includes('2/2'));
  const beforeClaim=await wallet();
  await page.locator('.kdV9Row').first().locator('button').click();
  const afterClaim=await wallet();
  assert.equal(afterClaim.coins,beforeClaim.coins+15);
  assert.equal(afterClaim.xp,beforeClaim.xp);
  assert.equal(afterClaim.hintCoupons,beforeClaim.hintCoupons);
  assert.equal((await quest()).claimed.mechanics,true);
  assert.equal(await page.evaluate(date=>kdCloud.project().claims.has('quest:'+date+':mechanics'),day),true);
  await page.locator('.kdV9Row').first().locator('button').dispatchEvent('click');
  assert.deepEqual(await wallet(),afterClaim,'A repeated claim must not pay twice');
  await closeQuests();
  assert.deepEqual(errors,[]);
  console.log('PASS: existing daily quests preserved until midnight, real tutorial-star improvement and two mechanics, immutable run deduplication, future-date isolation, deterministic conflicting IDs, guest adoption, account separation, and one-time UI quest reward');
 }finally{
  await browser.close();server.close();
 }
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
