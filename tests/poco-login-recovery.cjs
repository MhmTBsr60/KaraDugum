'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');
const {root:repository} = require('./energy-wave-harness.cjs');
const root = process.env.KD_RUNTIME_ROOT || repository;
const report = {status:'RUNNING',cases:[]};
const out = process.env.KD_LOGIN_REPORT || path.join(root,'design/poco-energy-preview/tests/login-recovery.json');
const today = '2026-11-20';
const nextDay = '2026-11-21';
const followingDay = '2026-11-22';
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css',
  '.png':'image/png','.webp':'image/webp'};
const server = http.createServer((request,response)=>{
  const file=path.resolve(root,'.'+new URL(request.url,'http://localhost').pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
    response.writeHead(404).end();return;
  }
  response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
  fs.createReadStream(file).pipe(response);
});

async function launch(browser, streak) {
  const page = await browser.newPage({reducedMotion:'reduce',timezoneId:'UTC'});
  await page.addInitScript(({today,streak})=>{
    const set = Storage.prototype.setItem;
    if(!localStorage.getItem('kdLoginTestSeed')){
      set.call(localStorage,'kdLoginTestSeed','1');
      set.call(localStorage,'kd64_dailyDate',JSON.stringify(today));
      set.call(localStorage,'kd64_streak',String(streak));
      set.call(localStorage,'kd64_coins','100');
      set.call(localStorage,'kd64_hintCoupons','3');
      set.call(localStorage,'kd64_dailyLastReward',JSON.stringify({date:today,day:1,coins:5,hints:0}));
    }
    Storage.prototype.setItem=function(key,value){
      if(this===localStorage && key===window.__failLoginWrite)throw new DOMException('Test interruption','QuotaExceededError');
      return set.call(this,key,value);
    };
  },{today,streak});
  await page.clock.install({time:new Date(today+'T11:59:00Z')});
  await page.clock.pauseAt(new Date(today+'T12:00:00Z'));
  await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:')?route.continue():route.abort());
  await page.addInitScript(()=>Object.defineProperty(navigator,'onLine',{get:()=>false}));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await page.clock.runFor(3500);
  return page;
}

const snapshot=page=>page.evaluate(()=>({
  coins:JSON.parse(localStorage.getItem('kd64_coins')),
  hints:JSON.parse(localStorage.getItem('kd64_hintCoupons')),
  date:JSON.parse(localStorage.getItem('kd64_dailyDate'))
}));
async function home(page,date){
  await page.clock.setSystemTime(new Date(date+'T12:00:00Z'));
  await page.evaluate(()=>kdNavigate('home'));
  await page.clock.runFor(160);
}
const panel=page=>page.locator('.kdDailyOverlay').count();

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({args:['--no-sandbox']});
  try{
    for(const [streak,coins,hints] of [[2,100,4],[3,115,3]]){
      const p=await launch(browser,streak);
      // A legacy/cloud receipt on the same day is deliberately missing dailySeen.
      // It represents a paid award and must not make the window reappear.
      assert.equal(await panel(p),0);
      await home(p,today);
      assert.deepEqual(await snapshot(p),{coins:100,hints:3,date:today});
      await p.evaluate(()=>window.__failLoginWrite='kd64_dailyDate');
      await home(p,nextDay);
      const journal=await p.evaluate(()=>JSON.parse(localStorage.getItem('kdCloud_guestReward')));
      assert.equal(journal.login.date,nextDay);
      assert.equal(await panel(p),0);
      await p.reload();
      await p.clock.runFor(3500);
      const settled={coins,hints,date:nextDay};
      assert.deepEqual(await snapshot(p),settled);
      assert.equal(await panel(p),0);
      assert.equal(await p.evaluate(()=>localStorage.getItem('kdCloud_guestReward')),null);
      for(const date of [today,nextDay,today,nextDay]){
        await home(p,date);
        assert.deepEqual(await snapshot(p),settled);
        assert.equal(await panel(p),0);
      }
      report.cases.push({payout:streak===2?'hintCoupon':'crystals',offline:true,
        pendingBeforeRestart:true,restartSettledOnce:true,clockRollback:true,historicalPopupBlocked:true});
      await p.close();
    }

    const p=await launch(browser,3);
    await p.evaluate(()=>kdCloud.activate('login-test-fixture'));
    await home(p,nextDay);
    assert.equal(await panel(p),1,'Fresh payment should open the treasure');
    await p.locator('.kdDailyClose').click();
    const paid=await snapshot(p);
    assert.deepEqual(paid,{coins:115,hints:3,date:nextDay});
    const cloud=await p.evaluate(()=>kdCloud.exportFull());
    assert.equal(cloud.ops['login:'+nextDay].coins,15);
    for(let i=0;i<3;i++){
      await p.evaluate(blob=>kdCloud.receive(blob),cloud);
      await home(p,nextDay);
      assert.equal(await panel(p),0);
      assert.deepEqual(await snapshot(p),paid);
    }
    await p.reload();
    await p.clock.runFor(3500);
    assert.equal(await panel(p),0);
    assert.deepEqual(await snapshot(p),paid);
    report.cases.push({payout:'accountLoginOperation',cloudReplay:3,restart:true,oneFreshPopup:true});
    await p.close();

    for (const [key, streak, restart] of [
      ['kdCloud_login_write-fault',3,false],
      ['kdCloud_ops_write-fault',3,true],
      ['kd64_coins',3,true],
      ['kd64_hintCoupons',2,true],
      ['kd64_dailyDate',3,false],
      ['kd64_streak',3,false],
      ['kd64_dailyLastReward',3,true],
    ]) {
      if (process.env.KD_LOGIN_FAULT_FILTER && key !== process.env.KD_LOGIN_FAULT_FILTER) continue;
      const page = await launch(browser,streak);
      const pageErrors=[];
      page.on('pageerror',error=>pageErrors.push(String(error)));
      await page.evaluate(()=>kdCloud.activate('write-fault'));
      await page.evaluate(key=>window.__failLoginWrite=key,key);
      await home(page,nextDay);
      assert.equal(await panel(page),0,key+' should not announce an unsettled reward');
      if (restart) {
        await page.reload();
        await page.clock.runFor(3500);
        assert.equal(await page.evaluate(()=>kdEconomy.owner()),'write-fault',key+' account survived reload');
      } else {
        await page.evaluate(()=>delete window.__failLoginWrite);
      }
      if (key === 'kd64_streak') {
        // Claiming a later date in the same WebView must repair the older streak first.
        await home(page,followingDay);
        assert.deepEqual(await snapshot(page),{coins:135,hints:3,date:followingDay},key);
        await page.locator('.kdDailyClose').click();
      } else {
        await home(page,nextDay);
        const expected={coins:streak===2?100:115,hints:streak===2?4:3,date:nextDay};
        assert.deepEqual(await snapshot(page),expected,key);
        assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('kd64_dailyLastReward'))),
          {date:nextDay,day:streak+1,coins:expected.coins-100,hints:expected.hints-3},key);
        if (await panel(page)) await page.locator('.kdDailyClose').click();
        await home(page,nextDay);
        assert.deepEqual(await snapshot(page),expected,key+' repeat');
      }
      assert.equal(await panel(page),0);
      assert.equal(await page.evaluate(()=>localStorage.getItem('kdCloud_login_write-fault')),null);
      const record=await page.evaluate(()=>kdCloud.exportFull());
      assert(record,key+' account model survived: '+JSON.stringify(pageErrors));
      assert.equal(Object.keys(record.ops).filter(k=>k==='login:'+nextDay).length,1);
      report.cases.push({payout:'accountLoginWriteFault',key,restart,oneCredit:true});
      await page.close();
    }
    report.status='PASS';
    console.log(JSON.stringify(report,null,2));
  }finally{
    fs.mkdirSync(path.dirname(out),{recursive:true});
    fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
    await browser.close();
    server.close();
  }
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
