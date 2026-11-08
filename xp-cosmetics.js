/* Cosmetic unlocks are derived from existing XP; selections are local to each account. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.kdXpCosmetics=api;})(typeof window==='object'?window:null,window=>{'use strict';
const definitions=Object.freeze([
 Object.freeze({id:'base',level:1,name:'Çırak',icon:'◇'}),
 Object.freeze({id:'bronze',level:5,name:'Bağlantı Yolcusu',icon:'◈'}),
 Object.freeze({id:'moon',level:10,name:'Gece Muhafızı',icon:'☾'}),
 Object.freeze({id:'crystal',level:20,name:'Kristal Ustası',icon:'✧'}),
 Object.freeze({id:'crown',level:35,name:'Düğüm Efsanesi',icon:'♛'})
]);
const amount=value=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):0;
function project(experience){const xp=amount(experience),level=Math.floor(xp/150)+1;return {xp,level,items:definitions.map(item=>({...item,unlocked:level>=item.level})),next:definitions.find(item=>item.level>level)||null};}
function readXp(){try{return JSON.parse(window.localStorage.getItem('kd64_xp'))||0}catch{return 0}}
function selectionKey(){const owner=window.kdEconomy?.owner?.();return 'kdCosmeticSelection:'+(owner?'account:'+encodeURIComponent(owner):'guest');}
function current(){const p=project(readXp());let choice=null;try{choice=window.localStorage.getItem(selectionKey())}catch{}return p.items.find(item=>item.id===choice&&item.unlocked)||p.items[0];}
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){const p=project(readXp()),active=current();return `<section class="kdXpCosmetics" aria-label="Seviye armağanları"><div class="kdModernSectionHeading"><h3>Seviye armağanları</h3><span>UNVAN VE ÇERÇEVE</span></div><p>XP kazan, kalıcı görünüm seçeneklerini aç.</p><div class="kdXpCosmeticGrid">${p.items.map(item=>`<button type="button" data-xp-cosmetic="${item.id}" class="kdXpCosmeticCard ${item.id===active.id?'selected':''}" aria-pressed="${item.id===active.id}" ${!item.unlocked||item.id===active.id?'disabled':''}><span aria-hidden="true">${item.icon}</span><strong>${esc(item.name)}</strong><small><span>SEVİYE</span> ${item.level}</small><b>${item.id===active.id?'✓ AKTİF':item.unlocked?'UYGULA':'KİLİTLİ'}</b></button>`).join('')}</div><p class="kdXpCosmeticNext">${p.next?`<span>Sıradaki görünüm</span>: <strong>${esc(p.next.name)}</strong> · <span>SEVİYE</span> ${p.next.level}`:'Tüm seviye görünümleri açık.'}</p></section>`;}
function apply(){const identity=window.document.querySelector('.kdProfileIdentity');if(!identity)return;const selected=current();identity.dataset.xpCosmetic=selected.id;let title=identity.querySelector('.kdXpCosmeticTitle');if(!title){title=window.document.createElement('small');title.className='kdXpCosmeticTitle';const copy=identity.querySelector('div:not(.kdAvatar)');if(!copy)return;copy.appendChild(title);}title.textContent=window.kdTranslate?.(selected.name)||selected.name;}
function select(id){const choice=project(readXp()).items.find(item=>item.id===id);if(!choice?.unlocked)return false;try{window.localStorage.setItem(selectionKey(),id)}catch{return false;}apply();const panel=window.document.querySelector('.kdXpCosmetics');if(panel){const host=window.document.createElement('div');host.innerHTML=render();panel.replaceWith(host.firstElementChild);}return true;}
if(window)window.document.addEventListener('click',event=>{const button=event.target.closest?.('[data-xp-cosmetic]');if(button&&!button.disabled)select(button.dataset.xpCosmetic);});
return {definitions,project,current,render,apply,select};
});
