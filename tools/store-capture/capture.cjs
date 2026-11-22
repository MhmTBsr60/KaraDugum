const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const source = path.resolve('game'), output = path.resolve('screens');
const media = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.png':'image/png', '.webp':'image/webp' };
const server = http.createServer((req,res)=>{
  const f=path.resolve(source,'.'+new URL(req.url,'http://localhost').pathname);
  if (!f.startsWith(source+path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404).end(); return; }
  res.writeHead(200,{'Content-Type':media[path.extname(f)] || 'application/octet-stream'}); fs.createReadStream(f).pipe(res);
});
async function run(){
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
  const records=[];
  try{
    for (const [locale,lang] of [['en-US','en'],['ar','ar'],['de-DE','de'],['fr-FR','fr'],['es-ES','es']]){
      const ctx=await browser.newContext({viewport:{width:360,height:640},deviceScaleFactor:3,isMobile:true,hasTouch:true,locale,reducedMotion:'reduce'});
      await ctx.route('**/*',route=>route.request().url().startsWith(origin+'/') ? route.continue() : route.abort());
      const p=await ctx.newPage(); const errors=[];p.on('pageerror',err=>errors.push(err.message));
      await p.addInitScript(lang=>{
        localStorage.setItem('kd6_lang',lang);
        localStorage.setItem('kd64_level','17');
        localStorage.setItem('kd64_completed',JSON.stringify(Object.fromEntries(Array.from({length:16},(_,i)=>[i+1,2]))));
        localStorage.setItem('kd64_coins','240');localStorage.setItem('kd64_xp','800');
      },lang);
      const folder=path.join(output,locale);fs.mkdirSync(folder,{recursive:true});
      await p.goto(origin+'/index.html');
      await p.waitForFunction(l=>typeof kdNavigate==='function' && document.documentElement.lang===l,lang);
      await p.waitForTimeout(2600);
      async function prepare(){
        const close=p.locator('.kdDailyClose'); if(await close.isVisible()) await close.click();
        await p.evaluate(async()=>{
          document.activeElement?.blur(); window.scrollTo(0,0);
          await document.fonts.ready;
          await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width>0).map(i=>i.decode().catch(()=>{})));
          await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
        });
      }
      async function shot(num,name,selector){
        await p.locator(selector).first().waitFor({state:'visible'});await prepare();
        if (lang==='ar' && name==='levels') {
          await p.locator('.kdChapterTabs').evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
          await p.waitForFunction(()=>Math.abs(document.querySelector('.kdChapterTabs').getBoundingClientRect().top)<12);
        }
        const data=await p.evaluate(()=>({lang:document.documentElement.lang,dir:document.documentElement.dir,width:document.documentElement.scrollWidth,viewport:innerWidth,text:document.body.innerText.slice(0,2200),broken:[...document.images].filter(i=>i.getBoundingClientRect().width>0&&!i.naturalWidth).map(i=>i.getAttribute('src'))}));
        assert.equal(data.lang,lang);assert.equal(data.dir,lang==='ar'?'rtl':'ltr');assert(data.width<=data.viewport+2,locale+'/'+name+' page overflow');assert.deepEqual(data.broken,[]);
        if(name==='shop'){
          const banner=p.locator('.kdLocalizedShopBanner'), header=p.locator('.kdRefHeader').first();
          await banner.waitFor({state:'visible'});let box=await banner.boundingBox(),head=await header.boundingBox();
          assert(head.y>=-1 && box.y>=0 && box.y+box.height<=640,'Shop top cropped: '+JSON.stringify([head,box]));data.banner=await banner.innerText();assert(data.banner.length>4&&!data.banner.includes('Özel ipucu'));
        }
        const file='KD652-'+locale+'-'+num+'-'+name+'.jpg';
        await p.screenshot({path:path.join(folder,file),type:'jpeg',quality:96,animations:'disabled'});
        records.push({locale,file,...data});console.log('Captured',locale,name);
      }
      const go=name=>p.evaluate(route=>kdNavigate(route),name);
      await go('home');await shot('02','home','.kdExactHome');
      await go('levels');await shot('03','levels','.kdJourneyGrid');
      await go('shop');await shot('04','shop','.kdRefBanner');
      await go('home');await p.evaluate(()=>kdOpenExtras('quests'));await shot('05','quests','#v9Close');await p.locator('#v9Close').click();
      await go('workshop');await p.locator('[data-workshop-start="energy-1"]').click();await shot('06','workshop','[data-workshop-tile="0"]');
      assert.deepEqual(errors,[]); await ctx.close();
    }
    assert.equal(records.length,25);fs.writeFileSync(path.join(output,'capture.json'),JSON.stringify(records,null,2));
  }finally{await browser.close();server.close();}
}
run().catch(e=>{console.error(e);server.close();process.exitCode=1});
