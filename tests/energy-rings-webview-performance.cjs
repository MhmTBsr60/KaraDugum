/* Fresh Android WebView context with the real animation clock. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {_android} = require('playwright');
const out = process.env.KD_WAVE_ANDROID_OUT || '/tmp/kd-energy-rings-android';

(async () => {
 const [device] = await _android.devices();
 assert(device,'Android emulator required');
 const report = {status:'RUNNING',clockControlled:false,phoneVerified:false,cases:[]};
 try {
  const webview = await device.webView({pkg:'org.chromium.webview_shell'});
  const page = await webview.page();
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.addInitScript(() => {
   Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});
   Object.defineProperty(navigator,'deviceMemory',{get:()=>8});
   localStorage.setItem('kd64_level','300');
   localStorage.setItem('kd64_hintCoupons','3000');
   localStorage.setItem('kd3_sound','0');
   localStorage.setItem('kd6_lang','tr');
  });
  await page.goto('http://127.0.0.1:8765/index.html');
  await page.waitForTimeout(3200);
  for (const level of [76,151]) {
   await page.evaluate(level => {
    document.querySelector('.kdDailyClose')?.click();
    document.querySelector('.kdWinReplay')?.click();
    kdSelectLevel(level);
    kdNavigate('game');
    kdOnboarding.leave();
    kdLearning.leave();
    kdSetPaused(true);
   },level);
   await page.waitForFunction(() => kdPipeFlow.state().canvas && !kdPipeFlow.state().static);
   const framesBefore = await page.evaluate(() => kdPipeFlow.state().stats.frames);
   await page.evaluate(() => {
    for (let k=0; !kdGetLearningState().locked && k<800; k++) {
     document.getElementById('hint').click();
    }
    if (!kdGetLearningState().locked) throw Error('Stress fixture must reach actual engine win');
   });
   await page.waitForTimeout(3200);
   const stress = await page.evaluate(() => kdPipeFlow.state());
   const count = stress.stats.frames-framesBefore;
   const paint = stress.stats.paintMs.slice(-Math.max(1,count)).sort((a,b)=>a-b);
   const result = {level,tiles:stress.ports.length,edges:stress.edges.length,paintSamples:count,
    paintP95Ms:paint[Math.ceil(paint.length*.95)-1],paintMaxMs:paint.at(-1),finite:!stress.wave,
    static:stress.static};
   report.cases.push(result);
   console.log('Android WebView canvas paint',JSON.stringify(result));
   assert(count>=10 && result.finite && !stress.static,'Live stress run must render a finite wave');
   assert(result.paintP95Ms<20,'Android WebView JS paint exceeds 20 ms at p95');
  }
  report.status='PASS';
 } finally {
  fs.writeFileSync(path.join(out,'webview-performance.json'),JSON.stringify(report,null,2));
  await device.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1});
