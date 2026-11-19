'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const game = require('../tests/energy-wave-harness.cjs');
const output = path.join(game.root,'design/energy-rings-preview');
const baseline = process.argv[2];

async function sample(browser, root, name) {
  const page = await browser.newPage({viewport:{width:430,height:932},deviceScaleFactor:2});
  try {
    // Keep the harness and player actions identical while serving each revision.
    await game.initialize(page,{base:'file://'+root+'/'});
    await game.select(page,6);
    for (const move of [10,14]) await game.rotate(page,move);
    await page.clock.runFor(2300);
    await game.rotate(page,14);
    await page.clock.runFor(1390);
    const state = await game.state(page);
    assert(state.effects.rings.length>=2);
    const clip = await page.locator('#board').boundingBox();
    await page.screenshot({path:path.join(output,name+'.png'),clip});
    return {flow:state,game:await game.snapshot(page)};
  } finally {
    await page.close();
  }
}

(async () => {
  assert(baseline,'Pass the d6c83b3 worktree as the first argument');
  const browser = await chromium.launch({args:['--no-sandbox']});
  try {
    const previous = await sample(browser,baseline,'previous-board');
    const current = await sample(browser,game.root,'current-board');
    assert.deepEqual(previous.game.tiles,current.game.tiles);
    assert.deepEqual(previous.flow.edges,current.flow.edges);
    const measurements = current.flow.effects.rings.map(ring => ({
      cell:ring.cell,
      previousOuterRadius:previous.flow.effects.rings.find(p => p.cell===ring.cell).haloOuterRadius,
      currentOuterRadius:ring.haloOuterRadius
    }));
    assert(measurements.every(m => m.currentOuterRadius>1.25*m.previousOuterRadius));
    fs.writeFileSync(path.join(output,'ring-comparison.json'),JSON.stringify({sameGame:true,level:6,moves:[10,14,14],elapsedMs:1390,measurements},null,2));

    const style = `<style>
      *{box-sizing:border-box}body{margin:0;padding:24px;background:#101214;color:#f7e3b5;font:17px system-ui}
      h1{margin:0 0 12px}h2{font-size:19px}p{color:#dedad0}a{color:#ffdf91}
      .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}
      img{width:100%;height:auto;display:block}.reference{padding:20px;background:#1c1b19;border:1px solid #6f5737}
      video{width:min(100%,500px);display:block;margin:24px auto}
      @media(max-width:650px){body{padding:12px}.grid{gap:12px}h2{font-size:15px}}
    </style>`;
    const header = '<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+style;
    const scenes = [
      ['01-light-off','Işık İzi kapalı'],
      ['02-new-connection','Yeni bağlantı'],
      ['03-bend-rings','Kıvrımlardaki geniş halkalar'],
      ['04-settled','Dalga sonrası sabit ışık'],
      ['05-completion','Tamamlanma dalgası']
    ];
    const gallery = header+'<h1>KARA DÜĞÜM · Enerji Dalgası</h1><p>Gerçek Bölüm 6 · 4×4</p><div class="grid">'+scenes.map(([file,title]) =>
      '<section><h2>'+title+'</h2><a href="'+file+'.png"><img src="'+file+'-board.png" alt="'+title+'"></a></section>').join('')+'</div>';
    fs.writeFileSync(path.join(output,'gallery.html'),gallery);
    const pair = header+'<h1>Önceki ve yeni çizim</h1><p>Bölüm 6, aynı hamle ve aynı oyun durumu</p><div class="grid">'+
      '<section><h2>d6c83b3 · Önceki</h2><img src="previous-board.png" alt="Önceki çizim"></section>'+
      '<section><h2>Yeni</h2><img src="current-board.png" alt="Yeni çizim"></section></div>';
    fs.writeFileSync(path.join(output,'before-after.html'),pair);
    const currentImage = fs.readFileSync(path.join(output,'03-bend-rings-board.png')).toString('base64');
    const comparison = header+`<h1>Örnek 3 ile karşılaştır</h1>
      <div class="grid"><section><h2>Örnek 3 · Referans</h2>
      <div class="reference" id="reference"><label>Referans görselini seç <input id="image" type="file" accept="image/*"></label><p>Görsel bu sayfada, cihazında açılır.</p>
      <p>Geniş beyaz-altın kanal · belirgin sıcak altın çevre · kıvrımlarda yarı saydam halkalar.</p></div>
      <img id="original" hidden alt="Seçtiğin Örnek 3 referansı"></section>
      <section><h2>KARA DÜĞÜM · Bölüm 6</h2><img src="data:image/png;base64,${currentImage}" alt="Gerçek tahtada iki kıvrım halkası ve altın enerji">
      <p>Beyaz uç hareket eder. Altın iz geçici olarak kalır. Dış halkalar kıvrımda genişleyip söner.</p></section></div>
      <script>
        let preview;
        document.getElementById('image').addEventListener('change',event=>{
          const file=event.target.files[0];
          if (!file) return;
          if (preview) URL.revokeObjectURL(preview);
          preview=URL.createObjectURL(file);
          const original=document.getElementById('original');
          original.src=preview;
          original.hidden=false;
        });
      </script>`.replace('img{width','img[hidden]{display:none}img{width');
    fs.writeFileSync(path.join(output,'reference-comparison.html'),comparison);
    const page = await browser.newPage({viewport:{width:1600,height:1000}});
    for (const [file,shot] of [['gallery','five-states'],['before-after','before-after']]) {
      await page.goto('file://'+path.join(output,file+'.html'));
      await page.evaluate(()=>Promise.all([...document.images].map(image=>image.decode())));
      await page.screenshot({path:path.join(output,shot+'.png'),fullPage:true});
    }
    await page.goto('file://'+path.join(output,'reference-comparison.html'));
    // Validate the local image picker with a fixture. The reference itself is supplied by the viewer.
    await page.locator('#image').setInputFiles(path.join(output,'previous-board.png'));
    await page.locator('#original').evaluate(img=>img.decode());
    assert(await page.locator('#original').isVisible());
    console.log(JSON.stringify(measurements));
  } finally {
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1});
