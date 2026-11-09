/* Read-only source audit. Uses isolated illustrative saves; never connects to ads or Play Games.
 * Run only after CPU benchmarks finish. This checks browser geometry/hit targets, not Android FPS/ANR.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
const args=process.argv.slice(2),arg=(name,fallback)=>args.find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const root=path.resolve(arg('root',process.env.KD_MATRIX_ROOT||path.resolve(__dirname,'..')));
const output=path.resolve(arg('out',process.env.KD_MATRIX_OUT||'/tmp/kd-mobile-layout-matrix.json'));
let projectRequire,chromium;
const devices=[
 {id:'compact_320',width:320,height:568,dpr:2},
 {id:'compact_360',width:360,height:640,dpr:3},
 {id:'tall_360',width:360,height:800,dpr:2.75},
 {id:'tall_393',width:393,height:873,dpr:3},
 {id:'tall_412',width:412,height:915,dpr:2.625},
 {id:'large_430',width:430,height:932,dpr:3},
 {id:'tablet_768',width:768,height:1024,dpr:2},
 {id:'landscape_844',width:844,height:390,dpr:3},
 {id:'landscape_568',width:568,height:320,dpr:2}
];
const languages=[['tr','tr-TR'],['en','en-US'],['ar','ar-SA']];
const profiles=[
 {id:'motion_glow',reducedMotion:'no-preference',glow:true},
 {id:'motion_no_glow',reducedMotion:'no-preference',glow:false},
 {id:'reduced_glow',reducedMotion:'reduce',glow:true},
 {id:'reduced_no_glow',reducedMotion:'reduce',glow:false}
];
const fonts=['system-ui','Arial','DejaVu Sans'],themes=['gold','ice','fire','shadow','emerald','ruby'];
const levels=[{level:11,n:4},{level:23,n:5},{level:38,n:6},{level:76,n:7},{level:151,n:8}];
const filter=arg('devices','').split(',').filter(Boolean),selectedDevices=devices.filter(d=>!filter.length||filter.includes(d.id));

const plan=[];for(const [di,d] of selectedDevices.entries())for(const [li,[language,locale]]of languages.entries())for(const [pi,profile]of profiles.entries()){
 const index=plan.length;plan.push({index,device:d.id,viewport:{width:d.width,height:d.height},dpr:d.dpr,orientation:d.width>d.height?'landscape':'portrait',language,locale,profile:profile.id,reducedMotion:profile.reducedMotion,glow:profile.glow,font:fonts[(di+li+pi)%fonts.length],date:`2026-11-${String(9+pi).padStart(2,'0')}`,rotate:li===0&&pi===0,boards:levels.map((v,si)=>({...v,theme:themes[(index+si)%themes.length]}))});
}
const disclaimer='Modern Chromium mobile emulation only. These are viewport/DPR/font/touch profiles, not physical Android models or Android WebView/Google Play APK tests. This harness does not measure frame rate, jank, ANR, GPU/thermal limits, or real ad/Play Games SDK behavior.';
const planSummary={kind:'KaraDugum-mobile-layout-plan-v1',disclaimer,root,rows:plan.length,viewports:selectedDevices,locales:languages.map(([id])=>id),profiles,fonts,themeBoardSampling:'Each viewport has all six themes represented at each 4x4–8x8 size across its 12 rows; this is a scheduled representative matrix, not the full Cartesian product of every dimension.',plan};
function earlyFailure(error){const failure={kind:'KaraDugum-mobile-layout-results-v1',status:'error',disclaimer,root,output,fatal:{name:error.name,message:error.message},startedAt:new Date().toISOString(),summary:{plannedRows:plan.length,completedRows:0,checks:0,passed:0,failed:1}};try{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(failure,null,2)+'\n');}catch(writeError){failure.outputWriteError=writeError.message;}process.stdout.write(JSON.stringify(failure)+'\n');process.exit(1);}
if(!selectedDevices.length)earlyFailure(Error('No viewport profiles selected'));
if(args.includes('--list')){process.stdout.write(JSON.stringify(planSummary,null,2)+'\n');process.exit(0);}
try{projectRequire=createRequire(path.join(root,'package.json'));({chromium}=projectRequire('playwright'));}catch(error){earlyFailure(error);}
function hashSources(){const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),files=new Set(fs.readdirSync(root).filter(f=>/\.(?:html|js|css)$/.test(f)));for(const m of html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g)){const local=m[1];if(!/^(?:https?:|data:|\/)/.test(local)&&!local.includes('..'))files.add(local);}const hashes={};for(const f of [...files].sort()){const p=path.join(root,f);if(fs.existsSync(p))hashes[f]=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');}return {files:hashes,combined:crypto.createHash('sha256').update(JSON.stringify(hashes)).digest('hex')};}
let sourceBefore;try{sourceBefore=hashSources();}catch(error){earlyFailure(error);}let commit=null;try{commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();}catch{}
let release={version:null,versionCode:null};try{const workflow=fs.readFileSync(path.join(root,'.github/workflows/android-apk.yml'),'utf8');release={version:workflow.match(/^\s+versionName '([^']+)'\s*$/m)?.[1]||null,versionCode:Number(workflow.match(/^\s+versionCode (\d+)\s*$/m)?.[1])||null};}catch{}
const report={kind:'KaraDugum-mobile-layout-results-v1',startedAt:new Date().toISOString(),status:'running',disclaimer,scope:'UI compatibility and original action hit testing only; normal gameplay at 4x4–8x8, first-lesson/focus states at 7x7–8x8; no game source edits, no ad watching, no Play Games/account connections.',version:release.version,versionCode:release.versionCode,commit,sourceBefore,plan:{rows:plan.length,viewports:selectedDevices,locales:languages.map(([id])=>id),profiles,fonts,sampling:planSummary.themeBoardSampling},fixture:'Isolated local save: level 300 unlocked, three illustrative completed levels, long crystal balance, 15000 XP, all six themes owned, no real account or tester data.',rows:[],summary:{plannedRows:plan.length,completedRows:0,checks:0,passed:0,failed:0,pageErrors:0,blockedExternalRequests:0}};
function save(){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
function addCheck(row,label,data,issues=[]){const status=issues.length?'fail':'pass';row.checks.push({label,status,...data,issues});report.summary.checks++;report.summary[status==='pass'?'passed':'failed']++;}
async function capture(row,label,fn){try{const data=await fn();addCheck(row,label,data,data.issues||[]);}catch(error){addCheck(row,label,{exception:{name:error.name,message:error.message,stack:String(error.stack||'').slice(0,1600)}},['exception']);}}
const mime=f=>f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':f.endsWith('.webp')?'image/webp':f.endsWith('.png')?'image/png':f.endsWith('.jpg')?'image/jpeg':f.endsWith('.woff2')?'font/woff2':'application/octet-stream';
const server=http.createServer((req,res)=>{try{const f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',mime(f));res.end(fs.readFileSync(f));}catch{res.writeHead(400);res.end();}});
const settle=p=>p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
async function state(p){return p.evaluate(()=>{const s=kdGetLearningState();return {level:s.level,n:s.n,moves:s.moves,usedHints:s.usedHints,undos:s.undos,locked:s.locked,masks:[...document.querySelectorAll('#board>.tile')].map(e=>e.dataset.pipe)};});}
async function gameMetrics(p,meta){return p.evaluate(meta=>{
 const visible=e=>e&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};
 const issues=[],selectors=['#board','#hint','#undo','#restart','#new','#kdGame>.kdTop>.kdBack','#kdModeRule','.kdStarGoalButton','#kdBoardFocusToggle'];
 const controls=[...new Set(selectors.flatMap(s=>[...document.querySelectorAll(s)]))].filter(visible),outside=[];
 for(const e of controls){const r=rect(e);if(r.width<=0||r.height<=0||r.x<-.01||r.y<-.01||r.right>innerWidth+1||r.bottom>innerHeight+1)outside.push({id:e.id,class:e.className,rect:r});}
 if(outside.length)issues.push('controls_outside_viewport');
 const main=document.querySelector('#kdGame main'),game=document.getElementById('kdGame'),board=document.getElementById('board'),tiles=[...board.querySelectorAll(':scope>.tile')],b=rect(board);
 if(tiles.length!==meta.n*meta.n)issues.push('unexpected_tile_count');if(Math.abs(b.width-b.height)>1)issues.push('board_not_square');if(getComputedStyle(board).direction!=='ltr')issues.push('board_coordinates_not_ltr');
 const sample=[0,Math.floor(tiles.length/2),tiles.length-1].map(i=>{const tile=tiles[i];if(!tile)return {i,hit:false};const r=rect(tile),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y)?.closest('#board>.tile')===tile;return {i,width:r.width,height:r.height,hit};});if(sample.some(t=>!t.hit))issues.push('board_tile_hit_target_intercepted');
 const hits=controls.filter(e=>e.matches('button')&&!e.disabled).map(e=>{const r=rect(e),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {id:e.id,class:e.className,hit:!!hit&&(hit===e||e.contains(hit))};});if(hits.some(h=>!h.hit))issues.push('button_hit_target_intercepted');
 const labels=[...document.querySelectorAll('.kdProgressPair span')].map(e=>{const range=document.createRange();range.selectNodeContents(e);const text=range.getBoundingClientRect(),parent=e.parentElement.getBoundingClientRect();return {text:e.textContent,fits:text.left>=parent.left-1&&text.right<=parent.right+1};});if(labels.some(x=>!x.fits))issues.push('connection_or_clock_label_overflow');
 const header=rect(document.querySelector('#kdGame>.kdTop')),stats=rect(main.querySelector('.stats'));if(stats.y<header.bottom-1)issues.push('header_stats_overlap');
 const horizontal=document.documentElement.scrollWidth-innerWidth,vertical=game.scrollHeight-game.clientHeight;if(horizontal>1)issues.push('horizontal_document_overflow');if(vertical>1)issues.push('full_height_game_scroll');
 return {...meta,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},board:b,tileSamples:sample,headerGap:stats.y-header.bottom,scroll:{horizontal,vertical},outside,hits,labels,issues};
 },meta);}
async function settingsMetrics(p){return p.evaluate(()=>{
 const shell=document.getElementById('kdShell'),visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden',controls=[...shell.querySelectorAll('#kdMusicVolume,#kdLangSelect,[data-setting],[data-open-profile],[data-privacy-policy],[data-privacy-options],.kdIntroductionHelp,.kdTop>.kdBack')].filter(visible),issues=[],outside=[],hits=[];
 for(const e of controls){const r=e.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight+1||r.left<0||r.right>innerWidth+1||r.width<=0||r.height<=0||e.scrollHeight>e.clientHeight+1)outside.push({id:e.id,class:e.className,text:e.textContent.trim().slice(0,100),rect:r.toJSON(),innerOverflow:e.scrollHeight-e.clientHeight});const target=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);hits.push({id:e.id,class:e.className,hit:!!target&&(target===e||e.contains(target))});}
 const switches=[...shell.querySelectorAll('[data-setting]')];if(switches.length!==3)issues.push('missing_settings_switch');if(switches.some(e=>e.getBoundingClientRect().height<44))issues.push('settings_switch_under_44px');if(!controls.some(e=>e.hasAttribute('data-privacy-options')))issues.push('privacy_preference_scenario_not_visible');
 if(outside.length)issues.push('settings_control_overflow');if(hits.some(x=>!x.hit))issues.push('settings_hit_intercepted');const scroll={vertical:shell.scrollHeight-shell.clientHeight,horizontal:shell.scrollWidth-shell.clientWidth,documentHorizontal:document.documentElement.scrollWidth-innerWidth};if(scroll.vertical>1)issues.push('settings_vertical_scroll');if(scroll.horizontal>1||scroll.documentHorizontal>1)issues.push('settings_horizontal_scroll');
 return {scroll,outside,hits,controlCount:controls.length,issues};
 });}
async function questMetrics(p,period){return p.locator('.kdQuestsFull').evaluate((overlay,period)=>{
 const card=overlay.querySelector('.kdV9Card'),visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden',targets=[...overlay.querySelectorAll('.kdV9Row,.kdQuestFinale,#v9Close,.kdModernExtraBack,.kdQuestTabs')].filter(visible),issues=[],outside=[],clipped=[],hits=[];
 for(const e of targets){const r=e.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight+1||r.left<0||r.right>innerWidth+1||r.width<=0||r.height<=0)outside.push({class:e.className,rect:r.toJSON()});if(e.scrollHeight>e.clientHeight+1)clipped.push(e.className);}
 const hero=overlay.querySelector('.kdModernExtraHero'),heroBounds=hero?.getBoundingClientRect(),heroText=[...overlay.querySelectorAll('.kdModernExtraCopy>span,.kdModernExtraCopy>strong,.kdModernExtraCopy>small')].filter(visible).map(e=>{const range=document.createRange();range.selectNodeContents(e);const rects=[...range.getClientRects()].filter(r=>r.width>0&&r.height>0);return {tag:e.tagName.toLowerCase(),text:e.textContent.trim(),rects:rects.map(r=>r.toJSON()),fits:!!heroBounds&&rects.length>0&&rects.every(r=>r.left>=heroBounds.left-1&&r.right<=heroBounds.right+1&&r.top>=heroBounds.top-1&&r.bottom<=heroBounds.bottom+1)};});
 for(const e of [...overlay.querySelectorAll('button')].filter(visible)){const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);hits.push({text:e.textContent.trim().slice(0,60),hit:!!hit&&(hit===e||e.contains(hit))});}
 const rows=overlay.querySelectorAll('.kdV9Row').length,finales=overlay.querySelectorAll('.kdQuestFinale').length,scroll={outer:overlay.scrollHeight-overlay.clientHeight,card:card.scrollHeight-card.clientHeight,horizontal:card.scrollWidth-card.clientWidth};
 if(rows!==3||finales!==1)issues.push('missing_quest_rows_or_finale');if(outside.length||clipped.length)issues.push('quest_content_clipped');if(hits.some(x=>!x.hit))issues.push('quest_action_hit_intercepted');if(scroll.outer>1||scroll.card>1||scroll.horizontal>1)issues.push('quests_not_one_screen');
 if(heroText.length!==3||heroText.some(text=>!text.fits))issues.push('quest_hero_text_clipped');
 return {period,rows,finales,labels:[...overlay.querySelectorAll('.kdV9Row>span')].map(e=>e.textContent.trim()),scroll,outside,clipped,heroText,hits,issues};
 },period);}
async function scrollableMetrics(p,route){
 await p.evaluate(route=>kdNavigate(route),route);await settle(p);
 const overview=await p.evaluate(()=>({horizontal:document.documentElement.scrollWidth-innerWidth,vertical:document.documentElement.scrollHeight-innerHeight}));
 const actions=route==='shop'?p.locator('.kdPackCard button,.kdRefTheme button,[data-shop-ad],[data-shop-spin]'):p.locator('#kdShell button,#kdShell a');
 const visibleIndices=await actions.evaluateAll(nodes=>nodes.flatMap((e,i)=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'?[i]:[])),count=visibleIndices.length,samples=[...new Set([0,Math.floor(count/2),count-1])].filter(i=>i>=0).map(i=>visibleIndices[i]),checks=[],issues=[];
 if(!count)issues.push('no_scrollable_screen_actions');if(overview.horizontal>1)issues.push('scrollable_screen_horizontal_overflow');
 for(const i of samples){const action=actions.nth(i);if(!await action.isVisible())continue;await action.evaluate(e=>e.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));await settle(p);const result=await action.evaluate(e=>{const r=e.getBoundingClientRect(),target=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {text:e.textContent.trim().slice(0,90),rect:r.toJSON(),reachable:r.x>=0&&r.y>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,hit:!!target&&(target===e||e.contains(target))};});checks.push(result);if(!result.reachable||!result.hit)issues.push('scrollable_action_unreachable');}
 return {route,verticalScrollExpected:true,overview,actionCount:count,sampledActions:checks,issues};
}
(async()=>{let browser=null;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`,origin=new URL(base).origin;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});report.browser={name:'Chromium',version:browser.version(),playwright:projectRequire('playwright/package.json').version,physicalDevice:false};
 for(const config of plan){const row={config,checks:[]},pageErrors=[],blocked=[];report.rows.push(row);let context=null;try{
  context=await browser.newContext({viewport:config.viewport,screen:config.viewport,deviceScaleFactor:config.dpr,isMobile:true,hasTouch:true,locale:config.locale,timezoneId:'Europe/Istanbul',reducedMotion:config.reducedMotion,serviceWorkers:'block'});
  await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(origin+'/'))return route.continue();blocked.push({origin:new URL(url).origin,path:new URL(url).pathname});return route.abort('blockedbyclient');});
  const p=await context.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>pageErrors.push({name:e.name,message:e.message}));p.on('dialog',d=>d.accept());
  await p.addInitScript(({language,glow})=>{localStorage.setItem('kd6_lang',language);localStorage.setItem('kd3_sound','0');localStorage.setItem('kd3_music','0');localStorage.setItem('kd5_glow',glow?'1':'0');localStorage.setItem('kd64_level','300');localStorage.setItem('kd64_completed','{"1":3,"2":2,"3":1}');localStorage.setItem('kd64_coins','999999999');localStorage.setItem('kd64_xp','15000');localStorage.setItem('kd64_hintCoupons','200');localStorage.setItem('kd64_seenLessons',JSON.stringify(Object.fromEntries(Array.from({length:16},(_,i)=>[i-1,true]))));for(const t of ['gold','ice','fire','shadow','emerald','ruby'])localStorage.setItem('kd64_shopTheme_'+t,'true');window.KaraNative={privacyState(){queueMicrotask(()=>window.kdNativeEvent?.('privacyState',{required:true,busy:false}));},openPrivacyPolicy(){},privacyOptions(){}};},config);
  await p.clock.install({time:new Date(config.date+'T12:00:00Z')});await p.goto(base+'/index.html');await p.clock.fastForward(2500);if(await p.locator('.kdDailyClose').count())await p.locator('.kdDailyClose').click();
  await p.addStyleTag({content:config.font==='system-ui'?'/* Default application font */':`#kdShell,#kdShell *,#kdGame,#kdGame *,.kdV9Overlay,.kdV9Overlay *{font-family:${JSON.stringify(config.font)}!important}`});await settle(p);
  await capture(row,'emulation_configuration',async()=>p.evaluate(config=>{const actual={width:innerWidth,height:innerHeight,dpr:devicePixelRatio,language:document.documentElement.lang,dir:document.documentElement.dir,reducedMotion:matchMedia('(prefers-reduced-motion:reduce)').matches,glow:!document.body.classList.contains('kdNoGlow')},issues=[];if(actual.width!==config.viewport.width||actual.height!==config.viewport.height||Math.abs(actual.dpr-config.dpr)>.001)issues.push('emulation_size_or_dpr_mismatch');if(actual.language!==config.language||actual.dir!==(config.language==='ar'?'rtl':'ltr'))issues.push('locale_or_direction_mismatch');if(actual.reducedMotion!==(config.reducedMotion==='reduce')||actual.glow!==config.glow)issues.push('motion_or_glow_mismatch');return {actual,issues};},config));
  for(const spec of config.boards){
   await p.evaluate(spec=>{kdLearning.leave();localStorage.setItem('kd64_seenLessons',JSON.stringify(Object.fromEntries(Array.from({length:16},(_,i)=>[i-1,true]))));kdNavigate('shop');document.querySelector('[data-shop-theme="'+spec.theme+'"]').click();kdSelectLevel(spec.level);kdNavigate('game');kdBoardFocus.sync();},spec);await settle(p);
   await capture(row,'game_normal',()=>gameMetrics(p,{...spec,state:'normal'}));
   if(spec.n>=7){
    await p.evaluate(()=>{kdLearning.leave();localStorage.setItem('kd64_seenLessons','{}');kdLearning.sync();});await settle(p);
    await capture(row,'game_first_lesson',async()=>{const data=await gameMetrics(p,{...spec,state:'first_lesson'});if(!await p.locator('.kdLessonNotice').isVisible())data.issues.push('fresh_lesson_not_visible');return data;});
    const before=await state(p);await p.evaluate(()=>kdBoardFocus.set(true));await settle(p);await capture(row,'game_focus',async()=>{const data=await gameMetrics(p,{...spec,state:'focus'});if(JSON.stringify(await state(p))!==JSON.stringify(before))data.issues.push('focus_changed_game_state');return data;});await p.evaluate(()=>{kdBoardFocus.set(false);document.querySelector('[data-lesson-skip]')?.click();});
   }
  }
  if(config.rotate){const last=config.boards.at(-1);await p.evaluate(()=>{kdLearning.leave();kdBoardFocus.set(false)});const before=await state(p);await p.setViewportSize({width:config.viewport.height,height:config.viewport.width});await settle(p);await capture(row,'orientation_turn',async()=>{const data=await gameMetrics(p,{...last,state:'rotated'});if(JSON.stringify(await state(p))!==JSON.stringify(before))data.issues.push('rotation_changed_game_state');return data;});await p.setViewportSize(config.viewport);await settle(p);await capture(row,'orientation_restore',async()=>{const data=await gameMetrics(p,{...last,state:'restored'});if(JSON.stringify(await state(p))!==JSON.stringify(before))data.issues.push('rotation_restore_changed_game_state');return data;});}
  await p.evaluate(()=>kdNavigate('settings'));await settle(p);await capture(row,'settings',()=>settingsMetrics(p));
  for(const period of ['daily','weekly']){await p.evaluate(()=>{kdNavigate('home');kdOpenExtras('quests')});const tab=p.locator('[data-quest-period="'+period+'"]');if(await tab.count())await tab.click();await settle(p);await capture(row,'quests_'+period,()=>questMetrics(p,period));await p.locator('#v9Close').click();}
  await capture(row,'shop_scroll_access',()=>scrollableMetrics(p,'shop'));await capture(row,'profile_scroll_access',()=>scrollableMetrics(p,'profile'));
 }catch(error){addCheck(row,'case_exception',{exception:{name:error.name,message:error.message,stack:String(error.stack||'').slice(0,1800)}},['exception']);}
 finally{addCheck(row,'page_errors',{errors:pageErrors},pageErrors.length?['page_error']:[]);addCheck(row,'external_network',{blocked},blocked.length?['unexpected_external_request_blocked']:[]);report.summary.pageErrors+=pageErrors.length;report.summary.blockedExternalRequests+=blocked.length;try{await context?.close();}catch(error){addCheck(row,'context_cleanup',{message:error.message},['context_cleanup_failed']);}report.summary.completedRows++;if(report.summary.completedRows%9===0){save();process.stderr.write(`matrix ${report.summary.completedRows}/${plan.length}; failures ${report.summary.failed}\n`);}}
 }
 report.sourceAfter=hashSources();report.sourceChangedDuringRun=report.sourceBefore.combined!==report.sourceAfter.combined;if(report.sourceChangedDuringRun){report.summary.failed++;report.sourceChangeIssue='Source JS/CSS/HTML changed during this run; results cover mixed revisions.';}
 report.status=report.summary.failed?'fail':'pass';
}catch(error){report.status='error';report.fatal={name:error.name,message:error.message,stack:String(error.stack||'').slice(0,2000)};report.summary.failed++;}
finally{report.cleanupIssues=[];try{await browser?.close();}catch(error){report.cleanupIssues.push({stage:'browser',message:error.message});report.summary.failed++;report.status='error';}try{if(server.listening)await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}catch(error){report.cleanupIssues.push({stage:'server',message:error.message});report.summary.failed++;report.status='error';}report.finishedAt=new Date().toISOString();try{save();}catch(error){report.outputWriteError=error.message;report.status='error';report.summary.failed++;}process.stdout.write(JSON.stringify({status:report.status,output,summary:report.summary,disclaimer})+'\n');if(report.status!=='pass')process.exitCode=1;}
})();
