/* Optional fixed challenges. This module never writes normal campaign or economy data. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.kdWorkshop=api;})(typeof globalThis!=='undefined'?globalThis:this,root=>{
'use strict';
const D=[1,2,4,8],OP=[4,8,1,2],ARROWS={1:'↑',2:'→',4:'↓',8:'←'};
const strings={
 'Mekanik Atölyesi':'Mechanic Workshop',
 'İki yeni bağlantı kuralını keşfet.':'Discover two new connection rules.',
 'Altı kısa bulmaca, iki farklı düşünme biçimi.':'Six short puzzles, two ways to think.',
 'Çift enerji':'Dual energy','Yönlü akış':'Directed flow','Başlangıç':'Beginner','Gelişen':'Intermediate','Usta':'Expert',
 'A ve B kaynaklarını kendi hedeflerine bağla. İki enerji birbirine karışmasın.':'Connect sources A and B to their matching targets. Keep the two energies apart.',
 'Okları kaynaktan hedefe doğru sırala. Akış bütün taşlardan geçsin.':'Point the arrows from the source to the target. The flow must pass through every tile.',
 'Taşa dokunarak saat yönünde döndür. Kaynak ve hedefler sabittir.':'Tap a tile to rotate it clockwise. Sources and targets stay fixed.',
 'Atölyedeki denemelerin ana yolculuğunu ve kristallerini etkilemez.':'Workshop attempts leave your main journey and crystals unchanged.',
 'A kaynağı':'Source A','A hedefi':'Target A','B kaynağı':'Source B','B hedefi':'Target B','Kaynak':'Source','Hedef':'Target',
 'Aç':'Open','Tamamlandı':'Completed','Yeniden dene':'Try again','Atölyeye dön':'Back to workshop',
 'Bağlantı tamamlandı!':'Connection complete!','İki enerji doğru hedeflere ulaştı.':'Both energies reached their matching targets.',
 'Akış, okları izleyerek hedefe ulaştı.':'The flow followed the arrows to the target.',
 'Kaynak ve hedefler sabittir.':'Sources and targets stay fixed.',
 'Açık uçları karşılıklı bağla.':'Match the open pipe ends.',
 'İki enerji birbirine karıştı. Yolları ayır.':'The two energies mixed. Separate their paths.',
 'Kaynakları kendi hedeflerine bağla.':'Connect each source to its matching target.',
 'Bütün taşları bir akışa dahil et.':'Include every tile in a flow.',
 'Okların yönünü kontrol et.':'Check the direction of the arrows.',
 'Bağlantıları denemeye devam et.':'Keep trying the connections.',
 'Hamle: {0}':'Moves: {0}','En iyi: {0} hamle':'Best: {0} moves','{0}/6 tamamlandı':'{0}/6 completed',
 'Bulmaca {0}':'Puzzle {0}',
 'Satır {0}, sütun {1}. {2}':'Row {0}, column {1}. {2}',
 'Döndür. Açık yönler: {0}.':'Rotate. Open directions: {0}.',
 'Döndür. Giriş {0}, çıkış {1}.':'Rotate. Inlet {0}, outlet {1}.',
 'yukarı':'up','sağ':'right','aşağı':'down','sol':'left','yok':'none',
 'İlerlemeni kaydedemedik. Bu ekranı kapatmadan yeniden dene.':'We could not save your progress. Try again before leaving this screen.',
 'İlerlemeyi yeniden kaydet':'Retry saving progress',
 'Bu deneme önceki oyuncuya ait. Yeni bir bulmaca seç.':'This attempt belongs to the previous player. Choose a new puzzle.'
};
function language(){return root.kdLocalization?.language?.()||root.document?.documentElement?.lang||root.navigator?.language||'tr';}
function t(key,...args){let value;try{value=root.kdTranslate?.(key);}catch{}if(!value||value===key)value=String(language()).toLowerCase().startsWith('tr')?key:(strings[key]||key);return value.replace(/\{(\d+)\}/g,(_,n)=>String(args[Number(n)]??''));}
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function rotate(mask,times=1){for(let k=0;k<((times%4)+4)%4;k++)mask=((mask<<1)&15)|(mask>>3);return mask;}
function direction(a,b,n){if(b===a-n)return 1;if(b===a+1&&(a/n|0)===(b/n|0))return 2;if(b===a+n)return 4;if(b===a-1&&(a/n|0)===(b/n|0))return 8;throw Error('Non-adjacent workshop path');}
function serpent(n){return Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>r*n+(r%2?n-1-c:c))).flat();}
function make(id,kind,n,paths,rank){const cells=Array.from({length:n*n},()=>({mask:0,input:0,output:0}));for(const route of paths){for(let i=0;i<route.length;i++){const at=route[i],input=i?direction(at,route[i-1],n):0,output=i+1<route.length?direction(at,route[i+1],n):0;cells[at]={mask:input|output,input,output};}}const sources=paths.map(p=>p[0]),targets=paths.map(p=>p.at(-1)),fixed=[...sources,...targets];return {id,kind,n,rank,cells,sources,targets,fixed,initial:cells.map((cell,i)=>fixed.includes(i)?0:((i*7+rank*3)%3)+1)};}
const long=serpent(5);
const puzzles=[
 make('energy-1','dual',3,[[0,1,2],[3,6,7,8,5,4]],0),
 make('energy-2','dual',4,[[0,1,5,4,8,9,10,6,2,3,7],[12,13,14,15,11]],1),
 make('energy-3','dual',5,[long.slice(0,12),long.slice(12)],2),
 make('flow-1','directed',3,[serpent(3)],0),
 make('flow-2','directed',4,[[0,4,8,12,13,9,5,1,2,6,10,14,15,11,7,3]],1),
 make('flow-3','directed',5,[[0,1,2,7,6,5,10,11,12,13,8,3,4,9,14,19,18,17,16,15,20,21,22,23,24]],2)
];
function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}freeze(puzzles);
function neighbor(i,bit,n){const r=i/n|0,c=i%n;if(bit===1)return r?i-n:-1;if(bit===2)return c<n-1?i+1:-1;if(bit===4)return r<n-1?i+n:-1;return c?i-1:-1;}
function evaluate(puzzle,turns){
 if(!puzzle||!Array.isArray(turns)||turns.length!==puzzle.n*puzzle.n||turns.some(v=>!Number.isInteger(v)||v<0||v>3))return {solved:false,reason:'ends',flows:[]};
 const cells=puzzle.cells.map((cell,i)=>({mask:rotate(cell.mask,turns[i]),input:rotate(cell.input,turns[i]),output:rotate(cell.output,turns[i])})),flows=Array(cells.length).fill(0),graph=cells.map(()=>[]);let leaks=false;
 for(let i=0;i<cells.length;i++)for(let k=0;k<4;k++){const bit=D[k];if(!(cells[i].mask&bit))continue;const j=neighbor(i,bit,puzzle.n);if(j<0||!(cells[j].mask&OP[k])){leaks=true;continue;}graph[i].push(j);}
 if(puzzle.kind==='dual'){
  for(let source=0;source<puzzle.sources.length;source++){const color=1<<source,queue=[puzzle.sources[source]],seen=new Set(queue);for(let k=0;k<queue.length;k++){const i=queue[k];flows[i]|=color;for(const j of graph[i])if(!seen.has(j)){seen.add(j);queue.push(j);}}}
  const mixed=flows.some(v=>v===3),targets=puzzle.targets.every((i,k)=>flows[i]===(1<<k)),covered=flows.every(Boolean);
  return {solved:!leaks&&!mixed&&targets&&covered,reason:mixed?'mixed':leaks?'ends':!targets?'targets':!covered?'coverage':'done',flows,cells};
 }
 let wrong=false;for(let i=0;i<cells.length;i++){const cell=cells[i];if(!cell.output)continue;const j=neighbor(i,cell.output,puzzle.n),back=OP[D.indexOf(cell.output)];if(j<0||cells[j].input!==back)wrong=true;}
 const start=puzzle.sources[0],target=puzzle.targets[0],seen=new Set();let at=start;while(at>=0&&!seen.has(at)){seen.add(at);flows[at]=1;if(!cells[at].output)break;const next=neighbor(at,cells[at].output,puzzle.n);if(next<0||cells[next].input!==OP[D.indexOf(cells[at].output)])break;at=next;}
 const connected=seen.has(target),covered=seen.size===cells.length;
 return {solved:!leaks&&!wrong&&connected&&covered,reason:leaks?'ends':wrong?'direction':!connected?'targets':!covered?'coverage':'done',flows,cells};
}
const ranks=['Başlangıç','Gelişen','Usta'];let run=null,sessionOwner=null,notice='',saveFailed=false;const memory=new Map(),dirtyOwners=new Set(),bound=new WeakMap();
function owner(){const value=root.kdEconomy?.owner?.();return typeof value==='string'&&value?value:'guest';}
const storageKey=who=>'kdWorkshop_v1:'+encodeURIComponent(who);
function progress(who=owner()){let raw;try{raw=root.kdStorage?.read(storageKey(who),null);}catch{}const complete={};for(const candidate of [raw,memory.get(who)])if(candidate?.version===1&&candidate.complete&&typeof candidate.complete==='object')for(const p of puzzles){const n=candidate.complete[p.id];if(Number.isInteger(n)&&n>=0&&n<=100000)complete[p.id]=complete[p.id]===undefined?n:Math.min(complete[p.id],n);}return {version:1,complete};}
function syncOwner(){const who=owner();if(sessionOwner!==who){run=null;notice='';saveFailed=dirtyOwners.has(who);sessionOwner=who;}return who;}
function persist(who){if(who!==owner())return false;const record=progress(who);let saved=false;try{saved=root.kdStorage?.write(storageKey(who),record)===true;}catch{}if(saved)dirtyOwners.delete(who);else dirtyOwners.add(who);saveFailed=!saved;return saved;}
function remember(){if(!run||run.owner!==owner())return false;const record=progress(run.owner),old=record.complete[run.id];if(old===undefined||run.moves<old)record.complete[run.id]=run.moves;memory.set(run.owner,record);return persist(run.owner);}
function start(id){const who=syncOwner(),puzzle=puzzles.find(p=>p.id===id);if(!puzzle)return false;run={id,owner:who,turns:puzzle.initial.slice(),moves:0,solved:false};notice='';saveFailed=dirtyOwners.has(who);return true;}
function pipe(mask,theme){if(root.kdThemeArt?.pipe)return root.kdThemeArt.pipe(mask,undefined,theme);const lines=D.filter(bit=>mask&bit).map(bit=>`<path d="M50 50L${bit===2?100:bit===8?0:50} ${bit===1?0:bit===4?100:50}"/>`).join('');return `<svg viewBox="0 0 100 100" aria-hidden="true"><g stroke="currentColor" stroke-width="12">${lines}</g></svg>`;}
function marker(puzzle,i){const a=puzzle.sources.indexOf(i),b=puzzle.targets.indexOf(i),k=a>=0?a:b;if(k<0)return '';const letter=puzzle.kind==='dual'?(k?'B':'A'):'';return `<span class="kdWorkshopMarker" data-channel="${k+1}">${a>=0?'●':'◎'} ${letter}</span>`;}
function directions(mask){return D.filter(b=>mask&b).map(b=>t(({1:'yukarı',2:'sağ',4:'aşağı',8:'sol'})[b])).join(', ')||t('yok');}
function role(puzzle,i){const a=puzzle.sources.indexOf(i),b=puzzle.targets.indexOf(i);if(a<0&&b<0)return '';if(puzzle.kind==='directed')return t(a>=0?'Kaynak':'Hedef');return t(a>=0?(a?'B kaynağı':'A kaynağı'):(b?'B hedefi':'A hedefi'));}
function render(){
 syncOwner();const record=progress(),theme=root.document?.documentElement?.getAttribute('data-kd-theme')||'gold';
 if(!run)return `<section class="kdWorkshop" aria-label="${esc(t('Mekanik Atölyesi'))}"><div class="kdWorkshopHero"><span class="kdEyebrow">${esc(t('Mekanik Atölyesi'))}</span><h2>${esc(t('İki yeni bağlantı kuralını keşfet.'))}</h2><p>${esc(t('Altı kısa bulmaca, iki farklı düşünme biçimi.'))}</p><strong>${esc(t('{0}/6 tamamlandı',Object.keys(record.complete).length))}</strong></div>${['dual','directed'].map(kind=>`<section class="kdWorkshopGroup"><h3>${esc(t(kind==='dual'?'Çift enerji':'Yönlü akış'))}</h3><p>${esc(t(kind==='dual'?'A ve B kaynaklarını kendi hedeflerine bağla. İki enerji birbirine karışmasın.':'Okları kaynaktan hedefe doğru sırala. Akış bütün taşlardan geçsin.'))}</p><div class="kdWorkshopCards">${puzzles.filter(p=>p.kind===kind).map(p=>`<button type="button" data-workshop-start="${p.id}"><span>${esc(t(ranks[p.rank]))} · ${p.n}×${p.n}</span><strong>${esc(t('Bulmaca {0}',p.rank+1))}</strong><small>${record.complete[p.id]===undefined?esc(t('Aç')):'✓ '+esc(t('Tamamlandı'))+' · '+esc(t('En iyi: {0} hamle',record.complete[p.id]))}</small></button>`).join('')}</div></section>`).join('')}${saveFailed?`<div class="kdWorkshopStatus" role="status">${esc(t('İlerlemeni kaydedemedik. Bu ekranı kapatmadan yeniden dene.'))}</div><button type="button" class="kdWorkshopSave" data-workshop-save>${esc(t('İlerlemeyi yeniden kaydet'))}</button>`:''}<p class="kdWorkshopSafe">${esc(t('Atölyedeki denemelerin ana yolculuğunu ve kristallerini etkilemez.'))}</p></section>`;
 const p=puzzles.find(p=>p.id===run.id),result=evaluate(p,run.turns),message=saveFailed?'İlerlemeni kaydedemedik. Bu ekranı kapatmadan yeniden dene.':notice||({'mixed':'İki enerji birbirine karıştı. Yolları ayır.','ends':'Açık uçları karşılıklı bağla.','targets':'Kaynakları kendi hedeflerine bağla.','direction':'Okların yönünü kontrol et.','coverage':'Bütün taşları bir akışa dahil et.','done':p.kind==='dual'?'İki enerji doğru hedeflere ulaştı.':'Akış, okları izleyerek hedefe ulaştı.'})[result.reason];
 return `<section class="kdWorkshop" data-active-workshop="${p.id}"><button type="button" class="kdWorkshopReturn" data-workshop-list>‹ ${esc(t('Atölyeye dön'))}</button><div class="kdWorkshopPlayHeading"><h2>${esc(t(p.kind==='dual'?'Çift enerji':'Yönlü akış'))}</h2><span>${esc(t(ranks[p.rank]))} · ${p.n}×${p.n}</span><strong>${esc(t('Hamle: {0}',run.moves))}</strong></div><p class="kdWorkshopRule">${esc(t(p.kind==='dual'?'A ve B kaynaklarını kendi hedeflerine bağla. İki enerji birbirine karışmasın.':'Okları kaynaktan hedefe doğru sırala. Akış bütün taşlardan geçsin.'))}</p><div class="kdWorkshopLegend">${(p.kind==='dual'?['A kaynağı','A hedefi','B kaynağı','B hedefi']:['Kaynak','Hedef']).map((key,i)=>`<span data-channel="${p.kind==='dual'?Math.floor(i/2)+1:1}">${i%2===0?'●':'◎'} ${esc(t(key))}</span>`).join('')}</div><div class="kdWorkshopBoard kdMiniBoard" data-kd-preview="${esc(theme)}" data-board-size="${p.n}" style="grid-template-columns:repeat(${p.n},minmax(0,1fr))" role="group" aria-label="${esc(t('Bulmaca {0}',p.rank+1))}">${result.cells.map((cell,i)=>{const fixed=p.fixed.includes(i),label=role(p,i)||t(p.kind==='dual'?'Döndür. Açık yönler: {0}.':'Döndür. Giriş {0}, çıkış {1}.',directions(p.kind==='dual'?cell.mask:cell.input),directions(cell.output));return `<button type="button" class="tile kdWorkshopTile" data-workshop-tile="${i}" data-flow="${result.flows[i]}" data-pipe="${cell.mask}" aria-disabled="${fixed||run.solved?'true':'false'}" aria-label="${esc(t('Satır {0}, sütun {1}. {2}',(i/p.n|0)+1,i%p.n+1,label))}">${pipe(cell.mask,theme)}${p.kind==='directed'&&cell.output?`<span class="kdWorkshopArrow" aria-hidden="true">${ARROWS[cell.output]}</span>`:''}${marker(p,i)}</button>`;}).join('')}${root.kdThemeArt?.frame?.(theme)||''}</div><p class="kdWorkshopInstruction">${esc(t('Taşa dokunarak saat yönünde döndür. Kaynak ve hedefler sabittir.'))}</p><div class="kdWorkshopStatus ${run.solved?'isSolved':''}" role="status" aria-live="polite">${run.solved?'<strong>✓ '+esc(t('Bağlantı tamamlandı!'))+'</strong>':''}<p>${esc(t(message))}</p></div>${saveFailed?`<button type="button" class="kdWorkshopSave" data-workshop-save>${esc(t('İlerlemeyi yeniden kaydet'))}</button>`:''}<div class="kdWorkshopActions"><button type="button" data-workshop-reset>${esc(t('Yeniden dene'))}</button><button type="button" data-workshop-list>${esc(t('Atölyeye dön'))}</button></div><p class="kdWorkshopSafe">${esc(t('Atölyedeki denemelerin ana yolculuğunu ve kristallerini etkilemez.'))}</p></section>`;
}
function redraw(container,focus){const panel=container.querySelector('.kdWorkshop');if(panel)panel.outerHTML=render();if(Number.isInteger(focus))container.querySelector(`[data-workshop-tile="${focus}"]`)?.focus();}
function bind(container=root.document?.getElementById('kdShell')){if(!container||bound.has(container))return;const click=e=>{const button=e.target.closest?.('[data-workshop-start],[data-workshop-list],[data-workshop-reset],[data-workshop-tile],[data-workshop-save]');if(!button||!container.contains(button))return;const oldOwner=sessionOwner;syncOwner();if(oldOwner&&oldOwner!==sessionOwner){redraw(container);return;}if(button.hasAttribute('data-workshop-start')){start(button.dataset.workshopStart);redraw(container);container.querySelector('[data-workshop-tile="0"]')?.focus();return;}if(button.hasAttribute('data-workshop-list')){run=null;notice='';saveFailed=dirtyOwners.has(owner());redraw(container);return;}if(button.hasAttribute('data-workshop-reset')){if(run)start(run.id);redraw(container);return;}if(button.hasAttribute('data-workshop-save')){persist(owner());redraw(container);return;}if(!run||run.owner!==owner()||run.solved)return;const i=Number(button.dataset.workshopTile),p=puzzles.find(p=>p.id===run.id);if(!Number.isInteger(i)||i<0||i>=p.cells.length)return;if(p.fixed.includes(i)){notice='Kaynak ve hedefler sabittir.';redraw(container,i);return;}notice='';run.turns[i]=(run.turns[i]+1)%4;run.moves++;if(evaluate(p,run.turns).solved){run.solved=true;remember();}redraw(container,i);};const key=e=>{const tile=e.target.closest?.('[data-workshop-tile]');if(!tile||!run||!container.contains(tile))return;const p=puzzles.find(p=>p.id===run.id),i=Number(tile.dataset.workshopTile),key=e.key;let next=i;if(key==='ArrowUp')next=Math.max(0,i-p.n);else if(key==='ArrowDown')next=Math.min(p.cells.length-1,i+p.n);else if(key==='ArrowLeft')next=i%p.n?i-1:i;else if(key==='ArrowRight')next=i%p.n<p.n-1?i+1:i;else if(key==='Home')next=(i/p.n|0)*p.n;else if(key==='End')next=Math.min(p.cells.length-1,(i/p.n|0)*p.n+p.n-1);else return;e.preventDefault();container.querySelector(`[data-workshop-tile="${next}"]`)?.focus();};container.addEventListener('click',click);container.addEventListener('keydown',key);bound.set(container,{click,key});}
function leave(){run=null;notice='';saveFailed=dirtyOwners.has(owner());}
return {puzzles,evaluate,rotate,render,bind,start,leave,strings,storageKey};
});
