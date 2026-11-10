'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
assert.match(fs.readFileSync(path.join(root,'AndroidManifest.xml'),'utf8'),/<application\b[^>]*android:supportsRtl="true"/,'Android RTL APIs require the manifest opt-in as well as HTML direction');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace("const savedGame=get64('activeGame',null);","window.__globalSnapshot=()=>({level,tiles:tiles.slice(),moves,hints,usedHints,undos,layer:window.kdExtra.layer});const savedGame=get64('activeGame',null);");
assert(html.includes('window.__globalSnapshot'), 'Read-only save inspection hook');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');
 res.end(file.endsWith('/index.html')?html:fs.readFileSync(file));
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 const base=`http://127.0.0.1:${server.address().port}`,errors=[];
 let screens=0;
 try{
  const p=await browser.newPage({viewport:{width:390,height:844},locale:'tr-TR',reducedMotion:'reduce'});
  p.on('pageerror',error=>errors.push(error.message));
  await p.addInitScript(()=>{window.nativeLanguages=[];window.legalCalls=[];window.KaraNative={setLanguage(code){nativeLanguages.push(code)},openPrivacyPolicy(){legalCalls.push('privacy')},openAccountDeletion(){legalCalls.push('deletion')}};});
  await p.clock.install({time:new Date('2026-11-10T12:00:00Z')});
  await p.goto(base+'/index.html');await p.clock.fastForward(2500);
  if(await p.locator('.kdDailyClose').count())await p.locator('.kdDailyClose').click();
  await p.evaluate(()=>{localStorage.setItem('kd64_level','300');localStorage.setItem('kd64_hintCoupons','7');kdSelectLevel(21);kdNavigate('game');document.querySelector('#board>.tile').click();kdNavigate('settings')});
  const snapshot=()=>p.evaluate(()=>({game:__globalSnapshot(),resources:Object.fromEntries(['level','coins','xp','best','completed','hintCoupons','stars'].map(key=>[key,localStorage.getItem('kd64_'+key)]))}));
  const saved=await snapshot();
  async function inspect(code,route){
   const state=await p.evaluate(()=>{
    const leaked=[];let n;const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    while(n=walker.nextNode()){
     const e=n.parentElement,s=n.nodeValue.trim();
     if(!e||e.closest('script,style,option,textarea,#kdLanguageControl,[data-no-translate]')||!e.getClientRects().length||!s)continue;
     if(s==='Türkçe · English · العربية · 中文')continue; // Language autonyms are intentionally unchanged.
     if(/[çğıöşüÇĞİÖŞÜ]/.test(s)&&!/^KARA DÜĞÜM/.test(s))leaked.push(s);
     if(/\{\d+\}/.test(s))leaked.push(s);
    }
    return {leaked:[...new Set(leaked)],lang:document.documentElement.lang,dir:document.documentElement.dir,overflow:document.documentElement.scrollWidth>innerWidth+2};
   });
   assert.equal(state.lang,code,route);assert.equal(state.dir,code==='ar'?'rtl':'ltr',route);assert.equal(state.overflow,false,`${code}/${route}: horizontal overflow`);
   if(code!=='tr')assert.deepEqual(state.leaked,[],`${code}/${route}: untranslated/template text`);
   screens++;
  }
  for(const code of ['tr','en','ar','zh']){
   await p.evaluate(()=>kdNavigate('settings'));
   if(await p.locator('#kdLangSelect').inputValue()!==code){await Promise.all([p.waitForEvent('load'),p.locator('#kdLangSelect').selectOption(code)]);await p.clock.fastForward(2500);}
   await p.evaluate(()=>kdNavigate('settings'));await inspect(code,'language selection');
   assert.equal(await p.locator('#kdLangSelect').inputValue(),code);
   assert.equal(await p.evaluate(()=>nativeLanguages.at(-1)),code,'Selected language reaches the Android bridge');
   assert.deepEqual(await snapshot(),saved,`${code}: locale/reload must preserve the unfinished board, hint usage and resources`);
   if(code!=='tr'){
    const missing=await p.evaluate(code=>Object.keys(kdLocalization.dictionaries.en).filter(k=>!kdLocalization.dictionaries[code][k]),code);
    assert.deepEqual(missing,[],`${code}: requested-locale dictionary coverage`);
    assert.notEqual(await p.evaluate(()=>kdTranslate('◇ GÜNÜN BULMACASI')),'◇ GÜNÜN BULMACASI');
    assert.notEqual(await p.evaluate(()=>kdTranslate('25 bölüm kaldı')),'25 bölüm kaldı');
   }
   await p.locator('[data-privacy-policy]').click();await p.locator('[data-delete-account]').click();
   assert.deepEqual(await p.evaluate(()=>legalCalls.slice(-2)),['privacy','deletion']);
   for(const route of ['home','settings','levels','shop','profile','game']){
    await p.evaluate(route=>kdNavigate(route),route);await inspect(code,route);
    if(route==='profile')for(const tab of ['themes','achievements'])if(await p.locator(`[data-profile-tab="${tab}"]`).count()){await p.locator(`[data-profile-tab="${tab}"]`).click();await inspect(code,'profile/'+tab);}
   }
   for(const selector of ['.kdHotTasks','.kdHotChest']){
    await p.evaluate(()=>kdNavigate('home'));await p.locator(selector).click();await inspect(code,selector);await p.locator('#v9Close').click();
   }
   await p.evaluate(()=>kdNavigate('shop'));await p.locator('[data-shop-spin]').click();await inspect(code,'wheel');await p.locator('.kdWheelClose').click();
   for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]){
    await p.setViewportSize(size);
    for(const route of ['settings','game']){
     await p.evaluate(route=>kdNavigate(route),route);await inspect(code,route+'/'+size.width);
     if(route==='game'){
      const box=await p.locator('#board').boundingBox();assert(Math.abs(box.width-box.height)<2,'Square puzzle');
      assert.equal(await p.locator('#board').evaluate(e=>getComputedStyle(e).direction),'ltr','RTL must preserve puzzle coordinates');
     }
    }
   }
   await p.evaluate(()=>kdNavigate('settings'));await p.setViewportSize({width:390,height:844});
  }
  // Static legal documents must work in the native JavaScript-disabled WebView.
  const legalContext=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:568}});
  const legal=await legalContext.newPage();
  for(const file of ['privacy-policy.html','delete-account.html'])for(const code of ['tr','en','ar','zh']){
   await legal.goto(base+'/'+file+'#'+code);
   const section=legal.locator('#'+code);assert(await section.isVisible());assert((await section.innerText()).length>180,`${file}/${code}: complete legal text`);
   assert.equal(await section.getAttribute('lang'),code);assert.equal(await section.getAttribute('dir'),code==='ar'?'rtl':'ltr');
   assert.equal(await legal.locator('script').count(),0);assert((await section.innerText()).includes('vorynexagames@gmail.com'));
   await legal.locator('nav a[href="#en"]').click();assert(new URL(legal.url()).hash==='#en');
  }
  await legalContext.close();
  await p.evaluate(()=>{window.KaraNative=null;localStorage.setItem('kd6_lang','ar');kdNavigate('settings')});
  const popup=await Promise.all([p.waitForEvent('popup'),p.locator('[data-delete-account]').click()]).then(([tab])=>tab);
  await popup.waitForLoadState();assert.equal(new URL(popup.url()).hash,'#ar');assert.equal(new URL(popup.url()).pathname,'/delete-account.html');await popup.close();
  assert.deepEqual(errors,[]);
  console.log(`PASS: ${screens} TR/EN/AR/ZH screens; actual language selection/reload preserves board and resources; native language/deletion bridge; RTL text/LTR square board; eight offline legal-language sections`);
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
