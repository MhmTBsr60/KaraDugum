const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webp')?'image/webp':'text/html');res.end(fs.readFileSync(file));});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']}),errors=[];
 try{
  const p=await browser.newPage({viewport:{width:390,height:844},locale:'tr-TR'});p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{
   window.networkOnline=true;window.appHidden=false;window.nativeUid='alice';window.holdAuth=false;window.stateCalls=0;window.requests=[];window.remote={};
   Object.defineProperty(navigator,'onLine',{get:()=>window.networkOnline});Object.defineProperty(document,'hidden',{get:()=>window.appHidden});
   window.KaraNative={
    upload(){},achievements(){},
    state(){stateCalls++;if(!holdAuth)kdNativeEvent('user',{uid:nativeUid,name:nativeUid})},
    syncSave(raw){const data=JSON.parse(raw);requests.push(data);if(!networkOnline)throw Error('offline native call');const old=remote[data.full.account];remote[data.full.account]={...data,full:KdCloudModel.merge(old?.full,data.full)};kdNativeEvent('cloudSave',remote[data.full.account]);}
   };
  });
  await p.clock.install({time:new Date('2026-10-30T12:00:00Z')});await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);await p.clock.fastForward(2500);
  if(await p.locator('.kdDailyClose').count())await p.locator('.kdDailyClose').click();
  // A network event must not bind a guest save to an unverified account.
  await p.evaluate(()=>window.dispatchEvent(new Event('online')));await p.clock.fastForward(1000);assert.equal(await p.evaluate(()=>stateCalls),0);assert.equal(await p.evaluate(()=>requests.length),0);
  await p.evaluate(()=>KaraNative.state());await p.clock.fastForward(2500);
  const before=await p.evaluate(()=>({coins:kdCloud.project().wallet.coins,xp:kdCloud.project().wallet.xp}));
  await p.evaluate(()=>{networkOnline=false;window.dispatchEvent(new Event('offline'));kdEconomy.transact('test:offline_reward',{coins:17,xp:20});kdCloudSync()});
  await p.evaluate(()=>kdNavigate('profile'));assert.equal(await p.locator('[data-cloud-sync]').isDisabled(),true);
  assert.match(await p.locator('.kdCloudStatus').innerText(),/Çevrimdışı/);
  const offlineRequests=await p.evaluate(()=>requests.length);await p.clock.fastForward(5000);
  assert.equal(await p.evaluate(()=>requests.length),offlineRequests,'offline changes remain local');
  await p.evaluate(()=>{networkOnline=true;window.dispatchEvent(new Event('online'))});await p.clock.fastForward(2500);
  assert.equal(await p.evaluate(()=>remote.alice.full.ops['test:offline_reward']?.coins),17,'reconnection must upload the pending operation automatically');
  assert.deepEqual(await p.evaluate(()=>({coins:kdCloud.project().wallet.coins,xp:kdCloud.project().wallet.xp})),{coins:before.coins+17,xp:before.xp+20});
  const settled=await p.evaluate(()=>({requests:requests.length,auth:stateCalls}));
  await p.clock.fastForward(60000);assert.deepEqual(await p.evaluate(()=>({requests:requests.length,auth:stateCalls})),settled,'successful reconnect must not create a polling loop');
  // Several network notifications form one reconnect, deferred while the app is hidden.
  await p.evaluate(()=>{networkOnline=false;window.dispatchEvent(new Event('offline'));kdEconomy.transact('test:hidden_reward',{coins:9});appHidden=true;networkOnline=true;for(let i=0;i<5;i++)window.dispatchEvent(new Event('online'))});
  const hidden=await p.evaluate(()=>requests.length);await p.clock.fastForward(5000);assert.equal(await p.evaluate(()=>requests.length),hidden);
  await p.evaluate(()=>{appHidden=false;document.dispatchEvent(new Event('visibilitychange'))});await p.clock.fastForward(2500);
  assert.equal(await p.evaluate(()=>remote.alice.full.ops['test:hidden_reward']?.coins),9);assert.equal(await p.evaluate(()=>stateCalls),settled.auth+1);
  // The actual Play Games owner can change while offline. Check it before sending data.
  await p.evaluate(()=>{networkOnline=false;window.dispatchEvent(new Event('offline'));kdEconomy.transact('test:alice_pending',{coins:11});nativeUid='bob';holdAuth=true;networkOnline=true;requests=[];window.dispatchEvent(new Event('online'))});await p.clock.fastForward(2500);
  assert.equal(await p.evaluate(()=>requests.length),0,'wait for the asynchronous Play Games identity result');
  await p.evaluate(()=>kdEconomy.transact('test:during_auth',{coins:7}));
  assert.equal(await p.locator('[data-cloud-sync]').isDisabled(),false);await p.locator('[data-cloud-sync]').click();await p.clock.fastForward(2500);
  assert.equal(await p.evaluate(()=>requests.length),0,'new rewards and manual retry cannot bypass account validation');
  await p.evaluate(()=>{holdAuth=false;kdNativeEvent('user',{uid:nativeUid,name:nativeUid})});await p.clock.fastForward(2500);
  assert.equal(await p.evaluate(()=>kdEconomy.owner()),'bob');assert(await p.evaluate(()=>requests.length>0&&requests.every(r=>r.full.account==='bob')),'reconnect must only upload for the newly verified account: '+JSON.stringify(await p.evaluate(()=>requests.map(r=>r.full.account))));
  assert.equal(await p.evaluate(()=>remote.bob.full.ops['test:alice_pending']),undefined);
  await p.evaluate(()=>{nativeUid='alice';KaraNative.state()});await p.clock.fastForward(2500);assert.equal(await p.evaluate(()=>remote.alice.full.ops['test:alice_pending'].coins),11);assert.equal(await p.evaluate(()=>remote.alice.full.ops['test:during_auth'].coins),7);
  // Older native bridges without state() still sync the already verified owner.
  await p.evaluate(()=>{delete KaraNative.state;networkOnline=false;window.dispatchEvent(new Event('offline'));kdEconomy.transact('test:older_bridge',{coins:3});networkOnline=true;window.dispatchEvent(new Event('online'))});await p.clock.fastForward(2500);
  assert.equal(await p.evaluate(()=>remote.alice.full.ops['test:older_bridge'].coins),3);
  assert.deepEqual(errors,[]);console.log('PASS: offline gains upload on reconnect; no guest binding, duplicate credit or polling; hidden/bursty events, Google account changes and older bridge fallback');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
