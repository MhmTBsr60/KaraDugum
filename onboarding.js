/* Guided practice on the live board. Only disposable paint changes; no campaign actions run. */
(()=>{'use strict';
 const t=s=>window.kdTranslate?.(s)||s,rotate=m=>((m<<1)&15)|(m>>3),byId=id=>document.getElementById(id);
 // Capture installation evidence before the campaign bootstrap creates its initial save.
 const returningAtBoot=(()=>{try{return ['kd64_activeGame','kd64_level','kd64_completed','kd64_best','kd64_attempts','kd64_wins'].some(k=>localStorage.getItem(k)!==null);}catch{return true;}})();
 const seenThisSession=new Set(),titles=['Düğümü döndür','Bağlantıları birleştir','İpucu kullan','Geri Al'];
 const descriptions=['Vurgulanan düğüme dokun. Her dokunuşta saat yönünde döner.','Altın çerçevedeki düğüme dokun ve iki boruyu birleştir.','Takıldığında ipucu alabilirsin. Ampule dokunarak dene.','Geri Al, son hamleni geri çevirir. Şimdi dene.'];
 let overlay=null,opening=false,navigating=false,autoEntryChecked=false,pendingStart=0,frame=0,sessionOwner=null,step=0,actions=new Set(),demo=null,paint=[],returnToSettings=false,previousFocus=null,cardResize=null;
 const practiceMasks=new Map();
 const owner=()=>String(window.kdStorage?.owner?.()||window.kdEconomy?.owner?.()||'guest');
 function hash(value){let a=2166136261,b=2246822519;for(let i=0;i<value.length;i++){a=Math.imul(a^value.charCodeAt(i),16777619);b=Math.imul(b^value.charCodeAt(i),3266489917);}return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');}
 const flagKey=()=> 'kd_onboarding_v1_'+hash(owner());
 function readFlag(){try{return window.kdStorage?kdStorage.read(flagKey(),null):JSON.parse(localStorage.getItem(flagKey())||'null');}catch{return null;}}
 function mark(completed){if(sessionOwner!==owner())return false;const value={seen:true,completed:!!completed||readFlag()?.completed===true,version:2};seenThisSession.add(sessionOwner);if(window.kdStorage)return kdStorage.write(flagKey(),value);try{localStorage.setItem(flagKey(),JSON.stringify(value));return true;}catch{return false;}}
 function experienced(){const s=window.kdGetLearningState?.();if(!s||s.daily||s.level!==1||s.moves>0||s.usedHints>0||s.undos>0)return true;try{const completed=JSON.parse(localStorage.getItem('kd64_completed')||'{}');return Object.values(completed).some(v=>Number(v)>0);}catch{return true;}}
 function eligible(){return !returningAtBoot&&!readFlag()?.seen&&!seenThisSession.has(owner())&&!experienced();}
 function resume(){window.kdSetPaused?.(document.hidden||byId('kdGame')?.hidden!==false||!!window.kdAppBackground);}
 function clearPaint(){for(const e of paint)e.remove();paint=[];}
 function cue(kind){window.kdFeedback?.play(kind);}
 function close(restoreRoute=false){if(!overlay&&!opening)return false;cancelAnimationFrame(pendingStart);cancelAnimationFrame(frame);pendingStart=frame=0;opening=false;const boardFocus=demo?.tile;clearPaint();practiceMasks.clear();cardResize?.disconnect();cardResize=null;const banner=byId('kdSaveHealth');if(overlay?.contains(banner))document.body.append(banner);overlay?.remove();overlay=null;sessionOwner=null;demo=null;const settings=returnToSettings;returnToSettings=false;if(restoreRoute&&settings)window.kdNavigate?.('settings');resume();if(restoreRoute&&settings)document.querySelector('[data-onboard-repeat]')?.focus();else if(previousFocus?.isConnected&&previousFocus.getClientRects().length)previousFocus.focus();else if(boardFocus?.isConnected&&!byId('kdGame').hidden)boardFocus.focus({preventScroll:true});previousFocus=null;return true;}
 function finish(completed){if(!overlay)return false;mark(completed);cue(completed?'confirm':'ui');return close(true);}
 function pair(){const board=byId('board'),cells=[...board.querySelectorAll(':scope>.tile')],n=window.kdGetLearningState?.().n||Math.round(Math.sqrt(cells.length));
  for(const tile of cells){const i=Number(tile.dataset.i),mask=Number(tile.dataset.pipe);if(tile.classList.contains('good')||!mask||mask===15)continue;
   for(const [dr,dc,bit,opposite]of [[0,1,2,8],[1,0,4,1],[0,-1,8,2],[-1,0,1,4]]){const r=Math.floor(i/n)+dr,c=i%n+dc;if(r<0||r>=n||c<0||c>=n)continue;const neighbour=cells[r*n+c],other=Number(neighbour?.dataset.pipe);if(!other)continue;let aligned=mask;for(let turn=0;turn<4;turn++,aligned=rotate(aligned))if((aligned&bit)&&(other&opposite)&&!(rotate(rotate(rotate(aligned)))&bit))return {tile,neighbour,mask,other,aligned,wrong:rotate(rotate(rotate(aligned)))};}
  }return null;
 }
 function paintTile(tile,mask){const e=document.createElement('span');e.className='kdTutorialDemoTile';e.dataset.practiceMask=String(mask);e.setAttribute('aria-hidden','true');const theme=document.documentElement.getAttribute('data-kd-theme')||'gold';e.innerHTML=window.kdThemeArt?.pipe(mask,null,theme)||window.kdPipeSvg?.(mask,null)||'';tile.append(e);paint.push(e);}
 function paintBoard(){
  clearPaint();
  if(step===0){
   paintTile(demo.tile,practiceMasks.get(demo.tile)??demo.mask);
   for(const [tile,mask] of practiceMasks)if(tile!==demo.tile&&tile.isConnected)paintTile(tile,mask);
   return;
  }
  const done=actions.has(step),aligned=step===3?!done:done;
  paintTile(demo.tile,aligned?demo.aligned:demo.wrong);
  if(step===1)paintTile(demo.neighbour,demo.other);
 }
 function button(label,handler,className){const b=document.createElement('button');b.type='button';b.className=className||'';b.textContent=t(label);b.onclick=handler;return b;}
 function targetRect(){const e=step===2?byId('hint'):step===3?byId('undo'):demo?.tile;if(!e?.isConnected)return null;const a=e.getBoundingClientRect();if(step!==1)return a;const b=demo.neighbour.getBoundingClientRect();return {left:Math.min(a.left,b.left),top:Math.min(a.top,b.top),right:Math.max(a.right,b.right),bottom:Math.max(a.bottom,b.bottom)};}
 function requestPlace(){if(overlay&&!frame)frame=requestAnimationFrame(place);}
 function place(){frame=0;if(!overlay)return;if(sessionOwner!==owner()||!demo?.tile.isConnected||byId('kdGame').hidden){close(false);return;}const r=targetRect();if(!r)return;const w=innerWidth,h=innerHeight,game=byId('kdGame'),safe=getComputedStyle(game),leftSafe=parseFloat(safe.getPropertyValue('--kd-game-safe-left'))||0,rightSafe=parseFloat(safe.getPropertyValue('--kd-game-safe-right'))||0,topSafe=parseFloat(safe.paddingTop)||0,bottomSafe=parseFloat(safe.paddingBottom)||0;
  const box={left:Math.max(leftSafe+2,r.left-5),right:Math.min(w-rightSafe-2,r.right+5),top:Math.max(topSafe+2,r.top-5),bottom:Math.min(h-bottomSafe-2,r.bottom+5)};
  const set=(e,x,y,width,height)=>Object.assign(e.style,{left:x+'px',top:y+'px',width:Math.max(0,width)+'px',height:Math.max(0,height)+'px'});
  [...overlay.querySelectorAll('.kdTutorialShade')].forEach((e,i)=>{const b=[[0,0,innerWidth,Math.max(0,box.top)],[0,box.bottom,innerWidth,Math.max(0,innerHeight-box.bottom)],[0,box.top,Math.max(0,box.left),box.bottom-box.top],[box.right,box.top,Math.max(0,innerWidth-box.right),box.bottom-box.top]][i];set(e,...b);});
  set(overlay.querySelector('.kdTutorialSpotlight'),box.left,box.top,box.right-box.left,box.bottom-box.top);
  const action=overlay.querySelector('.kdTutorialTarget'),a=(step<2?demo.tile:step===2?byId('hint'):byId('undo')).getBoundingClientRect(),aw=Math.max(44,a.width),ah=Math.max(44,a.height);set(action,a.left+(a.width-aw)/2,a.top+(a.height-ah)/2,aw,ah);
  const card=overlay.querySelector('.kdOnboardingCard'),margin=12,available=w-leftSafe-rightSafe-2*margin;let width=Math.min(390,available);
  if(w>h){const right=w-rightSafe-margin-box.right-margin,left=box.left-leftSafe-2*margin;if(Math.max(left,right)>=240)width=Math.min(390,Math.max(left,right));}
  card.style.width=width+'px';card.style.maxHeight=(h-topSafe-bottomSafe-2*margin)+'px';const height=card.getBoundingClientRect().height;
  const centerY=Math.max(topSafe+margin,(h-height)/2);
  const x=Math.max(leftSafe+margin,Math.min(w-rightSafe-margin-width,(box.left+box.right-width)/2));
  const candidates=[];
  if(step<2){
   const board=byId('board').getBoundingClientRect();
   if(w>h)candidates.push({x:board.right+margin,y:centerY},{x:board.left-margin-width,y:centerY});
   candidates.push({x,y:board.bottom+margin},{x,y:board.top-margin-height});
  }
  if(w>h)candidates.push({x:box.right+margin,y:centerY},{x:box.left-margin-width,y:centerY});
  if(step>=2)candidates.push({x,y:box.top-margin-height},{x,y:box.bottom+margin});else candidates.push({x,y:box.bottom+margin},{x,y:box.top-margin-height});
  const fits=c=>c.x>=leftSafe+margin-1&&c.x+width<=w-rightSafe-margin+1&&c.y>=topSafe+margin-1&&c.y+height<=h-bottomSafe-margin+1;
  let chosen=candidates.find(fits);if(!chosen){const above=box.top-topSafe-2*margin,below=h-bottomSafe-box.bottom-2*margin;card.style.maxHeight=Math.max(100,Math.max(above,below))+'px';const small=card.getBoundingClientRect().height;chosen={x,y:above>=below?box.top-margin-small:box.bottom+margin};}
  card.style.left=chosen.x+'px';card.style.top=chosen.y+'px';
 }
 function practice(tile=demo?.tile){
  if(!overlay||sessionOwner!==owner())return;
  if(step===0){
   const mask=Number(tile.dataset.pipe);
   if(tile.classList.contains('good')||!mask||mask===15)return;
   practiceMasks.set(tile,rotate(practiceMasks.get(tile)??mask));
  }
  actions.add(step);
  paintBoard();
  overlay.classList.add('kdTutorialDidAct');
  cue(['tap','chain','confirm','undo'][step]);
 }
 function buildCard(card){
  const copy=document.createElement('div'),eyebrow=document.createElement('span'),title=document.createElement('h2'),description=document.createElement('p'),safe=document.createElement('p'),nav=document.createElement('nav');
  copy.className='kdTutorialCopy';eyebrow.className='kdEyebrow';title.id='kdOnboardingTitle';description.id='kdOnboardingDescription';description.setAttribute('aria-live','polite');safe.className='kdOnboardingSafe';nav.className='kdTutorialNavigation';
  const move=delta=>{step+=delta;draw();copy.scrollTop=0;cue('ui');};
  const back=button('Geri',()=>move(-1),'kdOnboardingSecondary');back.dataset.onboardBack='1';
  const next=button('İleri',()=>step===3?finish(true):move(1),'kdOnboardingPrimary');next.dataset.onboardNext='1';
  const skip=button('Atla',()=>finish(false),'kdOnboardingSecondary');skip.dataset.onboardSkip='1';
  copy.append(eyebrow,title,description,safe);
  const banner=byId('kdSaveHealth');if(banner)copy.append(banner);
  nav.append(back,next,skip);card.append(copy,nav);
 }
 function draw(){
  if(!overlay)return;
  paintBoard();
  const card=overlay.querySelector('.kdOnboardingCard');
  card.querySelector('.kdEyebrow').textContent=t('ÖĞRETİCİ')+' · '+(step+1)+' / 4';
  card.querySelector('h2').textContent=t(titles[step]);
  byId('kdOnboardingDescription').textContent=t(descriptions[step]);
  card.querySelector('.kdOnboardingSafe').textContent=t('Bu alıştırmada ipucu ve kristal harcanmaz.');
  card.querySelector('nav').setAttribute('aria-label',t('Öğretici adımları'));
  const back=card.querySelector('[data-onboard-back]'),next=card.querySelector('[data-onboard-next]');
  back.textContent=t('Geri');back.disabled=step===0;
  next.textContent=t(step===3?'Tamamla':'İleri');
  card.querySelector('[data-onboard-skip]').textContent=t('Atla');
  const target=overlay.querySelector('.kdTutorialTarget');target.setAttribute('aria-label',t(titles[step]));target.dataset.step=String(step+1);overlay.dataset.step=String(step+1);overlay.classList.toggle('kdTutorialDidAct',actions.has(step));
  place();
  if(document.activeElement===back&&back.disabled)next.focus({preventScroll:true});
 }
 function open(manual=false){
  if(overlay||opening)close(false);const game=byId('kdGame');if(!game)return false;previousFocus=document.activeElement;returnToSettings=!!manual&&game.hidden&&!!document.querySelector('.kdSettingsScreen');opening=true;
  if(game.hidden){navigating=true;try{window.kdNavigate?.('game');}finally{navigating=false;}}
  demo=pair();if(!demo){close(false);return false;}sessionOwner=owner();step=0;actions=new Set();window.kdLearning?.leave();
  overlay=document.createElement('div');overlay.id='kdOnboardingOverlay';overlay.className='kdOnboardingOverlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','kdOnboardingTitle');overlay.setAttribute('aria-describedby','kdOnboardingDescription');
  for(let i=0;i<4;i++){const shade=document.createElement('div');shade.className='kdTutorialShade';overlay.append(shade);}const spotlight=document.createElement('div');spotlight.className='kdTutorialSpotlight';spotlight.setAttribute('aria-hidden','true');const target=document.createElement('button');target.type='button';target.className='kdTutorialTarget';target.onclick=()=>practice();target.setAttribute('aria-describedby','kdOnboardingDescription');const card=document.createElement('section');card.className='kdOnboardingCard';buildCard(card);overlay.append(spotlight,target,card);document.body.append(overlay);cardResize=new ResizeObserver(requestPlace);cardResize.observe(card);
  opening=false;window.kdSetPaused?.(true);mark(false);draw();card.querySelector('[data-onboard-next]').focus({preventScroll:true});return true;
 }
 function enteredGame(){if(overlay||opening||pendingStart||navigating||autoEntryChecked||byId('kdGame')?.hidden!==false)return false;autoEntryChecked=true;if(!eligible())return false;opening=true;window.kdSetPaused?.(true);pendingStart=requestAnimationFrame(()=>{pendingStart=0;opening=false;if(byId('kdGame')?.hidden===false&&eligible())open(false);else resume();});return true;}
 window.kdOnboarding={beforePlay:next=>{if(typeof next!=='function')throw new TypeError('Game continuation is required');next();enteredGame();return false;},enteredGame,replay:()=>open(true),back:()=>overlay?finish(false):close(true),leave:()=>navigating?false:close(false),isOpen:()=>!!overlay||opening};
 window.addEventListener('kd:storage-owner',()=>close(false));window.addEventListener('resize',requestPlace,{passive:true});document.addEventListener('visibilitychange',requestPlace);
 // Route unlocked practice tiles to the demo while protecting real game controls and saves.
 window.addEventListener('click',e=>{
  if(!(overlay||opening)||!e.target.closest?.('#kdGame,#kdShell'))return;
  e.preventDefault();e.stopImmediatePropagation();
  if(!overlay)return;
  const tile=e.target.closest('#board > .tile');
  if(tile&&(step===0||step===1&&(tile===demo.tile||tile===demo.neighbour)))practice(tile);
 },true);
 document.addEventListener('keydown',e=>{if(!overlay||window.kdStorage?.isOpen?.())return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();finish(false);}else if(e.key==='Tab'){const list=[...overlay.querySelectorAll('button:not(:disabled)')],first=list[0],last=list.at(-1),active=document.activeElement;if(!list.includes(active)||(e.shiftKey&&active===first)||(!e.shiftKey&&active===last)){e.preventDefault();(e.shiftKey?last:first).focus();}}});
 document.addEventListener('DOMContentLoaded',()=>{const board=byId('board');if(board){new ResizeObserver(requestPlace).observe(board);new MutationObserver(()=>{if(overlay&&(!demo?.tile.isConnected||Number(demo.tile.dataset.pipe)!==demo.mask)){close(false);return;}requestPlace();}).observe(board,{childList:true,subtree:true,attributes:true,attributeFilter:['data-pipe']});}new MutationObserver(()=>{if(overlay)draw();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang','data-kd-theme']});});
})();
