/* Input/paint diagnostics and one native light layer; never changes a move, wallet or save. */
(()=>{'use strict';const board=document.getElementById('board');if(!board)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),limited=(navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=4)||(navigator.deviceMemory>0&&navigator.deviceMemory<=4)||matchMedia('(update: slow)').matches;
 const stats={pointer:0,click:0,requested:0,nativePaints:0,htmlPaints:0,skipped:0,last:0,route:'none'},t=s=>window.kdTranslate?.(s)||s;
 const glint=document.createElement('div');glint.className='kdTapGlint';glint.setAttribute('aria-hidden','true');
 let timer=0,animation=null,lastCell=null,lastDown=0,monitor=null,nativeEnabled=null;
 const enabled=()=>!document.body.classList.contains('kdNoGlow');
 const native=()=>typeof window.KaraNative?.drawTapLight==='function'&&typeof window.KaraNative?.setTapLightEnabled==='function';
 function clear(){clearTimeout(timer);timer=0;if(animation){animation.cancel();animation=null;}glint.remove();}
 function sync(){const on=enabled();if(native()&&nativeEnabled!==on){try{KaraNative.setTapLightEnabled(on);nativeEnabled=on;}catch(_){nativeEnabled=null;}}if(!on)clear();update();}
 function update(){if(monitor)monitor.querySelector('output').textContent=`${t(enabled()?'AÇIK':'KAPALI')} · ${stats.route} · ↓${stats.pointer} ↳${stats.click} ✦${stats.nativePaints+stats.htmlPaints} / ${stats.requested}`;}
 function cellAt(e){const found=e.target.closest?.('#board>.tile');if(found)return found;if(e.target!==board)return null;let cell=null,distance=Infinity;for(const node of board.querySelectorAll(':scope>.tile')){const r=node.getBoundingClientRect(),d=(e.clientX-r.left-r.width/2)**2+(e.clientY-r.top-r.height/2)**2;if(d<distance){cell=node;distance=d;}}return cell;}
 function flash(cell){
  if(!cell||!enabled()||document.hidden||document.getElementById('kdGame').hidden||window.kdGetLearningState?.().locked||window.kdOnboarding?.isOpen?.()){stats.skipped++;update();return;}
  const r=cell.getBoundingClientRect(),still=reduced.matches||limited||board.dataset.boardSize>=7||document.documentElement.hasAttribute('data-kd-gold-low-motion');
  if(r.width<1||r.height<1)return;sync();clear();const sequence=++stats.requested;stats.last=sequence;
  if(native()){try{if(KaraNative.drawTapLight(r.left,r.top,r.width,r.height,innerWidth,innerHeight,still,sequence)){stats.route='Android';update();return;}}catch(_){/* Fall through to independent top-level HTML paint. */}}
  stats.route='HTML';Object.assign(glint.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});document.body.appendChild(glint);
  // Browser fallback is outside the tile/SVG and cannot be erased by a tile redraw.
  if(!still&&glint.animate){try{animation=glint.animate([{opacity:1},{opacity:1,offset:.25},{opacity:0}],{duration:260,fill:'forwards'});}catch(_){}}
  stats.htmlPaints++;timer=setTimeout(clear,still?200:280);update();
 }
 const down=e=>{if(e.isPrimary===false||e.button>0)return;stats.pointer++;const cell=cellAt(e);lastCell=cell;lastDown=performance.now();flash(cell);};
 if('PointerEvent' in window)board.addEventListener('pointerdown',down,{capture:true,passive:true});
 else board.addEventListener('touchstart',e=>{const touch=e.touches[0];if(touch)down({target:e.target,clientX:touch.clientX,clientY:touch.clientY});},{capture:true,passive:true});
 // Keyboard/programmatic clicks also get feedback; real pointer taps are drawn once before SVG redraw.
 board.addEventListener('click',e=>{stats.click++;const cell=cellAt(e);if(cell!==lastCell||performance.now()-lastDown>650)flash(cell);update();},true);
 function diagnostics(){if(monitor){monitor.remove();monitor=null;return;}monitor=document.createElement('aside');monitor.className='kdLightDiagnostics';monitor.innerHTML='<span></span><output></output><button type="button">×</button>';monitor.querySelector('span').textContent=t('Işık İzi Tanılama');monitor.querySelector('button').setAttribute('aria-label',t('Kapat'));monitor.querySelector('button').onclick=diagnostics;document.body.appendChild(monitor);update();window.kdNavigate?.('game');}
 function mount(){const control=document.querySelector('[data-setting="glow"]');if(!control||document.querySelector('[data-light-diagnostics]'))return;const button=document.createElement('button');button.type='button';button.className='kdLightDiagnosticsButton';button.dataset.lightDiagnostics='1';button.textContent='ⓘ';button.setAttribute('aria-label',t('Işık İzi Tanılama'));button.title=t('Işık İzi Tanılama');button.onclick=diagnostics;const icon=control.parentElement.querySelector('.kdSettingIcon');if(icon)icon.replaceChildren(button);}
 new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
 const shell=document.getElementById('kdShell');if(shell)new MutationObserver(mount).observe(shell,{childList:true,subtree:true});
 const game=document.getElementById('kdGame');new MutationObserver(()=>{if(game.hidden){clear();try{KaraNative.setTapLightEnabled(false);nativeEnabled=null;}catch(_){}}else sync();}).observe(game,{attributes:true,attributeFilter:['hidden']});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){clear();try{KaraNative.setTapLightEnabled(false);nativeEnabled=null;}catch(_){}}else sync();});
 window.kdLightFeedback={state:()=>({...stats,enabled:enabled(),native:native(),reduced:reduced.matches,limited}),nativePainted:sequence=>{if(Number.isInteger(sequence)&&sequence>0&&sequence<=stats.last){stats.nativePaints++;stats.route='Android ✓';update();}},diagnostics};
 sync();mount();
})();
