'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,serve,init,variant,select,snapshot}=require('./harness.cjs');
(async()=>{const {server,url}=await serve(),b=await chromium.launch({args:['--no-sandbox']});try{
 const p=await init(b,url,'tr',{width:390,height:844},{dpr:3});await select(p,53);const same=await snapshot(p);
 for(const name of ['current','A','final']){
  await variant(p,name);await p.clock.runFor(20);assert.deepEqual(await snapshot(p),same);
  await p.screenshot({path:path.join(__dirname,name+'.jpg'),type:'jpeg',quality:97});
  if(name==='final'){await p.locator('#board>.tile').first().screenshot({path:path.join(__dirname,'node.jpg'),type:'jpeg',quality:98});const d=await p.locator('#board>.tile .kdPipeFilament').first().getAttribute('d');const file=path.join(__dirname,'motion.html');fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace(/data-kd-real-filament d="[^"]*"/,'data-kd-real-filament d="'+d+'"'));}
  const clip=await p.locator('#board').evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x-12,y:r.y-12,width:r.width+24,height:r.height+24}});
  await p.screenshot({path:path.join(__dirname,name+'-board.jpg'),type:'jpeg',quality:98,clip});
 }
 for(const [id,viewport,level] of [['compact-8x8',{width:320,height:568},151],['tablet-8x8',{width:768,height:1024},151],['landscape-8x8',{width:844,height:390},151]]){
  await p.setViewportSize(viewport);await select(p,level);await variant(p,'final');await p.screenshot({path:path.join(__dirname,id+'.jpg'),type:'jpeg',quality:95});
 }
 // All contact sheets are browser-rendered from native-resolution captures; no invented board artwork.
 const viewer=await b.newPage({viewport:{width:1278,height:1400},deviceScaleFactor:3,reducedMotion:'reduce'});
 for(const id of ['comparison','boards']){
  await viewer.goto(url+'/design/visual-review/final/'+id+'.html');await viewer.waitForFunction(()=>[...document.images].every(e=>e.complete&&e.naturalWidth));
  await viewer.setViewportSize({width:1278,height:Math.ceil(await viewer.locator('body').evaluate(e=>e.getBoundingClientRect().height))});
  await viewer.screenshot({path:path.join(__dirname,id+'-large.jpg'),type:'jpeg',quality:97,fullPage:true});
 }
 await viewer.emulateMedia({reducedMotion:'no-preference'});
 await viewer.goto(url+'/design/visual-review/final/motion.html');
 await viewer.waitForFunction(()=>[...document.images].every(e=>e.complete&&e.naturalWidth));
 for(const [id,duration] of [['tap','0.14s'],['finish','0.45s'],['result','0.22s']]){
  await viewer.locator('[data-demo="'+id+'"]').click();await viewer.waitForFunction(id=>document.getElementById(id).classList.contains('go'),id);
  assert.equal(await viewer.locator('#'+id).evaluate((e,id)=>getComputedStyle(id==='tap'?e.querySelector('path'):e,id==='finish'?'::after':null).animationDuration,id),duration);
 }
 await viewer.emulateMedia({reducedMotion:'reduce'});
 for(const id of ['tap','finish','result'])assert.equal(await viewer.locator('#'+id).evaluate((e,id)=>getComputedStyle(id==='tap'?e.querySelector('path'):e,id==='finish'?'::after':null).animationName,id),'none');
 await viewer.setViewportSize({width:320,height:568});assert.equal(await viewer.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 assert.equal(await viewer.evaluate(()=>localStorage.length),0,'Static review must not create player data');
 const images=Object.fromEntries(fs.readdirSync(__dirname).filter(f=>f.endsWith('.jpg')).map(f=>[f,{bytes:fs.statSync(path.join(__dirname,f)).size,sha256:require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(__dirname,f))).digest('hex')}]));
 fs.writeFileSync(path.join(__dirname,'capture.json'),JSON.stringify({status:'pass',level:53,grid:'6x6',deviceScaleFactor:3,identicalStateAndSavesAndButtons:true,staticDemoTimingAndReducedMotion:true,staticDemoNoStorage:true,images},null,2));
 console.log('PASS: 3 identical level-53 states captured at 3x, two large contact sheets + compact/tablet/landscape 8x8 captures');
}finally{await b.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1});
