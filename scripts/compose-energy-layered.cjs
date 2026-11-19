'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const game = require('../tests/energy-wave-harness.cjs');
const output = path.join(game.root,'design/energy-layered-preview');
const baseline = process.argv[2];

async function sample(browser, root, name) {
  const page = await browser.newPage({viewport:{width:430,height:932},deviceScaleFactor:2});
  try {
    await game.initialize(page,{base:'file://'+root+'/'});
    await game.select(page,6);
    for (const move of [10,14]) await game.rotate(page,move);
    await page.clock.runFor(2300);
    await game.rotate(page,14);
    await page.clock.runFor(1390);
    const clip = await page.locator('#board').boundingBox();
    await page.screenshot({path:path.join(output,name+'.png'),clip});
    const spacing = await page.locator('#board>.tile').evaluateAll(tiles =>
      tiles[1].getBoundingClientRect().left-tiles[0].getBoundingClientRect().left
    );
    return {spacing,clip,flow:await game.state(page),game:await game.snapshot(page)};
  } finally {
    await page.close();
  }
}

const style = `<style>
 *{box-sizing:border-box}body{margin:0;padding:22px;background:#101214;color:#f7e3b5;font:17px system-ui}
 h1{margin:0 0 16px}h2{font-size:20px}p{color:#dedad0}a{color:#ffdf91}
 .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}
 img{width:100%;height:auto;display:block}img[hidden]{display:none}
 label{display:block;margin:10px 0}input[type=number]{width:7em}.crop{overflow:auto}
 @media(max-width:650px){body{padding:12px}.grid{gap:10px}h2{font-size:15px}}
 </style>`;
const header = '<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+style;

function rows(scenes) {
  return '<div class="grid">'+scenes.map(([file,title]) =>
    '<section><h2>'+title+'</h2><a href="'+file+'.png"><img src="'+file+'-board.png" alt="'+title+'"></a></section>'
  ).join('')+'</div>';
}

(async () => {
  assert(baseline,'Pass the a87fde9 worktree');
  const browser = await chromium.launch({args:['--no-sandbox']});
  try {
    const previous = await sample(browser,baseline,'previous-board');
    const current = await sample(browser,game.root,'current-board');
    assert.deepEqual(previous.game.tiles,current.game.tiles);
    assert.deepEqual(previous.flow.edges,current.flow.edges);
    assert.equal(previous.spacing,current.spacing);
    assert.equal(previous.clip.width,current.clip.width);
    fs.writeFileSync(path.join(output,'scale-proof.json'),JSON.stringify({
      comparison:'a87fde9 game vs layered game',level:6,moves:[10,14,14],
      tileSpacingCssPx:current.spacing,boardWidthCssPx:current.clip.width,
      originalReferenceIncluded:false
    },null,2));
    const scenes = [
      ['01-light-off','Işık İzi kapalı'],
      ['layer-channel','Enerji kanalı'],
      ['02-new-connection','Hareketli dalga'],
      ['03-bend-rings','Kıvrım halkaları ve birleşik görünüm'],
      ['05-completion','Tamamlanma dalgası']
    ];
    const layers = [
      ['layer-channel','Enerji kanalı'],
      ['layer-wave','Hareketli dalga'],
      ['layer-rings','Kıvrım halkaları'],
      ['layer-settled','Kalıcı aydınlatma'],
      ['03-bend-rings','Dört katman birlikte']
    ];
    const pages={
      'five-scenes':header+'<h1>KARA DÜĞÜM · Bölüm 6</h1>'+rows(scenes),
      'four-layers':header+'<h1>Dört katman · aynı hamle ve aynı an</h1>'+rows(layers),
      'before-after':header+'<h1>Aynı ölçekte iki oyun çizimi</h1><p>Bölüm 6 · aynı bağlantılar</p><div class="grid">'+
        '<section><h2>a87fde9 · Önceki</h2><img src="previous-board.png" alt="Önceki oyun çizimi"></section>'+
        '<section><h2>Yeni dört katman</h2><img src="current-board.png" alt="Yeni oyun çizimi"></section></div>'
    };
    const page = await browser.newPage({viewport:{width:1580,height:1000}});
    for (const [name,html] of Object.entries(pages)) {
      fs.writeFileSync(path.join(output,name+'.html'),html);
      await page.goto('file://'+path.join(output,name+'.html'));
      await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode())));
      await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});
    }

    const encoded=fs.readFileSync(path.join(output,'03-bend-rings-board.png')).toString('base64');
    const ref=header+`<h1>Örnek 3 · Taş aralığına göre karşılaştır</h1>
      <label>Özgün Örnek 3 yakın planı <input type="file" id="file" accept="image/*"></label>
      <label>Referansta iki komşu taşın merkezleri arasındaki piksel sayısı <input id="spacing" type="number" min="1" step="1" value="310"></label>
      <div class="grid"><section><h2>Örnek 3</h2><div class="crop"><img alt="Seçilen referans" id="reference" hidden></div></section>
      <section><h2>Gerçek Bölüm 6</h2><img id="game" alt="Dört enerji katmanı birlikte" src="data:image/png;base64,${encoded}"></section></div>
      <script>
       const input=document.getElementById('file'), spacing=document.getElementById('spacing'), reference=document.getElementById('reference'), game=document.getElementById('game');
       const ratio=${current.spacing/current.clip.width};
       let url;
       function align(){
        const pitch=Number(spacing.value);
        if(pitch>0&&reference.naturalWidth)reference.style.width=(reference.naturalWidth*game.clientWidth*ratio/pitch)+'px';
       }
       input.addEventListener('change',()=>{
        if(!input.files[0])return;
        if(url)URL.revokeObjectURL(url);
        url=URL.createObjectURL(input.files[0]);
        reference.src=url;reference.hidden=false;
       });
       reference.addEventListener('load',align);
       spacing.addEventListener('input',align);
       new ResizeObserver(align).observe(game);
      </script>`;
    fs.writeFileSync(path.join(output,'reference-scale.html'),ref);
    await page.goto('file://'+path.join(output,'reference-scale.html'));
    await page.locator('#file').setInputFiles(path.join(output,'previous-board.png'));
    await page.locator('#reference').evaluate(img=>img.decode());
    const dimensions=await page.evaluate(()=>({
      referenceTileCSS:reference.clientWidth*Number(spacing.value)/reference.naturalWidth,
      gameTileCSS:game.clientWidth*ratio
    }));
    assert(Math.abs(dimensions.referenceTileCSS-dimensions.gameTileCSS)<1);
    console.log('PASS: pixel scale matched and local reference picker tested');
  } finally {
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1});
