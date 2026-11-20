'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const H=require('../tests/energy-wave-harness.cjs');
const out=path.join(H.root,'design/poco-energy-preview');
const oldRoot=process.argv[2];

async function capture(browser,root,label){
  const page=await browser.newPage({viewport:{width:430,height:932},deviceScaleFactor:2});
  try{
    await H.initialize(page,{base:'file://'+root+'/',low:true});
    await H.select(page,6);
    for(const i of [10,14])await H.rotate(page,i);
    await page.clock.runFor(2300);
    await H.rotate(page,14);
    await page.clock.runFor(1150);
    const flow=await H.state(page),game=await H.snapshot(page);
    const clip=await page.locator('#board').boundingBox();
    await page.screenshot({path:path.join(out,label+'.png'),clip});
    return {flow,game,clip};
  }finally{await page.close()}
}

(async()=>{
  assert(oldRoot,'pass the TEST2 source directory');
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({args:['--no-sandbox']});
  try{
    const old=await capture(browser,oldRoot,'test2-low');
    const current=await capture(browser,H.root,'test3-low');
    assert.deepEqual(old.game.tiles,current.game.tiles);
    assert.deepEqual(old.flow.edges,current.flow.edges);
    assert.deepEqual(old.clip,current.clip);
    assert(old.flow.static&&old.flow.effects.waves.length===0);
    assert.equal(current.flow.profile,'lightweight');
    assert(current.flow.effects.layers.channel>0&&current.flow.effects.layers.wave>0);
    fs.writeFileSync(path.join(out,'comparison.json'),JSON.stringify({old,current,hardwareSimulated:{cores:2,memoryGb:2}},null,2));
    const page=await browser.newPage({viewport:{width:1580,height:900}});
    const html=`<!doctype html><meta charset="utf-8"><style>body{font:21px system-ui;color:#f6dea8;background:#111317;margin:24px}
      h1{margin:0 0 10px}p{color:#e1dacb}main{display:grid;grid-template-columns:1fr 1fr;gap:24px}img{display:block;width:100%}</style>
      <h1>Bölüm 6 · Işık İzi açık</h1><p>Aynı hamle ve tahta. Tarayıcıya 2 çekirdek ve 2 GB bildirilen test.</p>
      <main><section><h2>TEST2 · Sabit ışık</h2><img src="test2-low.png" alt="TEST2 aynı bağlantı"></section>
      <section><h2>TEST3 · Hafif enerji dalgası</h2><img src="test3-low.png" alt="TEST3 hareketli enerji"></section></main>`;
    fs.writeFileSync(path.join(out,'comparison.html'),html);
    await page.goto('file://'+path.join(out,'comparison.html'));
    await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
    await page.screenshot({path:path.join(out,'before-after.png'),fullPage:true});
    console.log('PASS: TEST2 reproduces static light. TEST3 low profile renders visible wave on same graph.');
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
