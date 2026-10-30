const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright'),M=require('../cloud-model.js');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webp')?'image/webp':'text/html');res.end(fs.readFileSync(file));});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']}),errors=[];
 const firstId='d_'+'a'.repeat(32),secondId='d_'+'b'.repeat(32),thirdId='d_'+'c'.repeat(32);let remote;
 try{
  async function open(device,storageState){
   const context=await browser.newContext({viewport:{width:390,height:844},locale:'tr-TR',...(storageState?{storageState}:{})}),p=await context.newPage();
   p.on('pageerror',e=>errors.push(e.message));
   await p.addInitScript(device=>{window.KaraNative={installationId:()=>device,syncSave(){},upload(){},achievements(){}}},device);
   await p.clock.install({time:new Date('2026-10-30T12:00:00Z')});
   await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);await p.clock.fastForward(2500);
   return p;
  }
  async function sync(p){const data=await p.evaluate(()=>{kdNativeEvent('user',{uid:'restore_account',name:'Restore player'});return {saveVersion:64,level:1,completed:{},best:{},full:kdCloud.exportFull()}});remote={...data,full:M.merge(remote?.full,data.full)};await p.evaluate(data=>kdNativeEvent('cloudSave',data),remote);}
  const wins=p=>p.evaluate(()=>+localStorage.getItem('kd64_wins'));
  const a=await open(firstId);await sync(a);await a.evaluate(()=>{kdEconomy.addStat('wins',2);kdEconomy.addStat('moves',40);kdCloud.exportFull()});
  const backup=await a.context().storageState(),wallet=await a.evaluate(()=>({coins:+localStorage.getItem('kd64_coins'),xp:+localStorage.getItem('kd64_xp'),hints:+localStorage.getItem('kd64_hintCoupons')}));
  const b=await open(secondId,backup);
  assert.equal(await wins(b),2,'historical counters survive the device identity change');
  await a.evaluate(()=>{kdEconomy.addStat('wins',1);kdEconomy.addStat('moves',15);kdDaily.attempt('2026-10-30')});
  await b.evaluate(()=>{kdEconomy.addStat('wins',3);kdEconomy.addStat('moves',45);kdDaily.attempt('2026-10-30');kdDaily.attempt('2026-10-30')});
  await sync(a);await sync(b);await sync(a);
  assert.equal(await wins(a),6);assert.equal(await wins(b),6);
  assert.equal(await a.evaluate(()=>kdEconomy.device()),firstId,'Android installation identity must drive device counters');
  assert.equal(await b.evaluate(()=>kdEconomy.device()),secondId,'a restored WebView backup must not clone the native installation identity');

  assert.equal(await b.evaluate(()=>+localStorage.getItem('kd64_moves')),100);
  assert.equal(await b.evaluate(()=>kdEconomy.dayStat('2026-10-30','wins')),6);
  assert.equal(await b.evaluate(()=>JSON.parse(localStorage.getItem('kd64_dailyRecords'))['2026-10-30'].attempts),3);
  assert.equal(Object.keys(remote.full.counters).length,2);
  assert.deepEqual(await b.evaluate(()=>({coins:+localStorage.getItem('kd64_coins'),xp:+localStorage.getItem('kd64_xp'),hints:+localStorage.getItem('kd64_hintCoupons')})),wallet,'restoring counters must neither re-award nor lose wallet resources');
  // A 6.28 journal can arrive in a backup between its prepare write and checkpoint.
  const legacy=structuredClone(backup),storage=legacy.origins[0].localStorage;
  storage.push({name:'kdCloud_counter_restore_account',value:JSON.stringify({wins:4,moves:40,days:{'2026-10-30':{wins:4,moves:40}}})});
  storage.push({name:'kdCloud_counter_other_account',value:JSON.stringify({wins:9})});
  const c=await open(thirdId,legacy);
  assert.equal(await wins(c),4,'legacy prepared counter must retain its original actor');
  assert.equal(await c.evaluate(()=>kdCloud.model().counters['d_'+'a'.repeat(32)].wins),4);
  const prepared=await c.evaluate(()=>{kdEconomy.addStat('wins',3);return {journal:JSON.parse(localStorage.getItem('kdCloud_counter_restore_account')),saved:JSON.parse(localStorage.getItem('kdCloud_account_restore_account')).model}});
  assert.equal(prepared.journal.actor,thirdId);assert.equal(prepared.journal.values.wins,3);
  assert.equal(prepared.saved.counters[firstId].wins,4,'recovered origin is durable before the new journal replaces it');
  // Reload before a new checkpoint: both the recovered old actor and new journal survive.
  await c.reload();await c.clock.fastForward(2500);
  assert.equal(await wins(c),7);
  assert.equal(await c.evaluate(()=>kdEconomy.device()),thirdId,'the installation identity remains stable on reload');
  assert.equal(await c.evaluate(()=>kdCloud.model().counters['d_'+'a'.repeat(32)].wins),4);
  assert.equal(await c.evaluate(()=>kdCloud.model().counters['d_'+'c'.repeat(32)].wins),3);
  assert.equal(await c.evaluate(()=>JSON.parse(localStorage.getItem('kdCloud_counter_other_account')).actor),firstId,'inactive account journals retain their source through another reload');
  assert.deepEqual(errors,[]);
  console.log('PASS: restored Android/WebView backup uses a fresh native actor; old history, concurrent counters, daily attempts, legacy journal migration and immediate-reload recovery survive');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
