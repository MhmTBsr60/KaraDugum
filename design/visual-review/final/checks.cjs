/* Real game DOM in isolated Chromium; never a player save, Android or live ad test. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,serve,init,variant,select,snapshot}=require('./harness.cjs');
const levels=[11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,53,91,151,156,201];
const viewports=[{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:1024,height:768},{width:844,height:390}];
const report={scope:'Preview only; no root game changes; isolated Chromium, no Android device',baseMain:'40b165edf3cd6fad7bc43f7a812c31fa872b79f1',checks:[],effects:[],errors:[],limitations:['No physical Android, emulator, GPU, thermal, ANR or live ad verification']};
(async()=>{const {server,url}=await serve(),b=await chromium.launch({args:['--no-sandbox']});
try {
  for(const lang of ['tr','en','ar','zh']){
    const p=await init(b,url,lang);p.on('pageerror',e=>report.errors.push(e.message));
    for(const viewport of viewports){await p.setViewportSize(viewport);for(const level of levels){
      await variant(p,'current');await select(p,level);const before=await snapshot(p);
      for(const name of ['A','final']){await variant(p,name);await p.clock.runFor(20);assert.deepEqual(await snapshot(p),before,JSON.stringify({lang,viewport,level,name}));}
      const measure=await p.evaluate(()=>{const board=document.getElementById('board').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth-innerWidth,boardInside:board.left>=0&&board.right<=innerWidth+1&&board.top>=0&&board.bottom<=innerHeight+1,tilePx:document.querySelector('#board>.tile').getBoundingClientRect().width};});
      assert(measure.overflow<=1&&measure.boardInside,JSON.stringify({lang,viewport,level,measure}));
      report.checks.push({lang,viewport,level,variantsEquivalent:true,...measure});
    }}
    console.log('PASS: '+lang+' — 100 three-way state/SVG/energy/save/button-geometry/layout comparisons');await p.close();
  }
  const p=await init(b,url);p.on('pageerror',e=>report.errors.push(e.message));await variant(p,'final');await select(p,53);
  await p.emulateMedia({reducedMotion:'no-preference'});await p.evaluate(()=>document.body.classList.remove('kdNoGlow'));
  const css=()=>p.evaluate(()=>{
    const tile=document.querySelector('#board>.tile'),board=document.getElementById('board'),panel=document.querySelector('.kdWinPanel');
    return {tap:{name:getComputedStyle(tile.querySelector('.kdPipeFilament')).animationName,duration:getComputedStyle(tile.querySelector('.kdPipeFilament')).animationDuration,transform:getComputedStyle(tile).transform},connection:getComputedStyle(document.querySelector('#board .kdPipeFilament')).transitionDuration,complete:{name:getComputedStyle(board,'::after').animationName,duration:getComputedStyle(board,'::after').animationDuration},panel:panel?{name:getComputedStyle(panel).animationName,duration:getComputedStyle(panel).animationDuration}:null};
  });
  await p.evaluate(()=>document.querySelector('#board>.tile:not(.good)').click());
  // First tile is not necessarily the clicked one; inspect actual flash target.
  const tap=await p.locator('#board>.tile.flash').evaluate(e=>({name:getComputedStyle(e.querySelector('.kdPipeFilament')).animationName,duration:getComputedStyle(e.querySelector('.kdPipeFilament')).animationDuration,transform:getComputedStyle(e).transform}));
  assert.deepEqual(tap,{name:'kdFinalTap',duration:'0.14s',transform:'none'});assert.equal((await css()).connection,'0.16s');
  // Cross-check local alignment against core's countValid reciprocity without disclosing fog.
  const alignment=await p.evaluate(()=>{const saved=JSON.parse(localStorage.getItem('kd64_activeGame')),cells=[...document.querySelectorAll('#board>.tile')],n=saved.n||Math.sqrt(cells.length);let expected=[];
    saved.tiles.forEach((v,i)=>{let ok=!!v&&!saved.fog[i];for(const [bit,dr,dc,opp] of [[1,-1,0,4],[2,0,1,8],[4,1,0,1],[8,0,-1,2]]){if(!(v&bit))continue;const r=Math.floor(i/n)+dr,c=i%n+dc,j=r*n+c;if(r<0||c<0||r>=n||c>=n||!(saved.tiles[j]&opp)||saved.fog[j])ok=false;}if(ok)expected.push(i);});return {expected,actual:cells.filter(e=>e.hasAttribute('data-kd-final-linked')).map(e=>Number(e.dataset.i)),valid:__visualAudit.valid()};});assert.deepEqual(alignment.actual,alignment.expected);
  report.effects.push({tap,connectionMs:160,alignment});
  await select(p,151);assert(await p.locator('#board').evaluate(e=>e.hasAttribute('data-kd-final-dense')));assert.equal((await css()).connection,'0s');
  await p.evaluate(()=>document.querySelector('#board>.tile:not(.good)').click());assert.equal(await p.locator('#board>.tile.flash').evaluate(e=>getComputedStyle(e.querySelector('.kdPipeFilament')).animationDuration),'0.14s');
  report.effects.push({dense:'8x8: no 64-tile transitions; one existing 140ms SVG filament; no new overlay/filter'});
  await select(p,11);await p.evaluate(()=>{for(const i of __visualAudit.plan())document.querySelector(`#board>.tile[data-i="${i}"]`).click();});await p.clock.runFor(20);
  await p.locator('.kdWinPanel').waitFor({state:'attached'});const win=await css();assert.equal(win.complete.name,'kdFinalComplete');assert.equal(win.complete.duration,'0.45s');assert.equal(win.panel.name,'kdFinalPanel');assert.equal(win.panel.duration,'0.22s');
  const run=await p.locator('#board').getAttribute('data-kd-final-complete');assert(run);const saved=await snapshot(p);await p.evaluate(()=>{kdFinalPreview.sync();document.querySelector('.kdWinPanel').classList.add('audit-cosmetic')});await p.clock.runFor(480);assert.equal(await p.locator('#board').getAttribute('data-kd-final-complete'),run);assert.deepEqual(await snapshot(p),saved);
  report.effects.push({legalSolveLevel:11,win,oncePerRun:true,rewardsAndSavesUnchangedByPreview:true});
  await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>document.querySelector('#board>.tile').classList.add('flash'));let reduced=await css();assert.equal(reduced.tap.name,'none');assert.equal(reduced.complete.name,'none');assert.equal(reduced.panel.name,'none');assert.equal(reduced.connection,'0s');report.effects.push({reducedMotion:reduced});
  await p.emulateMedia({reducedMotion:'no-preference'});await p.evaluate(()=>document.body.classList.add('kdNoGlow'));reduced=await css();assert.equal(reduced.tap.name,'none');assert.equal(reduced.complete.name,'none');assert.equal(reduced.panel.name,'none');report.effects.push({lightSettingOff:reduced});
  await p.locator('.kdWinClose').click();await select(p,53);assert.equal(await p.locator('#board').getAttribute('data-kd-final-complete'),null);
  const cacheCheck=await p.evaluate(async()=>{
    let checked=0;
    for(let level=1;level<=300;level++){
      kdSelectLevel(level);kdNavigate('game');kdLearning.leave();kdSetPaused(true);
      for(let move=0;move<4;move++){
        await Promise.resolve();
        const cells=[...document.querySelectorAll('#board>.tile')],n=Math.sqrt(cells.length),masks=cells.map(e=>Number(e.dataset.pipe)),shown=cells.map(e=>!!e.querySelector('svg[data-pipe-mask]'));
        cells.forEach((cell,i)=>{let ok=masks[i]>0&&shown[i];for(const [bit,dr,dc,opp] of [[1,-1,0,4],[2,0,1,8],[4,1,0,1],[8,0,-1,2]]){if(!(masks[i]&bit))continue;const r=Math.floor(i/n)+dr,c=i%n+dc,j=r*n+c;if(r<0||c<0||r>=n||c>=n||!(masks[j]&opp)||!shown[j])ok=false;}if(cell.hasAttribute('data-kd-final-linked')!==ok)throw new Error('Stale alignment '+level+'/'+move+'/'+i);});
        checked++;
        const free=cells.filter(e=>!e.classList.contains('good'));free[(move*7+3)%free.length]?.click();
      }
    }
    return {levels:300,states:checked};
  });
  assert.equal(cacheCheck.states,1200);report.effects.push({incrementalAlignment:cacheCheck});
  await p.clock.runFor(250);
  const count=await p.evaluate(()=>kdFinalPreview.stats().syncs);await p.clock.runFor(1000);assert.equal(await p.evaluate(()=>kdFinalPreview.stats().syncs),count,'No idle observer loop');
  await p.evaluate(()=>{kdFinalPreview.destroy()});assert.equal(await p.locator('[data-kd-final-linked],[data-kd-final-dense],[data-kd-final-complete]').count(),0);
  assert.deepEqual(report.errors,[]);report.status='pass';console.log('PASS: 400 three-way comparisons + real tap/legal win timings, dense/reduced-motion/light-off/lifecycle checks');
}finally{fs.writeFileSync(path.join(__dirname,'checks.json'),JSON.stringify(report,null,2));await b.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
