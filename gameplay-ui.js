/* Control presentation only: existing buttons, click handlers and puzzle data stay authoritative. */
(()=>{'use strict';
 const game=document.getElementById('kdGame'),toolbar=game?.querySelector('.kdGameActions');if(!toolbar)return;
 const original={hint:'İPUCU',undo:'GERİ AL',restart:'YENİDEN BAŞLAT',new:'BULMACAYI YENİLE'};
 const put=(e,k,v)=>{if(e.getAttribute(k)!==v)e.setAttribute(k,v)};
 function sync(){for(const [id,label]of Object.entries(original)){const button=document.getElementById(id),text=button.textContent.trim();put(button,'aria-label',text);put(button,'title',text);put(button,'data-kd-action-label',window.kdTranslate?.(label)||label);if(id==='hint'){const count=text.match(/\((\d+)/)?.[1];const freeLabel=count?'◈ İPUCU ('+count+' ücretsiz)':'';const free=count&&(text===freeLabel||text===(window.kdTranslate?.(freeLabel)||freeLabel));put(button,'data-kd-hint-count',count?(free?count:'◆'+count):(text.includes('▶')?'▶':'0'));}}}
 let frame=0;
 function layout(){frame=0;if(game.hidden)return;const main=game.querySelector('main'),board=document.getElementById('board'),style=getComputedStyle(main),landscape=innerWidth>innerHeight&&innerHeight<=550;
  const width=main.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),height=main.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
  const gap=parseFloat(style.rowGap)||3,others=[...main.children].filter(e=>e!==board&&getComputedStyle(e).display!=='none'&&!e.hidden);
  const used=landscape?0:others.reduce((sum,e)=>sum+e.getBoundingClientRect().height,0)+gap*Math.max(0,others.length);
  const column=landscape?(width-(parseFloat(style.columnGap)||14))/2:width;
  const size=Math.max(40,Math.floor(Math.min(column,(column+14)/1.026-6,(height-used-2)/1.045-6)));
  if(main.style.getPropertyValue('--kd-play-board')!==size+'px')main.style.setProperty('--kd-play-board',size+'px');
 }
 function requestLayout(){if(!frame)frame=requestAnimationFrame(layout)}
 let queued=false;const update=()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;sync();requestLayout()})};
 new MutationObserver(update).observe(toolbar,{childList:true,characterData:true,subtree:true});
 new MutationObserver(update).observe(document.documentElement,{attributes:true,attributeFilter:['lang','style']});
 new MutationObserver(requestLayout).observe(game,{attributes:true,attributeFilter:['hidden','class','style']});
 new MutationObserver(requestLayout).observe(game.querySelector('.instructions'),{childList:true,characterData:true,subtree:true});
 const resize=new ResizeObserver(requestLayout);for(const e of [game.querySelector('main'),...game.querySelectorAll('main>.stats,main>.instructions,main>.status,main>.kdGameActions')])resize.observe(e);
 window.addEventListener('resize',()=>{if(frame)cancelAnimationFrame(frame);layout()},{passive:true});window.kdGameLayout={refresh:requestLayout};sync();requestLayout();
})();
