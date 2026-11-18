/* TEST light trace: input, preference, queue, Canvas and frame evidence are separate.
 * No puzzle, wallet, audio or save mutation. Submitted frames are NOT phone verification. */
(()=>{'use strict';
 const board=document.getElementById('board'),game=document.getElementById('kdGame');if(!board||!game)return;
 const TEST='LIGHT-500 / trace-test1',DURATION=500,ACK_WAIT=160;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),limited=(navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=4)||(navigator.deviceMemory>0&&navigator.deviceMemory<=4)||matchMedia('(update: slow)').matches;
 const t=s=>window.kdTranslate?.(s)||s,stats={pointer:0,click:0,requested:0,nativeDraws:0,nativePaints:0,htmlPaints:0,skipped:0,last:0,route:'none',phase:'idle',reason:'',nativeInfo:null};
 const history=[],glint=document.createElement('div');glint.className='kdTapGlint';glint.setAttribute('aria-hidden','true');
 let expiry=0,watchdog=0,frame=0,monitor=null,nativeEnabled=null,active=0,mode='auto',autoOpened=false,htmlSequence=0,lastCellId=null;
 const enabled=()=>!document.body.classList.contains('kdNoGlow');
 const native=()=>typeof window.KaraNative?.drawTapLight==='function'&&typeof window.KaraNative?.setTapLightEnabled==='function';
 function preference(){let stored='unavailable';try{stored=localStorage.getItem('kd5_glow')??'default:on';}catch(_){}return {stored,applied:enabled(),matches:stored==='unavailable'||(stored!=='0')===enabled()};}
 function gate(){if(!enabled())return 'setting_off';if(document.hidden||window.kdAppBackground)return 'background';if(game.hidden)return 'game_hidden';if(document.getElementById('modal')?.classList.contains('show'))return 'result_modal';if(window.kdGetLearningState?.().locked)return 'puzzle_locked';if(window.kdOnboarding?.isOpen?.())return 'tutorial';return '';}
 function record(phase,detail='',sequence=active){stats.phase=phase;stats.reason=detail;history.push({ms:Math.round(performance.now()),sequence,phase,detail});if(history.length>24)history.shift();update();}
 function readNative(){try{if(typeof window.KaraNative?.tapLightInfo==='function')stats.nativeInfo=JSON.parse(KaraNative.tapLightInfo());}catch(_){} }
 function update(){if(!monitor)return;const p=preference(),info=stats.nativeInfo;
  monitor.querySelector('[data-light-build]').textContent=TEST+(info?' · '+info.build+' · '+info.model+' · Android '+info.android+' · WV '+info.webview:' · WebView/browser');
  monitor.querySelector('output').textContent=`${t(p.applied?'AÇIK':'KAPALI')} [save:${p.stored}; match:${p.matches}] · ${mode} / ${stats.route}\n↓${stats.pointer} ↳${stats.click} →${stats.requested} · Canvas:${stats.nativeDraws} frame:${stats.nativePaints} HTML:${stats.htmlPaints}\n${stats.phase}${stats.reason?' · '+stats.reason:''}\nnative:${info?.enabled??'?'} focus:${info?.focus??'?'} shown:${info?.visible??'?'}\nfallback:${stats.fallbackReason||'-'} failure:${stats.lastNativeFailure||'-'}`;
 }
 function clear(reason='cancelled'){clearTimeout(expiry);clearTimeout(watchdog);cancelAnimationFrame(frame);expiry=watchdog=frame=0;glint.remove();htmlSequence=0;const old=active;active=0;if(old)try{KaraNative.cancelTapLight?.(old);}catch(_){}if(old)record('cancel',reason,old);}
 function sync(){const on=!gate();if(native()&&nativeEnabled!==on){try{KaraNative.setTapLightEnabled(on);nativeEnabled=on;}catch(e){nativeEnabled=null;record('bridge_error',String(e));}}if(!on&&active)clear(gate());update();}
 function cellAt(e){const found=e.target.closest?.('#board>.tile');if(found)return found;if(e.target!==board)return null;let cell=null,distance=Infinity;for(const node of board.querySelectorAll(':scope>.tile')){const r=node.getBoundingClientRect(),d=(e.clientX-r.left-r.width/2)**2+(e.clientY-r.top-r.height/2)**2;if(d<distance){cell=node;distance=d;}}return cell;}
 function htmlFlash(cell,sequence,reason){if(active!==sequence||gate())return;clearTimeout(watchdog);watchdog=0;
  // Acceptance without a frame acknowledgement used to suppress this route forever.
  try{KaraNative.cancelTapLight?.(sequence);}catch(_){}
  const index=cell.dataset.i,current=board.querySelector(`:scope>.tile[data-i="${index}"]`)||cell,r=current.getBoundingClientRect();
  Object.assign(glint.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});document.body.appendChild(glint);htmlSequence=sequence;stats.route='HTML';stats.fallbackReason=reason;record('html_attached',reason);
  // Static 500 ms, no CSS/WAAPI fade, blur or SVG filter. Timer starts at a browser frame.
  frame=requestAnimationFrame(()=>{frame=0;if(active!==sequence||gate())return;const c=getComputedStyle(glint),b=glint.getBoundingClientRect();
   if(c.display==='none'||Number(c.opacity)===0||b.width<1||b.height<1){record('html_hidden',`${c.display}/${c.opacity}/${b.width}x${b.height}`);return;}
   stats.htmlPaints++;record('html_submitted',reason+'; static 500ms; pixels not phone-certified');expiry=setTimeout(()=>clear('elapsed_500ms'),DURATION);
  });
 }
 function flash(cell,source='tap'){
  if(!cell||gate()){stats.skipped++;record('blocked',gate()||'no_tile');return;}
  clear('next_request');sync();const r=cell.getBoundingClientRect();if(r.width<1||r.height<1){record('blocked','zero_geometry');return;}
  const sequence=++stats.requested;stats.last=active=sequence;stats.fallbackReason='';stats.lastNativeFailure='';lastCellId=cell.dataset.i;stats.geometry={tile:lastCellId,x:r.left,y:r.top,width:r.width,height:r.height,viewportWidth:innerWidth,viewportHeight:innerHeight,visualScale:visualViewport?.scale??1,visualOffsetX:visualViewport?.offsetLeft??0,visualOffsetY:visualViewport?.offsetTop??0};record('requested',source+'; '+DURATION+'ms; '+Math.round(r.width)+'px');readNative();
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
  monitor.innerHTML='<strong data-light-build></strong><button type="button" data-light-close aria-label="Close">×</button><output dir="ltr"></output><div class="kdLightTools"><select aria-label="Light renderer"><option value="auto">AUTO</option><option value="web">WEBVIEW</option><option value="native">ANDROID</option></select><button type="button" data-light-preview>500 ms TEST</button></div>';
  monitor.querySelector('[data-light-close]').onclick=()=>{monitor.remove();monitor=null;};const select=monitor.querySelector('select');select.value=mode;select.onchange=()=>{clear('renderer_changed');mode=select.value;record('mode',mode);};
  monitor.querySelector('[data-light-preview]').onclick=()=>flash(board.querySelector(':scope>.tile:not(.good)')||board.querySelector(':scope>.tile'),'preview_no_move');document.body.appendChild(monitor);readNative();update();
 }
 function diagnostics(){autoOpened=true;window.kdNavigate?.('game');openMonitor();}
 function mount(){const control=document.querySelector('[data-setting="glow"]');if(!control||document.querySelector('[data-light-diagnostics]'))return;const button=document.createElement('button');button.type='button';button.className='kdLightDiagnosticsButton';button.dataset.lightDiagnostics='1';button.textContent='ⓘ';button.setAttribute('aria-label',t('Işık İzi Tanılama'));button.title=TEST;button.onclick=diagnostics;const icon=control.parentElement.querySelector('.kdSettingIcon');if(icon)icon.replaceChildren(button);}
 function nativeEvent(sequence,phase,info){if(info)stats.nativeInfo=info;if(sequence!==active&&sequence!==0){history.push({ms:Math.round(performance.now()),sequence,phase:'stale_'+phase,detail:''});if(history.length>24)history.shift();return;}
  if(phase==='drawn')stats.nativeDraws++;if(phase==='presented'){stats.nativePaints++;clearTimeout(watchdog);watchdog=0;if(htmlSequence!==sequence){stats.route='Android frame';expiry=setTimeout(()=>{if(active===sequence)clear('elapsed_500ms');},DURATION);}}
  record('native_'+phase,info?.reason||'',sequence);
  if(phase.startsWith('rejected'))stats.lastNativeFailure=phase;
  if(phase.startsWith('rejected')&&active&&mode==='auto'){const cell=board.querySelector(`:scope>.tile[data-i="${lastCellId}"]`);if(cell)htmlFlash(cell,active,phase);}
 }
 window.kdLightFeedback={state:()=>({...stats,enabled:enabled(),preference:preference(),native:native(),reduced:reduced.matches,limited,mode,duration:DURATION,active,history:history.map(x=>({...x}))}),diagnostics,nativeEvent,nativePainted:sequence=>nativeEvent(sequence,'presented')};
 new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});const shell=document.getElementById('kdShell');if(shell)new MutationObserver(mount).observe(shell,{childList:true,subtree:true});
 new MutationObserver(sync).observe(game,{attributes:true,attributeFilter:['hidden']});const modal=document.getElementById('modal');if(modal)new MutationObserver(sync).observe(modal,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',sync);sync();mount();
})();
