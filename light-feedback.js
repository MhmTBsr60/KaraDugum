/* TEST light trace: input, preference, queue, Canvas and frame evidence are separate.
 * No puzzle, wallet, audio or save mutation. Submitted frames are NOT phone verification. */
(()=>{'use strict';if(window.kdPipeFlow||document.querySelector('script[src="pipe-flow.js"]'))return;
 const board=document.getElementById('board'),game=document.getElementById('kdGame');if(!board||!game)return;
 const TEST='GOLD-500 / visibility-test2',DURATION=500,ACK_WAIT=160;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),limited=(navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=4)||(navigator.deviceMemory>0&&navigator.deviceMemory<=4)||matchMedia('(update: slow)').matches;
 const t=s=>window.kdTranslate?.(s)||s,stats={pointer:0,click:0,requested:0,nativeDraws:0,nativePaints:0,htmlPaints:0,skipped:0,last:0,route:'none',phase:'idle',reason:'',nativeInfo:null};
 const history=[],glint=document.createElement('canvas');glint.id='kdLightCanvas';glint.className='kdTapGlint';glint.setAttribute('aria-hidden','true');
 let expiry=0,watchdog=0,frame=0,monitor=null,nativeEnabled=null,active=0,mode='web',autoOpened=false,htmlSequence=0,lastCellId=null;
 const enabled=()=>!document.body.classList.contains('kdNoGlow');
 const native=()=>typeof window.KaraNative?.drawTapLight==='function'&&typeof window.KaraNative?.setTapLightEnabled==='function';
 function preference(){let stored='unavailable';try{stored=localStorage.getItem('kd5_glow')??'default:on';}catch(_){}return {stored,applied:enabled(),matches:stored==='unavailable'||(stored!=='0')===enabled()};}
 function gate(){if(!enabled())return 'setting_off';if(document.hidden||window.kdAppBackground)return 'background';if(game.hidden)return 'game_hidden';if(document.getElementById('modal')?.classList.contains('show'))return 'result_modal';if(window.kdGetLearningState?.().locked)return 'puzzle_locked';if(window.kdOnboarding?.isOpen?.())return 'tutorial';return '';}
 function record(phase,detail='',sequence=active){stats.phase=phase;stats.reason=detail;history.push({ms:Math.round(performance.now()),sequence,phase,detail,nativeMs:stats.nativeInfo?.uptimeMs,nativeStartedMs:stats.nativeInfo?.visibleSinceMs});if(history.length>24)history.shift();update();}
 function readNative(){try{if(typeof window.KaraNative?.tapLightInfo==='function')stats.nativeInfo=JSON.parse(KaraNative.tapLightInfo());}catch(_){} }
 function update(){if(!monitor)return;const p=preference(),info=stats.nativeInfo;const room=board.getBoundingClientRect().top-monitor.getBoundingClientRect().top-6;monitor.style.maxHeight=Math.max(44,Math.min(monitor.dataset.interactive==='1'?180:100,room))+'px';monitor.dataset.compact=room<170?'1':'0';
  monitor.querySelector('[data-light-build]').textContent=TEST+(info?' · '+info.build+' · '+info.model+' · Android '+info.android+' · WV '+info.webview:' · WebView/browser');
  monitor.querySelector('output').textContent=`${t(p.applied?'AÇIK':'KAPALI')} [save:${p.stored}; match:${p.matches}] · ${mode} / ${stats.route}\n↓${stats.pointer} ↳${stats.click} →${stats.requested} · Native:${stats.nativeDraws}/${stats.nativePaints} WEB:${stats.htmlPaints} BUFFER:${stats.paintEvidence?.bufferGold?'GOLD':'-'} TOP:${stats.paintEvidence?.topLayer?'YES':'NO'}\n${stats.phase}${stats.reason?' · '+stats.reason:''}\nnative:${info?.enabled??'?'} focus:${info?.focus??'?'} shown:${info?.visible??'?'}\nfallback:${stats.fallbackReason||'-'} failure:${stats.lastNativeFailure||'-'}`;
 }
 function clear(reason='cancelled'){clearTimeout(expiry);clearTimeout(watchdog);cancelAnimationFrame(frame);expiry=watchdog=frame=0;try{if(glint.matches(':popover-open'))glint.hidePopover();}catch(_){}glint.remove();htmlSequence=0;const old=active;active=0;if(old)try{KaraNative.cancelTapLight?.(old);}catch(_){}if(old)record('cancel',reason,old);}
 function sync(){if(monitor)monitor.hidden=game.hidden;const permitted=!gate(),on=permitted&&mode!=='web';if(native()&&nativeEnabled!==on){try{KaraNative.setTapLightEnabled(on);nativeEnabled=on;}catch(e){nativeEnabled=null;record('bridge_error',String(e));}}if(!permitted&&active)clear(gate());update();}
 function cellAt(e){const found=e.target.closest?.('#board>.tile');if(found)return found;if(e.target!==board)return null;let cell=null,distance=Infinity;for(const node of board.querySelectorAll(':scope>.tile')){const r=node.getBoundingClientRect(),d=(e.clientX-r.left-r.width/2)**2+(e.clientY-r.top-r.height/2)**2;if(d<distance){cell=node;distance=d;}}return cell;}
 function htmlFlash(cell,sequence,reason){if(active!==sequence||gate())return;clearTimeout(watchdog);watchdog=0;
  // Acceptance without a frame acknowledgement used to suppress this route forever.
  try{KaraNative.cancelTapLight?.(sequence);}catch(_){}
  const index=cell.dataset.i,current=board.querySelector(`:scope>.tile[data-i="${index}"]`)||cell,r=current.getBoundingClientRect();
  const ratio=Math.max(1,Math.min(2,window.devicePixelRatio||1));glint.width=Math.ceil(r.width*ratio);glint.height=Math.ceil(r.height*ratio);
  Object.assign(glint.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
  const ctx=glint.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,r.width,r.height);
  ctx.fillStyle='rgba(255,206,69,.60)';ctx.fillRect(1,1,r.width-2,r.height-2);
  ctx.lineWidth=4;ctx.strokeStyle='#ffd43b';ctx.strokeRect(3,3,r.width-6,r.height-6);
  ctx.lineWidth=2;ctx.strokeStyle='#fff4bc';ctx.strokeRect(7,7,r.width-14,r.height-14);
  // Root-level Canvas2D and, where supported, the browser's top layer. No SVG,
  // body/game ancestor clipping, blend/filter, native sibling View or CSS animation.
  document.documentElement.appendChild(glint);let topLayer=false;
  if(typeof glint.showPopover==='function'){try{glint.setAttribute('popover','manual');glint.showPopover();topLayer=glint.matches(':popover-open');}catch(_){glint.removeAttribute('popover');}}
  const sample=ctx.getImageData(Math.floor(3*ratio),Math.floor(r.height/2*ratio),1,1).data;
  const style=getComputedStyle(glint);stats.paintEvidence={renderer:'Canvas2D',parent:glint.parentElement.tagName,topLayer,bufferGold:sample[0]>210&&sample[1]>150&&sample[2]<150&&sample[3]>240,bufferSample:Array.from(sample),opacity:style.opacity,visibility:style.visibility,filter:style.filter,clipPath:style.clipPath,mixBlend:style.mixBlendMode,cssWidth:r.width,cssHeight:r.height,backingWidth:glint.width,backingHeight:glint.height};
  stats.geometry={...stats.geometry,x:r.left,y:r.top,width:r.width,height:r.height};
  htmlSequence=sequence;stats.route=topLayer?'WEBVIEW Canvas TOP':'WEBVIEW Canvas ROOT';stats.fallbackReason=reason;record('html_attached',reason);
  // Static 500 ms, no CSS/WAAPI fade, blur or SVG filter. Timer starts at a browser frame.
  frame=requestAnimationFrame(()=>{frame=0;if(active!==sequence||gate())return;const c=getComputedStyle(glint),b=glint.getBoundingClientRect();
   if(c.display==='none'||Number(c.opacity)===0||b.width<1||b.height<1){record('html_hidden',`${c.display}/${c.opacity}/${b.width}x${b.height}`);return;}
   if(typeof window.KaraNative?.requestWebLightFrame==='function'){
    record('html_waiting_commit',reason);watchdog=setTimeout(()=>{if(active===sequence){clear('html_commit_timeout');record('html_commit_timeout','WebView frame not confirmed');}},2500);
    try{KaraNative.requestWebLightFrame(sequence);}catch(e){record('html_bridge_error',String(e));}
   }else{stats.htmlPaints++;record('html_browser_frame',reason+'; browser RAF only, not Android commit');expiry=setTimeout(()=>clear('elapsed_500ms'),DURATION);}
  });
 }
 function flash(cell,source='tap'){
  if(!cell||gate()){stats.skipped++;record('blocked',gate()||'no_tile');return;}
  clear('next_request');sync();const r=cell.getBoundingClientRect();if(r.width<1||r.height<1){record('blocked','zero_geometry');return;}
  const sequence=++stats.requested;stats.last=active=sequence;stats.fallbackReason='';stats.lastNativeFailure='';lastCellId=cell.dataset.i;stats.geometry={tile:lastCellId,x:r.left,y:r.top,width:r.width,height:r.height,viewportWidth:innerWidth,viewportHeight:innerHeight,visualScale:window.visualViewport?.scale??1,visualOffsetX:window.visualViewport?.offsetLeft??0,visualOffsetY:window.visualViewport?.offsetTop??0};record('requested',source+'; '+DURATION+'ms; '+Math.round(r.width)+'px');readNative();
  if(mode==='web'||!native()){htmlFlash(cell,sequence,mode==='web'?'forced_webview':'native_unavailable');return;}
  stats.route='Android queue';record('native_requested','awaiting acknowledgement');
  try{if(!KaraNative.drawTapLight(r.left,r.top,r.width,r.height,innerWidth,innerHeight,reduced.matches||limited||Number(board.dataset.boardSize)>=7,sequence)){record('native_rejected','bridge_geometry');if(mode==='auto')htmlFlash(cell,sequence,'native_rejected');return;}}
  catch(e){record('bridge_error',String(e));if(mode==='auto')htmlFlash(cell,sequence,'bridge_error');return;}
  // Queue acceptance is never labelled Canvas/frame success.
  if(active===sequence&&stats.route==='Android queue')watchdog=setTimeout(()=>{watchdog=0;if(active!==sequence||gate())return;stats.lastNativeFailure='native_timeout';record('native_timeout','no frame acknowledgement in '+ACK_WAIT+'ms');if(mode==='auto')htmlFlash(cell,sequence,'native_ack_timeout');},ACK_WAIT);
 }
 const down=e=>{if(e.isPrimary===false||e.button>0)return;stats.pointer++;record('pointer',e.pointerType||'touch');};
 if('PointerEvent' in window)board.addEventListener('pointerdown',down,{capture:true,passive:true});else board.addEventListener('touchstart',e=>down(e),{capture:true,passive:true});
 board.addEventListener('click',e=>{stats.click++;if(!autoOpened&&!game.hidden){autoOpened=true;openMonitor();}record('click');if(e.target!==board)flash(cellAt(e));},true);
 function openMonitor(){if(monitor)return;monitor=document.createElement('aside');monitor.className='kdLightDiagnostics';monitor.setAttribute('aria-label',t('Işık İzi Tanılama'));
  monitor.innerHTML='<strong data-light-build></strong><button type="button" data-light-close aria-label="Close">×</button><output dir="ltr"></output><div class="kdLightTools"><button type="button" data-light-mode aria-label="Light renderer">AUTO</button><button type="button" data-light-preview>500 ms TEST</button></div>';
  monitor.querySelector('[data-light-close]').onclick=()=>{monitor.remove();monitor=null;};const selector=monitor.querySelector('[data-light-mode]');const modes=['auto','web','native'],labels={auto:'AUTO',web:'WEBVIEW',native:'ANDROID'};selector.textContent=labels[mode];selector.onclick=()=>{monitor.dataset.interactive='1';clear('renderer_changed');mode=modes[(modes.indexOf(mode)+1)%modes.length];selector.textContent=labels[mode];sync();record('mode',mode);};
  monitor.querySelector('[data-light-preview]').onclick=()=>{monitor.dataset.interactive='1';flash(board.querySelector(':scope>.tile:not(.good)')||board.querySelector(':scope>.tile'),'preview_no_move');};document.body.appendChild(monitor);readNative();update();
 }
 function diagnostics(){autoOpened=true;window.kdNavigate?.('game');openMonitor();monitor.dataset.interactive='1';update();}
 function mount(){const control=document.querySelector('[data-setting="glow"]');if(!control||document.querySelector('[data-light-diagnostics]'))return;const button=document.createElement('button');button.type='button';button.className='kdLightDiagnosticsButton';button.dataset.lightDiagnostics='1';button.textContent='ⓘ';button.setAttribute('aria-label',t('Işık İzi Tanılama'));button.title=TEST;button.onclick=diagnostics;const icon=control.parentElement.querySelector('.kdSettingIcon');if(icon)icon.replaceChildren(button);}
 function nativeEvent(sequence,phase,info){if(info)stats.nativeInfo=info;if(sequence!==active&&sequence!==0){history.push({ms:Math.round(performance.now()),sequence,phase:'stale_'+phase,detail:''});if(history.length>24)history.shift();return;}
  if(phase==='html_presented'||phase==='html_legacy_frame'){clearTimeout(watchdog);watchdog=0;stats.htmlPaints++;expiry=setTimeout(()=>{if(active===sequence)clear('elapsed_500ms');},DURATION);}
  if(phase==='drawn')stats.nativeDraws++;if(phase==='presented'){stats.nativePaints++;if(htmlSequence!==sequence){clearTimeout(watchdog);watchdog=0;stats.route='Android frame';expiry=setTimeout(()=>{if(active===sequence)clear('elapsed_500ms');},DURATION);}}
  record('native_'+phase,info?.reason||'',sequence);
  if(phase.startsWith('rejected'))stats.lastNativeFailure=phase;
  if(phase.startsWith('rejected')&&active&&mode==='auto'&&htmlSequence!==active){const cell=board.querySelector(`:scope>.tile[data-i="${lastCellId}"]`);if(cell)htmlFlash(cell,active,phase);}
 }
 window.kdLightFeedback={state:()=>({...stats,enabled:enabled(),preference:preference(),native:native(),reduced:reduced.matches,limited,mode,duration:DURATION,active,history:history.map(x=>({...x}))}),diagnostics,nativeEvent,nativePainted:sequence=>nativeEvent(sequence,'presented')};
 new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});const shell=document.getElementById('kdShell');if(shell)new MutationObserver(mount).observe(shell,{childList:true,subtree:true});
 new MutationObserver(sync).observe(game,{attributes:true,attributeFilter:['hidden']});const modal=document.getElementById('modal');if(modal)new MutationObserver(sync).observe(modal,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',sync);window.addEventListener('resize',()=>{clear('viewport_resize');update();},{passive:true});if('ResizeObserver' in window)new ResizeObserver(update).observe(board);sync();mount();
})();
