'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),served=html.replace("const savedGame=get64('activeGame',null);","window.__starAudit={plan:rotationPlan,locked:()=>locked};const savedGame=get64('activeGame',null);");assert.notEqual(served,html);
const server=http.createServer((req,res)=>{const f=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(req.url==='/index.html'){res.setHeader('Content-Type','text/html');res.end(served);return;}if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.webp')?'image/webp':f.endsWith('.png')?'image/png':'text/html');res.end(fs.readFileSync(f));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({args:['--no-sandbox']});try{
 for(const expected of [1,2,3]){
  const p=await browser.newPage({viewport:{width:390,height:844},locale:'tr-TR',reducedMotion:'no-preference'}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.clock.install({time:new Date('2026-11-25T09:00:00Z')});
  await p.goto('http://127.0.0.1:'+server.address().port+'/index.html');await p.clock.fastForward(2500);
  await p.locator('.kdDailyClose').click();
  await p.evaluate(()=>{localStorage.setItem('kd64_level','300');kdSelectLevel(17);kdNavigate('game');kdOnboarding.leave();kdLearning.leave();kdSetPaused(false);});
  assert.equal(await p.locator('.kdStarGoalButton').textContent(),'★★★');
  if(expected===1)await p.evaluate(()=>{const plan=__starAudit.plan();document.querySelector('#board .tile[data-i="'+plan[0]+'"]').click();document.getElementById('undo').click();});
  if(expected===2){const limit=await p.evaluate(()=>kdGetLearningState().targets.seconds);await p.clock.fastForward((limit+2)*1000);}
  await p.evaluate(()=>{const plan=__starAudit.plan();if(!plan)throw Error('No legal solution');for(const i of plan){if(__starAudit.locked())break;document.querySelector('#board .tile[data-i="'+i+'"]').click();}});
  const win=await p.evaluate(()=>({...kdLastWin}));assert.equal(win.star,expected,'Actual game award must match intended test scenario');
  const flourish=p.locator('.kdV9Win');assert.equal(await flourish.count(),1);
  assert.equal(await flourish.textContent(),Array(expected).fill('★').join(' '));assert.equal(await flourish.getAttribute('data-earned-stars'),String(expected));
  assert.equal(await p.locator('.kdWinPanel .kdWinStars .on').count(),expected);
  assert.equal(await p.locator('.kdStarGoalButton').textContent(),'★'.repeat(expected));assert.equal(await p.locator('.kdWinPanel .kdWinStars .off').count(),3-expected);
  assert.equal(win.xp,40+expected*20);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('kd64_completed'))[17]),expected);
  await p.clock.fastForward(1300);assert.equal(await flourish.count(),0);
  await p.evaluate(()=>kdAdvanceLevel(true));assert.equal(await p.locator('.kdStarGoalButton').textContent(),'★★★');assert.equal(await p.locator('.kdV9Win').count(),0);
  assert.deepEqual(errors,[]);console.log('PASS: '+expected+' earned stars, matching board celebration, goal badge and result panel; replay resets badge');
  await p.close();
 }
}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);process.exitCode=1});
