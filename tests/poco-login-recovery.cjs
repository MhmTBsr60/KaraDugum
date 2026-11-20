'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const {root:repository} = require('./energy-wave-harness.cjs');
const root = process.env.KD_RUNTIME_ROOT || repository;
const report = {status:'RUNNING',cases:[]};
const out = process.env.KD_LOGIN_REPORT || path.join(root,'design/poco-energy-preview/tests/login-recovery.json');
const today = '2026-11-20';
const nextDay = '2026-11-21';

async function launch(browser, streak) {
  const page = await browser.newPage({reducedMotion:'reduce'});
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
  await page.clock.install({time:new Date(today+'T12:00:00Z')});
  await page.context().setOffline(true);
  await page.goto('file://'+root+'/index.html');
  await page.clock.fastForward(3500);
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
      await p.clock.fastForward(3500);
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
    await p.clock.fastForward(3500);
    assert.equal(await panel(p),0);
    assert.deepEqual(await snapshot(p),paid);
    report.cases.push({payout:'accountLoginOperation',cloudReplay:3,restart:true,oneFreshPopup:true});
    await p.close();
    report.status='PASS';
    console.log(JSON.stringify(report,null,2));
  }finally{
    fs.mkdirSync(path.dirname(out),{recursive:true});
    fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1});
