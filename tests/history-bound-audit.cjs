'use strict';
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const anchor="const savedGame=get64('activeGame',null);";
// Read-only observations; all state transitions below come from the shipped click/undo handlers.
const observation=`window.__historyBoundAudit={
 length:()=>history.length,
 locked:()=>locked,
 snapshot:()=>({level,n,tiles:tiles.slice(),fixed:fixed.slice(),sealed:sealed.slice(),keys:keys.slice(),fog:fog.slice(),rotCount:rotCount.slice(),targetDone:targetDone.slice(),ice:ice.slice(),moves,undos,history:history.length,blocked:window.kdExtra.blockedIndex,locked})
};`;
const html=source.replace(anchor,observation+anchor);
assert.notEqual(html,source,'Game observation hook is missing');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
  res.writeHead(404);res.end();return;
 }
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webp')?'image/webp':file.endsWith('.png')?'image/png':'text/html');
 res.end(file===path.join(root,'index.html')?html:fs.readFileSync(file));
});
const boardState=({history,undos,...state})=>state;

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},locale:'tr-TR',reducedMotion:'reduce'});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('dialog',dialog=>dialog.accept());
  await page.addInitScript(()=>{
   localStorage.setItem('kd64_level','300');
   localStorage.setItem('kd3_sound','0');
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await page.locator('.kdDailyClose').click();
  await page.locator('#kdSplash').waitFor({state:'detached'});

  for(const level of [22,292]){
   await page.evaluate(level=>{kdSelectLevel(level);kdNavigate('game');},level);
   const initial=await page.evaluate(()=>__historyBoundAudit.snapshot());
   assert.equal(initial.n,level===22?5:8);
   assert.equal(initial.moves,0);
   assert.equal(initial.history,0);
   assert.equal(initial.locked,false);
   const resources=await page.evaluate(()=>Object.fromEntries(['coins','xp','hintCoupons'].map(key=>[key,localStorage.getItem('kd64_'+key)])));

   // Following the moving blocker is legal, but it does not rotate tiles or spend moves.
   const chased=await page.evaluate(()=>{
    let peak=0;
    for(let step=0;step<500;step++){
     const index=kdExtra.blockedIndex;
     document.querySelector(`#board>.tile[data-i="${index}"]`).click();
     peak=Math.max(peak,__historyBoundAudit.length());
     if(__historyBoundAudit.locked())throw Error('Following the blocker unexpectedly finished the level');
    }
    return {...__historyBoundAudit.snapshot(),peak};
   });
   assert.equal(chased.peak,120);
   assert.equal(chased.history,120,'Level '+level+': blocker snapshots must stop at 120');
   assert.equal(chased.blocked,(initial.blocked+500)%(initial.n*initial.n));
   assert.equal(chased.moves,0);
   assert.deepEqual(chased.tiles,initial.tiles);
   assert.deepEqual(chased.rotCount,initial.rotCount);
   assert.equal(chased.locked,false);

   await page.locator('#undo').click();
   const afterBlockerUndo=await page.evaluate(()=>__historyBoundAudit.snapshot());
   assert.equal(afterBlockerUndo.history,119);
   assert.equal(afterBlockerUndo.blocked,(initial.blocked+499)%(initial.n*initial.n));
   assert.equal(afterBlockerUndo.moves,0);
   assert.equal(afterBlockerUndo.undos,chased.undos+1);
   assert.deepEqual(afterBlockerUndo.tiles,initial.tiles);
   assert.deepEqual(afterBlockerUndo.rotCount,initial.rotCount);

   // Repeated ordinary legal rotations use the same bounded history and remain undoable.
   const rotated=await page.evaluate(()=>{
    const start=__historyBoundAudit.snapshot();
    const index=start.tiles.findIndex((mask,i)=>!start.fixed[i]&&i!==start.blocked&&(((mask<<1)&15)|(mask>>3))!==mask);
    if(index<0)throw Error('No free, rotatable tile is available');
    let previous=null,peak=0;
    for(let step=0;step<500;step++){
     if(step===499)previous=__historyBoundAudit.snapshot();
     document.querySelector(`#board>.tile[data-i="${index}"]`).click();
     peak=Math.max(peak,__historyBoundAudit.length());
     if(__historyBoundAudit.locked())throw Error('Single-tile rotation unexpectedly finished the level');
    }
    return {index,previous,peak,after:__historyBoundAudit.snapshot()};
   });
   assert.equal(rotated.peak,120);
   assert.equal(rotated.after.history,120);
   assert.equal(rotated.after.moves,afterBlockerUndo.moves+500);
   assert.equal(rotated.after.blocked,(rotated.index+1)%(initial.n*initial.n));
   assert.deepEqual(rotated.after.tiles,initial.tiles,'Five hundred quarter turns must restore the same masks');
   assert.equal(rotated.after.rotCount[rotated.index],initial.rotCount[rotated.index]+500);

   await page.locator('#undo').click();
   const afterRotationUndo=await page.evaluate(()=>__historyBoundAudit.snapshot());
   assert.equal(afterRotationUndo.history,119);
   assert.equal(afterRotationUndo.undos,rotated.previous.undos+1);
   assert.deepEqual(boardState(afterRotationUndo),boardState(rotated.previous),'Undo must restore the last ordinary move, including blocker and rotation counters');
   assert.deepEqual(await page.evaluate(()=>Object.fromEntries(['coins','xp','hintCoupons'].map(key=>[key,localStorage.getItem('kd64_'+key)]))),resources,'History activity must not change the wallet');
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: levels 22/292 retain 120 snapshots after 500 blocker chases and 500 ordinary rotations; both undos restore the previous state with 119 entries, without changing tiles during blocker movement or paying resources');
 }finally{
  await browser.close();server.close();
 }
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
