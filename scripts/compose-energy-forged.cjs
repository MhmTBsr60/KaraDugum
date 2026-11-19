'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const game=require('../tests/energy-wave-harness.cjs');
const output=path.join(game.root,'design/energy-forged-preview');

async function reference(browser,root,label) {
  const page=await browser.newPage({viewport:{width:430,height:932},deviceScaleFactor:2});
  try{
    await game.initialize(page,{query:'?energyPreview=1',base:'file://'+root+'/'});
    await game.select(page,6);
    for(const move of [10,14])await game.rotate(page,move);
    await page.clock.runFor(2300);
    await game.rotate(page,14);
    await page.clock.runFor(1390);
    const active=await game.state(page),snapshot=await game.snapshot(page);
    assert(active.effects.rings.length>=2);
    const clip=await page.locator('#board').boundingBox();
    await page.screenshot({path:path.join(output,label+'-motion.png'),clip});
    await page.locator('#kdPipeFlowCanvas').evaluate(el=>el.style.setProperty('display','none','important'));
    await page.screenshot({path:path.join(output,label+'-metal.png'),clip});
    const geometry=await page.locator('#board>.tile').evaluateAll(tiles=>tiles.map(tile=>({
      path:tile.querySelector('.kdPipeShell')?.getAttribute('d'),
      cuffs:[...tile.querySelectorAll('.kdPipeCollar')].map(cuff=>[
        cuff.getAttribute('transform'),...['x','y','width','height'].map(key=>cuff.querySelector('rect').getAttribute(key))
      ])
    })));
    const elbowDetail={
      x:clip.x+clip.width*.26,y:clip.y+clip.height*.51,
      width:clip.width*.48,height:clip.height*.47
    };
    await page.screenshot({path:path.join(output,label+'-metal-detail.png'),clip:elbowDetail});
    return {snapshot,clip,edges:active.edges,geometry};
  }finally{await page.close()}
}

const style=`<style>
 *{box-sizing:border-box}body{margin:0;padding:22px;background:#101214;color:#f7e3b5;font:18px system-ui}
 h1{margin:0 0 16px}h2{font-size:19px}p{color:#dbd5c9}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
 img{display:block;width:100%;height:auto}a{color:inherit}
 </style>`;
const header='<!doctype html><html lang="tr"><meta charset="utf-8">'+style;
const card=(file,title,link)=>'<section><h2>'+title+'</h2>'+(link?'<a href="'+link+'">':'')+
  '<img alt="'+title+'" src="'+file+'.png">'+(link?'</a>':'')+'</section>';

(async()=>{
  const oldRoot=process.argv[2];assert(oldRoot,'Pass the dd29df6 worktree');
  const browser=await chromium.launch({args:['--no-sandbox']});
  try {
    const old=await reference(browser,oldRoot,'previous');
    const current=await reference(browser,game.root,'new');
    assert.deepEqual(old.snapshot.tiles,current.snapshot.tiles);
    assert.deepEqual(old.edges,current.edges);
    assert.deepEqual(old.clip,current.clip);
    assert.deepEqual(old.geometry,current.geometry);
    const p=await browser.newPage({viewport:{width:1580,height:1000}});
    const comparison=header+'<h1>Aynı hamle, önceki ve yeni Bölüm 6</h1><div class="grid">'+
      card('previous-metal','TEST1 · Enerji kapalı')+card('new-metal','TEST2 · Enerji kapalı')+
      card('previous-motion','TEST1 · Dalga')+card('new-motion','TEST2 · Dalga, halkalar ve taş ışığı')+'</div>';
    const scenes=[
      ['01-light-off','Işık İzi kapalı'],['02-bend-rings','Dalga, halkalar ve taş yansıması'],
      ['03-settled','Kalıcı ışık'],['04-completion','Tamamlanma dalgası']
    ];
    const gallery=header+'<h1>KARA DÜĞÜM · Bölüm 6</h1><div class="grid">'+
      scenes.map(([name,title])=>card(name+'-board',title,name+'.png')).join('')+'</div>';
    const detail=header+'<h1>Bölüm 6 · Kıvrımlar ve manşetler</h1><div class="grid">'+
      card('previous-metal-detail','TEST1')+card('new-metal-detail','TEST2')+'</div>';
    for(const [name,html] of [['before-after',comparison],['four-scenes',gallery],['metal-detail',detail]]){
      fs.writeFileSync(path.join(output,name+'.html'),html);
      await p.goto('file://'+path.join(output,name+'.html'));
      await p.evaluate(()=>Promise.all([...document.images].map(img=>img.decode())));
      await p.screenshot({path:path.join(output,name+'.png'),fullPage:true});
    }
    fs.writeFileSync(path.join(output,'comparison-proof.json'),JSON.stringify({
      previous:'dd29df6',level:6,sameTileMasks:true,sameGraph:true,sameViewport:true,sameSvgPathsAndCuffBounds:true,elapsedMs:1390
    },null,2)+'\n');
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
