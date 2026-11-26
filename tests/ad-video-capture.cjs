const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(__dirname,'../ad-capture');
fs.mkdirSync(out,{recursive:true});const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const served=html.replace("const savedGame=get64('activeGame',null);","window.__adCapture={plan:rotationPlan,locked:()=>locked};const savedGame=get64('activeGame',null);");assert.notEqual(served,html);
const srv=http.createServer((req,res)=>{const f=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(req.url==='/index.html'){res.setHeader('Content-Type','text/html');res.end(served);return;}if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.webp')?'image/webp':f.endsWith('.png')?'image/png':f.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(f));});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const browser=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage']});try{
const p=await browser.newPage({viewport:{width:540,height:960},deviceScaleFactor:2,locale:'tr-TR',reducedMotion:'no-preference',isMobile:true,hasTouch:true});p.on('pageerror',e=>console.error('PAGE',e.message));p.on('dialog',d=>d.dismiss());await p.clock.install({time:new Date('2026-11-26T12:00:00Z')});await p.goto('http://127.0.0.1:'+srv.address().port+'/index.html');await p.clock.fastForward(2500);if(await p.locator('.kdDailyClose').count())await p.locator('.kdDailyClose').click();await p.clock.fastForward(300);await p.screenshot({path:path.join(out,'home.png')});
await p.evaluate(()=>{localStorage.setItem('kd64_level','300');kdSelectLevel(17);kdNavigate('game');kdOnboarding.leave();kdLearning.leave();kdSetPaused(false);});await p.clock.fastForward(400);await p.clock.pauseAt(new Date(await p.evaluate(()=>Date.now())+1000));
const plan=await p.evaluate(()=>__adCapture.plan());console.log('Plan:',plan?.length);assert(plan?.length>0);await p.screenshot({path:path.join(out,'start.png')});if(process.argv.includes('--preview'))return;
const fps=24,frames=324,start=18,end=269;let cursor=0;const step=(end-start)/plan.length;
for(let i=0;i<frames;i++){
 if(i>=start&&cursor<plan.length&&i>=start+cursor*step){const idx=plan[cursor++];if(!await p.evaluate(()=>__adCapture.locked())){const loc=p.locator('#board .tile[data-i="'+idx+'"]');await loc.evaluate(el=>el.click());}}
 await p.clock.runFor(Math.round(1000/fps));await p.screenshot({path:path.join(out,'g'+String(i).padStart(4,'0')+'.jpg'),type:'jpeg',quality:90});if(i%48===0)console.log('frame',i);
}
const win=await p.evaluate(()=>({...kdLastWin}));console.log('Verified genuine game win',win.level,win.star,win.moves);assert.equal(win.star,3);await p.screenshot({path:path.join(out,'win.png')});
}finally{await browser.close();srv.close()}})().catch(e=>{console.error(e);process.exitCode=1});
