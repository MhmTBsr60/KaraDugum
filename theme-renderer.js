/* Cosmetic renderer only. Tile masks, hit targets, rules and save data belong to the game. */
(()=>{'use strict';
const themes={
 gold:{name:'KADİM TAŞ',metal:['#42270f','#bc8135','#fff1b5','#dfa94e','#694019'],gem:['#744214','#ffe8a4','#bc8437']},
 ice:{name:'GECE TAPINAĞI',metal:['#223849','#809bad','#f1faff','#a8c8dc','#38586c'],gem:['#224e7f','#b5e7ff','#5498ce']},
 fire:{name:'ÇÖL HARABELERİ',metal:['#613610','#ca893b','#ffebaa','#dbaa54','#7d4b1d'],gem:['#8f5414','#ffe89d','#d5a052']},
 shadow:{name:'GECE MORU',metal:['#372544','#9f82b4','#f1e7ff','#bea4cd','#644c78'],gem:['#4b1b79','#e4c7ff','#9562c1']},
 emerald:{name:'ZÜMRÜT MABEDİ',metal:['#47300d','#bd923a','#fff2b0','#d8b557','#71501b'],gem:['#06492b','#a8ffcd','#21935c']},
 ruby:{name:'YAKUT ATEŞİ',metal:['#452a14','#bb853a','#ffedb8','#dbae57','#744d24'],gem:['#61091d','#ffc1a6','#cf2941']}
};
const current=()=>Object.hasOwn(themes,document.documentElement.getAttribute('data-kd-theme'))?document.documentElement.getAttribute('data-kd-theme'):'gold';
function gradient(id,colors,axis='x'){return `<linearGradient id="${id}" x1="0" y1="0" x2="${axis==='y'?'0':'1'}" y2="${axis==='x'?'0':'1'}">${colors.map((c,i)=>`<stop offset="${i/(colors.length-1)}" stop-color="${c}"/>`).join('')}</linearGradient>`;}
function definitions(){return Object.entries(themes).map(([id,t])=>['x','y','a'].map(axis=>gradient(`kd617-${id}-${axis}`,t.metal,axis)).join('')+gradient(`kd617-${id}-gem`,t.gem,'a')).join('')+gradient('kd617-lustre-x',['#0008','#fff9','#fff1','#0006'],'x')+gradient('kd617-lustre-y',['#0008','#fff9','#fff1','#0006'],'y')+gradient('kd617-lustre-a',['#0007','#fffa','#fff1','#0005'],'a');}
const elbows={3:'M50 0 V25 Q50 50 75 50 H100',6:'M100 50 H75 Q50 50 50 75 V100',12:'M50 100 V75 Q50 50 25 50 H0',9:'M0 50 H25 Q50 50 50 25 V0'};
function pipe(mask,index,theme){
 const id=Object.hasOwn(themes,theme)?theme:current(),color=Number.isInteger(index)?window.kdExtra?.colors?.[index]:null;
 const axis=mask===5||mask===1||mask===4?'x':mask===10||mask===2||mask===8?'y':'a';
 let d=elbows[mask]||(mask===5?'M50 0V100':mask===10?'M0 50H100':[[1,'M50 50V0'],[2,'M50 50H100'],[4,'M50 50V100'],[8,'M50 50H0']].filter(([bit])=>mask&bit).map(([,path])=>path).join(''));
 const width=['emerald','ruby'].includes(id)?20:13,collarWidth=width+14;
 const collars=[[1,50,13,0],[2,87,50,90],[4,50,87,180],[8,13,50,270]].filter(([bit])=>mask&bit).map(([,x,y,a])=>`<g class="kdPipeCollar" transform="translate(${x} ${y}) rotate(${a})"><rect x="${-collarWidth/2}" y="-5" width="${collarWidth}" height="10" rx="2" fill="url(#kd617-${id}-x)" stroke="#302011" stroke-width="1"/><path d="M${-collarWidth/2+3} -3v6m${collarWidth-6} -6v6M-4 -2l4 4 4-4" fill="none" stroke="#ffebb3" stroke-opacity=".55" stroke-width="1"/></g>`).join('');
 const joint=elbows[mask]||mask===5||mask===10?'':`<circle class="kdPipeJoint" cx="50" cy="50" r="${width/2+6}" style="fill:url(#kd617-${id}-a);stroke:#443013;stroke-width:1.5"/><circle cx="50" cy="50" r="${width/2+1}" class="kdPipeJointLight"/><path d="M45 44q5-4 10 0" fill="none" stroke="#fff4d9" stroke-opacity=".8" stroke-width="2"/>`;
 return `<svg viewBox="0 0 100 100" data-pipe-mask="${mask}" data-pipe-theme="${id}" class="kdSculptedPipe" aria-hidden="true" ${color?`style="--pipe-tone:${color};--skin-energy:${color}"`:''}><path class="kdPipeCastShadow" d="${d}"/><path class="kdPipeShell" d="${d}" style="stroke:url(#kd617-${id}-${axis})"/><path class="kdPipeCore" d="${d}" ${color?`style="stroke:${color}"`:''}/><path class="kdPipeEnergy" d="${d}"/><path class="kdPipeLustre" d="${d}" style="stroke:url(#kd617-lustre-${axis})"/><path class="kdPipeFilament" d="${d}"/>${collars}${joint}</svg>`;
}
function diamond(id,x,y,angle=0,scale=1){return `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})"><path d="M0-26 20 0 0 26-20 0Z" fill="url(#kd617-${id}-a)" stroke="#f4d791" stroke-width="1.5"/><path d="M0-20 13 0 0 20-13 0Z" fill="url(#kd617-${id}-gem)" stroke="#1e2419" stroke-width="2"/><path d="M0-20-13 0 0-4Z" fill="#ffffff55"/><path d="M0-20 13 0 0-4Z" fill="#0004"/><path d="M-13 0 0 20 0-4Z" fill="#0006"/><path d="M13 0 0 20 0-4Z" fill="#ffffff22"/><path d="M-24-12-12 0-24 12M24-12 12 0 24 12" fill="none" stroke="#cca55c" stroke-width="3"/></g>`;}
function frame(theme){const id=Object.hasOwn(themes,theme)?theme:current();return `<svg class="kdBoardOrnament" data-frame-theme="${id}" viewBox="0 0 600 600" aria-hidden="true" focusable="false"><rect x="14" y="14" width="572" height="572" rx="13" fill="none" stroke="#20150c" stroke-width="16"/><rect x="14" y="14" width="572" height="572" rx="13" fill="none" stroke="url(#kd617-${id}-a)" stroke-width="11"/><rect x="24" y="24" width="552" height="552" rx="6" fill="none" stroke="#f6d797" stroke-opacity=".75" stroke-width="1.5"/>${[0,90,180,270].map(angle=>`<g transform="rotate(${angle} 300 300)"><path d="M14 70V25L25 14H70L58 28H31V58Z" fill="url(#kd617-${id}-a)" stroke="#f2d194" stroke-width="1.2"/><path d="M30 36 47 21 40 44 22 55Z" fill="url(#kd617-${id}-gem)" stroke="#cfad6b" stroke-width="2"/><path d="M86 13l14 5 14-5 14 5 14-5m36 0 14 5 14-5m-70 8 7 3 7-3m17 0 7 3 7-3" fill="none" stroke="#e3c37f" stroke-width="1.2" opacity=".7"/></g>`).join('')}${diamond(id,300,14)}${diamond(id,300,586,180)}${diamond(id,14,300,-90,.8)}${diamond(id,586,300,90,.8)}</svg>`;}
function refresh(){
 const game=document.getElementById('kdGame');if(!game)return;
 const id=current();let label=document.getElementById('kdGameThemeLabel');if(!label){label=document.createElement('div');label.id='kdGameThemeLabel';label.className='kdGameThemeLabel';game.prepend(label);}const name=window.kdTranslate?.(themes[id].name)||themes[id].name;if(label.textContent!==name)label.textContent=name;
 const board=document.getElementById('board');if(!board)return;
 for(const tile of board.querySelectorAll('.tile[data-pipe]')){const svg=tile.querySelector('svg');if(svg&&svg.dataset.pipeTheme!==id)svg.outerHTML=pipe(Number(tile.dataset.pipe),Number(tile.dataset.i),id);}
 const ornament=board.querySelector('.kdBoardOrnament');if(ornament&&ornament.dataset.frameTheme!==id)ornament.outerHTML=frame(id);
}
window.kdThemeArt={pipe,frame,refresh,themes};
function mount(){const defs=document.createElementNS('http://www.w3.org/2000/svg','svg');defs.setAttribute('class','kdThemeDefinitions');defs.setAttribute('aria-hidden','true');defs.setAttribute('width','0');defs.setAttribute('height','0');defs.innerHTML='<defs>'+definitions()+'</defs>';document.body.prepend(defs);refresh();new MutationObserver(refresh).observe(document.documentElement,{attributes:true,attributeFilter:['data-kd-theme']});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
