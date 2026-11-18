/* Cosmetic only: no storage, rule, reward, ad, account or network writes. */
(() => {
  'use strict';
  const board=document.getElementById('board'),modal=document.getElementById('modal');
  if(!board||!modal)return;
  let entry=null,lastRun='';
  const gold=()=>document.documentElement.dataset.kdTheme==='gold';
  const directions=[[1,-1,0,4],[2,0,1,8],[4,1,0,1],[8,0,-1,2]];
  const put=(el,name,value)=>{if(value==null){if(el.hasAttribute(name))el.removeAttribute(name);}else if(el.getAttribute(name)!==value)el.setAttribute(name,value);};
  const limited=(navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=4)||(navigator.deviceMemory>0&&navigator.deviceMemory<=4)||matchMedia('(update: slow)').matches;
  if(limited)document.documentElement.setAttribute('data-kd-gold-low-motion','');
  /* One reusable HTML layer survives SVG replacement after a rotation. Native
     WebView needs no SVG filters, particles, frame loop or audio/haptic calls. */
  const tap=document.createElement('span'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  tap.className='kdTapGlint';tap.setAttribute('aria-hidden','true');
  let tapTimer=0,tapAnimation=null;
  function clearTap(){
    clearTimeout(tapTimer);tapTimer=0;
    if(tapAnimation){tapAnimation.cancel();tapAnimation=null;}
    tap.remove();
  }
  function showTap(e){
    const cell=e.target.closest?.('.tile');
    if(!cell||cell.parentNode!==board||document.body.classList.contains('kdNoGlow')||document.hidden||window.kdGetLearningState?.().locked)return;
    clearTap();cell.appendChild(tap);
    const still=reduced.matches||limited||document.documentElement.hasAttribute('data-kd-gold-low-motion')||board.hasAttribute('data-kd-gold-dense')||(innerWidth<=360&&board.dataset.boardSize==='6');
    if(!still&&typeof tap.animate==='function'){
      try{tapAnimation=tap.animate([{opacity:.9},{opacity:.7,offset:.3},{opacity:0}],{duration:140,easing:'ease-out',fill:'forwards'});}catch(_){/* Older WebView: short static glint. */}
    }
    tapTimer=setTimeout(clearTap,still?110:160);
  }
  board.addEventListener('click',showTap);
  new MutationObserver(()=>{if(document.body.classList.contains('kdNoGlow'))clearTap();}).observe(document.body,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTap();});
  function afterRender(host,values,changed){
    if(host!==board)return;
    const reusable=entry&&values&&values.length===entry.cells.length&&board.firstElementChild===entry.cells[0]&&entry.cells[entry.cells.length-1].parentNode===board;
    const cells=reusable?entry.cells:[...board.children].filter(el=>el.classList.contains('tile')),n=Math.sqrt(cells.length),active=gold();
    if(!Number.isInteger(n)||!cells.length)return;
    const masks=values||cells.map(el=>Number(el.dataset.pipe));
    const full=!entry||entry.n!==n||entry.active!==active||cells.some((el,i)=>el!==entry.cells[i]);
    const indices=full||!Array.isArray(changed)?cells.map((_,i)=>i):changed;
    const visible=full?[]:entry.visible.slice(),dirty=new Set();
    for(const i of indices){
      visible[i]=cells[i].firstElementChild?.tagName.toLowerCase()==='svg';
      if(!full&&masks[i]===entry.masks[i]&&visible[i]===entry.visible[i])continue;
      dirty.add(i);const r=Math.floor(i/n),c=i%n;
      for(const [,dr,dc] of directions)if(r+dr>=0&&r+dr<n&&c+dc>=0&&c+dc<n)dirty.add((r+dr)*n+c+dc);
    }
    for(const i of dirty){
      let linked=active&&masks[i]>0&&visible[i];
      for(const [bit,dr,dc,opposite] of directions){
        if(!(masks[i]&bit))continue;
        const row=Math.floor(i/n)+dr,col=i%n+dc,j=row*n+col;
        if(row<0||col<0||row>=n||col>=n||!(masks[j]&opposite)||!visible[j])linked=false;
      }
      put(cells[i],'data-kd-gold-linked',linked?'':null);
    }
    put(board,'data-kd-gold-dense',active&&n>=7?'':null);
    if(board.hasAttribute('data-kd-gold-complete')&&!window.kdGetLearningState?.().locked)put(board,'data-kd-gold-complete',null);
    entry={n,cells,masks:Array.from(masks),visible,active};
  }
  function completed(){
    const panel=modal.querySelector('.kdWinPanel[data-run]'),run=panel?.dataset.run;
    if(!gold()||!modal.classList.contains('show')||!window.kdGetLearningState?.().locked||!run||run===lastRun)return;
    lastRun=run;put(board,'data-kd-gold-complete',run);
  }
  /* Gap and inner-padding clicks use the nearest real cell, only inside the board.
     Existing cell clicks, keyboard input, fixed-node rules and modal hit testing are untouched. */
  function routeGap(e){
    if(e.target!==board||e.button!==0||e.detail<1||!entry)return;
    const box=board.getBoundingClientRect();
    if(e.clientX<box.left||e.clientX>=box.right||e.clientY<box.top||e.clientY>=box.bottom)return;
    let nearest=null,distance=Infinity;
    for(const cell of entry.cells){const r=cell.getBoundingClientRect(),d=(e.clientX-r.left-r.width/2)**2+(e.clientY-r.top-r.height/2)**2;if(d<distance){nearest=cell;distance=d;}}
    if(nearest){e.preventDefault();e.stopPropagation();nearest.click();}
  }
  board.addEventListener('click',routeGap,true);
  new MutationObserver(completed).observe(modal,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-run']});
  new MutationObserver(()=>afterRender(board)).observe(document.documentElement,{attributes:true,attributeFilter:['data-kd-theme']});
  window.kdObsidian={afterRender};
  afterRender(board);completed();
})();
