/* Browser geometry/state regression, including simulated CSS safe areas; not a physical-device test. */
'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'index.html'),'utf8'),anchor="const savedGame=get64('activeGame',null);";
const observation=`window.__edgeLayoutAudit={snapshot:()=>{
 const saved=get64('activeGame',null);if(saved)delete saved.elapsed;
 return {level,n,tiles:tiles.slice(),initial:initial.slice(),solution:solution.slice(),fixed:fixed.slice(),sealed:sealed.slice(),keys:keys.slice(),fog:fog.slice(),rotCount:rotCount.slice(),targetDone:targetDone.slice(),ice:ice.slice(),history:JSON.parse(JSON.stringify(history)),extra:JSON.parse(JSON.stringify(window.kdExtra)),moves,hints,usedHints,undos,locked,coins:get64('coins',0),xp:get64('xp',0),coupons:get64('hintCoupons',0),completed:get64('completed',{}),best:get64('best',{}),saved};
}};`;
const html=source.replace(anchor,observation+anchor);assert.notEqual(html,source,'Game observation hook is missing');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webp')?'image/webp':file.endsWith('.png')?'image/png':'text/html');res.end(file===path.join(root,'index.html')?html:fs.readFileSync(file));
});
const sizes=[{width:320,height:568},{width:360,height:800},{width:390,height:844},{width:430,height:932},{width:768,height:1024},{width:1024,height:1366},{width:1024,height:768},{width:568,height:320},{width:844,height:390}];
const levels=[{level:11,n:4},{level:17,n:5},{level:38,n:6},{level:76,n:7},{level:151,n:8}],themes=['gold','ice','fire','shadow','emerald','ruby'];
const insets=[{top:0,right:0,bottom:0,left:0},{top:24,right:8,bottom:20,left:34}],records=[];
const settle=p=>p.clock.runFor(40);
const snapshot=p=>p.evaluate(()=>__edgeLayoutAudit.snapshot());
async function safeArea(p,inset){await p.evaluate(inset=>{const game=document.getElementById('kdGame');for(const side of ['top','right','bottom','left'])game.style.setProperty('--kd-game-safe-'+side,inset[side]+'px');},inset);}
async function metrics(p,inset){return p.evaluate(inset=>{
 const visible=e=>e&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
 const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
 const game=document.getElementById('kdGame'),main=game.querySelector('main'),board=document.getElementById('board'),b=rect(board),m=rect(main),style=getComputedStyle(main),frame=board.querySelector('.kdBoardOrnament');
 const painted=frame?[...frame.querySelectorAll('path,rect')].filter(visible).map(rect).filter(r=>r.width>0&&r.height>0):[];
 const outer=painted.length?{left:Math.min(b.left,...painted.map(r=>r.left)),right:Math.max(b.right,...painted.map(r=>r.right)),top:Math.min(b.top,...painted.map(r=>r.top)),bottom:Math.max(b.bottom,...painted.map(r=>r.bottom))}:{left:b.left,right:b.right,top:b.top,bottom:b.bottom};outer.width=outer.right-outer.left;outer.height=outer.bottom-outer.top;
 const controls=[...new Set(['#hint','#undo','#restart','#new','#kdModeRule','.kdStarGoalButton','#kdBoardFocusToggle','#kdGame>.kdTop>.kdBack','.kdLessonNotice button'].flatMap(selector=>[...document.querySelectorAll(selector)]))].filter(visible);
 const bad=controls.filter(e=>{const r=rect(e);return r.width<=0||r.height<=0||r.left<inset.left-1||r.right>innerWidth-inset.right+1||r.top<inset.top-1||r.bottom>innerHeight-inset.bottom+1;}).map(e=>({id:e.id,class:e.className,rect:rect(e)}));
 const hits=controls.filter(e=>e.matches('button')&&!e.disabled).map(e=>{const r=rect(e),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {id:e.id,class:e.className,hit:!!hit&&(hit===e||e.contains(hit))};});
 const tiles=[...board.querySelectorAll(':scope>.tile')],tileSamples=[0,Math.floor(tiles.length/2),tiles.length-1].map(i=>{const tile=tiles[i],r=rect(tile);return {i,...r,hit:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('#board>.tile')===tile};});
 const paddingLeft=parseFloat(style.paddingLeft)||0,paddingRight=parseFloat(style.paddingRight)||0,contentWidth=main.clientWidth-paddingLeft-paddingRight,rows=style.gridTemplateRows.split(/\s+/).map(parseFloat),row=parseInt(getComputedStyle(board).gridRowStart,10);
 const instructions=game.querySelector('.instructions'),next=game.querySelector('.status'),availableHeight=style.display==='grid'&&Number.isFinite(row)&&Number.isFinite(rows[row-1])?rows[row-1]:Math.max(0,next.getBoundingClientRect().top-instructions.getBoundingClientRect().bottom-2*(parseFloat(style.rowGap)||0));
 const panelStyle=getComputedStyle(game,'::before'),panel={left:parseFloat(panelStyle.left),right:parseFloat(panelStyle.right)};const header=rect(game.querySelector(':scope>.kdTop')),stats=rect(main.querySelector('.stats'));
 return {board:b,outer,panel,ratios:{boardToViewport:b.width/innerWidth,frameToViewport:outer.width/innerWidth,frameToSafeWidth:outer.width/(innerWidth-inset.left-inset.right)},frame:!!frame,contentWidth,availableHeight,gutters:{left:m.left+paddingLeft-inset.left,right:innerWidth-inset.right-(m.right-paddingRight)},bad,hits,tileSamples,tileCount:tiles.length,direction:getComputedStyle(board).direction,headerGap:stats.top-header.bottom,scroll:{horizontal:document.documentElement.scrollWidth-innerWidth,vertical:game.scrollHeight-game.clientHeight,documentVertical:document.documentElement.scrollHeight-innerHeight}};
 },inset);}
async function check(p,info){
 const data=await metrics(p,info.insets);records.push({...info,...data});const label=JSON.stringify({...info,...data});
 assert(data.frame,'Theme frame must remain present: '+label);assert.equal(data.tileCount,info.n*info.n,label);assert(Math.abs(data.board.width-data.board.height)<=1,'Square board: '+label);assert.equal(data.direction,'ltr','Board coordinates must not mirror in RTL');
 assert(data.board.width>0&&data.board.height>0,label);assert.deepEqual(data.bad,[],label);assert(data.hits.every(h=>h.hit),'Original action intercepted: '+label);assert(data.tileSamples.every(t=>t.width>0&&t.height>0&&t.hit),'Tile center intercepted: '+label);
 const inset=info.insets;assert(Number.isFinite(data.panel.left)&&Number.isFinite(data.panel.right)&&Math.abs(data.panel.left-inset.left)<=1&&Math.abs(data.panel.right-inset.right)<=1,'Outer panel must meet the physical safe-area edges without floating side bars: '+label);assert(data.outer.left>=inset.left-1&&data.outer.right<=info.width-inset.right+1&&data.outer.top>=inset.top-1&&data.outer.bottom<=info.height-inset.bottom+1,'Painted ornament outside safe area: '+label);
 assert(data.scroll.horizontal<=1&&data.scroll.vertical<=1&&data.scroll.documentVertical<=1,'Unexpected gameplay scrolling: '+label);assert(data.headerGap>=-1,'Header/stat overlap: '+label);
 if(info.width<=430&&info.height>info.width){
  assert(data.gutters.left>=-1&&data.gutters.right>=-1&&data.gutters.left<=15&&data.gutters.right<=15,'Phone content gutters exceed 14px plus the simulated safe area: '+label);
  if(info.level===17&&info.stage==='normal'&&data.availableHeight>=data.contentWidth*.95)assert(data.outer.width>=data.contentWidth*.95-1,'Height-permitting normal board must fill the usable phone width: '+label);
 }
 return data;
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 try{
  const p=await browser.newPage({viewport:sizes[0],deviceScaleFactor:3,isMobile:true,hasTouch:true,locale:'tr-TR',timezoneId:'UTC',reducedMotion:'reduce'}),errors=[];
  p.on('pageerror',error=>errors.push(error.message));p.on('dialog',dialog=>dialog.accept());
  await p.addInitScript(()=>{localStorage.setItem('kd64_level','300');localStorage.setItem('kd64_completed','{"1":3}');localStorage.setItem('kd64_coins','3000');localStorage.setItem('kd64_hintCoupons','50');localStorage.setItem('kd3_sound','0');localStorage.setItem('kd6_lang','tr');for(const theme of ['ice','fire','shadow','emerald','ruby'])localStorage.setItem('kd64_shopTheme_'+theme,'true');});
  await p.clock.install({time:new Date('2026-11-09T12:00:00Z')});await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);await p.clock.fastForward(3500);await p.clock.runFor(600);if(await p.locator('.kdDailyClose').count())await p.locator('.kdDailyClose').click();await p.clock.pauseAt(await p.evaluate(()=>new Date(Date.now()+1000).toISOString()));
  const fontStyle=await p.addStyleTag({content:'/* Test-only font metrics */'});let index=0;
  for(const size of sizes)for(const inset of insets){
   await p.setViewportSize(size);await safeArea(p,inset);const language=['tr','en','ar'][index%3],font=index%2?'DejaVu Sans':'system-ui';index++;
   await fontStyle.evaluate((e,font)=>{e.textContent='#kdGame,#kdGame *{font-family:'+(font==='system-ui'?font:JSON.stringify(font))+'!important}';},font);await p.evaluate(code=>localStorage.setItem('kd6_lang',code),language);
   for(const {level,n}of levels){
    const theme=level===17?'gold':themes[(index+n)%themes.length];
    await p.evaluate(({level,theme})=>{kdLearning.leave();kdBoardFocus.set(false);localStorage.setItem('kd64_seenLessons','{}');kdNavigate('shop');document.querySelector(`[data-shop-theme="${theme}"]`).click();kdSelectLevel(level);kdNavigate('game');},{level,theme});await settle(p);
    const info={...size,insets:inset,language,font,level,n,theme};
    await check(p,{...info,stage:'fresh_lesson'});
    if(await p.locator('[data-lesson-skip]').count())await p.locator('[data-lesson-skip]').click();await settle(p);
    const normal=await check(p,{...info,stage:'normal'}),before=await snapshot(p),sameTile=await p.locator('#board>.tile').first().elementHandle();
    if(n>=7){
     await p.locator('#kdBoardFocusToggle').click();await settle(p);const focused=await check(p,{...info,stage:'focus'});assert(focused.board.width>=normal.board.width-.5,'Focus must not shrink the live board: '+JSON.stringify({...info,normal:normal.board,focused:focused.board,normalHeight:normal.availableHeight,focusedHeight:focused.availableHeight}));assert(focused.tileSamples[0].width>=normal.tileSamples[0].width-.5,'Focus must not shrink existing tile targets');assert.deepEqual(await snapshot(p),before,'Focus must preserve campaign state/save/resources');assert(await sameTile.evaluate(e=>e===document.querySelector('#board>.tile')),'Focus must not replace the live board');
     await p.locator('#kdBoardFocusToggle').click();await settle(p);await check(p,{...info,stage:'focus_restored'});assert.deepEqual(await snapshot(p),before);
    }
    if(process.env.AUDIT_SCREENSHOTS&&language==='en'&&((size.width===390&&level===17)||(size.width===320&&level===151)||(size.width===1024&&level===151))){fs.mkdirSync(process.env.AUDIT_SCREENSHOTS,{recursive:true});await p.screenshot({path:path.join(process.env.AUDIT_SCREENSHOTS,`edge-${size.width}x${size.height}-${n}x${n}-safe${inset.left}.png`)});}
    await sameTile.dispose();
   }
  }
  // Reflow a partially played board through portrait/landscape and asymmetric physical insets.
  await p.setViewportSize({width:390,height:844});await safeArea(p,{top:24,right:8,bottom:20,left:34});await p.evaluate(()=>{kdLearning.leave();kdBoardFocus.set(false);localStorage.setItem('kd6_lang','ar');kdSelectLevel(17);kdNavigate('game');document.querySelector('[data-lesson-skip]')?.click();document.querySelector('#board>.tile[data-i="0"]').click();document.querySelector('#board>.tile[data-i="1"]').click();});await settle(p);const played=await snapshot(p);assert(played.moves>0);assert(played.history.length>0);
  for(const size of [{width:844,height:390},{width:568,height:320},{width:390,height:844}]){await p.setViewportSize(size);await settle(p);await check(p,{...size,insets:{top:24,right:8,bottom:20,left:34},language:'ar',font:'last-profile',level:17,n:5,theme:'current',stage:'live_rotation'});assert.deepEqual(await snapshot(p),played,'Rotation/insets must not reset a partially played board or its save');}
  assert.deepEqual(errors,[]);console.log('PASS: edge gameplay content/painted frame, 4x4–8x8 square boards and original hit targets across nine phone/tablet/landscape viewports, asymmetric safe-inset/RTL simulation, normal-width fill, focus and live-rotation state/save isolation; '+records.length+' geometry checks');
 }finally{
  if(process.env.AUDIT_SCREENSHOTS){fs.mkdirSync(process.env.AUDIT_SCREENSHOTS,{recursive:true});fs.writeFileSync(path.join(process.env.AUDIT_SCREENSHOTS,'edge-layout-results.json'),JSON.stringify({physicalDevice:false,safeAreaMethod:'CSS custom-property simulation on #kdGame',records},null,2));}
  await browser.close();server.close();
 }
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
