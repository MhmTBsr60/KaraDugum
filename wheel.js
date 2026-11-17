/* Daily reward wheel: one free spin and one extra spin after 3 completed ads. */
(()=>{'use strict';
const key='kd64_wheelState',pendingAdKey='kd64_wheelAdPending';
const prizes=[{label:'10 kristal',coins:10},{label:'25 kristal',coins:25},{label:'1 ipucu',hints:1},{label:'Boş',coins:0},{label:'15 kristal',coins:15},{label:'50 kristal',coins:50},{label:'20 kristal',coins:20},{label:'30 kristal',coins:30}];
const day=()=>new Date().toLocaleDateString('en-CA');
const read=(k,fallback)=>{try{return JSON.parse(localStorage.getItem(k))??fallback}catch{return fallback}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const amount=value=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):0;
let rotation=0,sequence=0,settleTimer=null;
const id=()=>Date.now().toString(36)+'_'+(++sequence)+'_'+Math.random().toString(36).slice(2,12);
function state(){
 let s=read(key,null);
 if(!s||typeof s!=='object'||Array.isArray(s))s={};
 if(s.date!==day()){
  // Keep an unsettled spin through midnight and apply its already selected reward first.
  if(s.pending&&validPrize(s.pending.prizeIndex))settle(s,true);
  s={date:day(),freeUsed:read('kd64_shopWheelDate','')===day(),adCount:0,bonusUsed:false,pending:null};
  write(key,s);localStorage.removeItem(pendingAdKey);
 }
 s.adCount=Math.min(3,amount(s.adCount));return s;
}
function validPrize(index){return Number.isInteger(index)&&index>=0&&index<prizes.length;}
 // Badge reads must never settle an old spin, roll over storage, or grant currency.
 function availability(){const today=day(),raw=read(key,null),s=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{},current=s.date===today,pending=!!s.pending,freeUsed=current&&!!s.freeUsed||read('kd64_shopWheelDate','')===today,freeReady=!pending&&!freeUsed,bonusReady=!pending&&current&&!!s.freeUsed&&amount(s.adCount)>=3&&!s.bonusUsed;return {freeReady,bonusReady,pending,total:Number(freeReady)+Number(bonusReady)};}
 const changed=()=>window.dispatchEvent(new Event('kd:rewards-changed'));
 function changedIf(before){const after=availability();if(['freeReady','bonusReady','pending','total'].some(k=>before[k]!==after[k]))changed();}
 window.kdWheel={availability};
function settle(s,force=false){
 const pending=s.pending;if(!pending||!validPrize(pending.prizeIndex)||(!force&&Date.now()<pending.readyAt))return false;
 const prize=prizes[pending.prizeIndex],multiplier=pending.multiplier===2?2:1;
 // Remove the receipt before applying it so repeated callbacks cannot pay twice.
 s.pending=null;s.lastResult={id:pending.id,label:prize.label,prizeIndex:pending.prizeIndex,multiplier};write(key,s);
 if(window.kdEconomy?.active())window.kdEconomy.transact('wheel:'+s.date+':'+(multiplier===2?'bonus':'free'),{coins:(prize.coins||0)*multiplier,hintCoupons:(prize.hints||0)*multiplier});else{
 if(prize.coins)write('kd64_coins',amount(read('kd64_coins',0))+prize.coins*multiplier);
 if(prize.hints)write('kd64_hintCoupons',amount(read('kd64_hintCoupons',0))+prize.hints*multiplier);
 }
 window.kdRefreshShop?.();window.kdCloudSync?.();render();if(document.getElementById('kdWheelOverlay'))window.kdFeedback?.play(prize.coins||prize.hints?'reward':'empty');changed();return true;
}
function finishPending(){const s=state();if(s.pending){if(!settle(s)){clearTimeout(settleTimer);settleTimer=setTimeout(finishPending,Math.max(1,s.pending.readyAt-Date.now()));}}}
function prizeLabel(prize,multiplier=1){return prize.coins?`${prize.coins*multiplier} kristal`:prize.hints?`${prize.hints*multiplier} ipucu`:prize.label;}
function drawWheel(multiplier=1){
 const point=(r,degrees)=>{const a=degrees*Math.PI/180;return [160+r*Math.cos(a),160+r*Math.sin(a)]};
 const t=value=>window.kdTranslate?.(value)||value;
 return `<svg class="kdWheelDisc" viewBox="0 0 320 320" role="img" aria-label="${t('Şans çarkı: kristal ödülleri, bir ipucu ve boş dilim')}"><defs><radialGradient id="kdWheelObsidian"><stop stop-color="#26323a"/><stop offset="1" stop-color="#090e13"/></radialGradient><linearGradient id="kdWheelMetal" x2="1" y2="1"><stop stop-color="#8e6029"/><stop offset=".28" stop-color="#fff0b8"/><stop offset=".5" stop-color="#b3863f"/><stop offset=".76" stop-color="#f0d999"/><stop offset="1" stop-color="#926329"/></linearGradient><radialGradient id="kdWheelWarm"><stop stop-color="#413725"/><stop offset="1" stop-color="#171915"/></radialGradient></defs><circle cx="160" cy="160" r="157" fill="url(#kdWheelMetal)"/><circle cx="160" cy="160" r="152" fill="#080d11"/>${prizes.map((p,i)=>{const start=-90+i*45,end=start+45,[x1,y1]=point(148,start),[x2,y2]=point(148,end),[tx,ty]=point(105,start+22.5),[gx,gy]=point(135,start+22.5);return `<path d="M160 160 L${x1} ${y1} A148 148 0 0 1 ${x2} ${y2} Z" fill="url(#${i%2?'kdWheelWarm':'kdWheelObsidian'})" stroke="#ac8a50" stroke-width="1"/><circle cx="${gx}" cy="${gy}" r="2" fill="${p.coins||p.hints?'#f6dc9a':'#7d775e'}"/><text x="${tx}" y="${ty}" fill="#fff0c7" font-size="13" font-weight="650" text-anchor="middle" dominant-baseline="middle" transform="rotate(${start+22.5+90} ${tx} ${ty})">${t(prizeLabel(p,multiplier))}</text>`}).join('')}<circle cx="160" cy="160" r="32" fill="url(#kdWheelMetal)" stroke="#141917" stroke-width="3"/><circle cx="160" cy="160" r="26" fill="#111a1d" stroke="#dec58b"/><text x="160" y="169" font-size="27" text-anchor="middle" fill="url(#kdWheelMetal)" stroke="#f5dc9e" stroke-width=".6" style="paint-order:stroke fill">✦</text></svg>`;
}
function render(){
 const overlay=document.getElementById('kdWheelOverlay');if(!overlay)return;
 const s=state(),pending=s.pending,free=!s.freeUsed,bonus=s.freeUsed&&s.adCount>=3&&!s.bonusUsed;
 let request=read(pendingAdKey,null);if(request&&(request.date!==day()||Date.now()-request.at>300000)){localStorage.removeItem(pendingAdKey);request=null;}
 const multiplier=pending?.multiplier===2||bonus||s.bonusUsed&&s.lastResult?.multiplier===2?2:1;
 const stage=overlay.querySelector('.kdWheelStage');if(stage.dataset.multiplier!==String(multiplier)){stage.dataset.multiplier=String(multiplier);stage.querySelector('svg').outerHTML=drawWheel(multiplier);}
 const spin=overlay.querySelector('.kdWheelSpin'),ad=overlay.querySelector('.kdWheelAd'),status=overlay.querySelector('.kdWheelStatus');
 spin.disabled=!!pending||!(free||bonus);spin.textContent=pending?'ÇARK DÖNÜYOR…':free?'ÜCRETSİZ ÇEVİR':bonus?'2× ÖDÜLLE ÇEVİR':'BUGÜNLÜK HAKLARIN BİTTİ';
 ad.hidden=free||s.bonusUsed||s.adCount>=3;ad.disabled=!!pending||!!request;ad.textContent=request?'REKLAM BEKLENİYOR…':`▶ REKLAM İZLE · ${s.adCount}/3`;
 const result=overlay.querySelector('.kdWheelResult');const resultLabel=s.lastResult?(validPrize(s.lastResult.prizeIndex)?prizeLabel(prizes[s.lastResult.prizeIndex],s.lastResult.multiplier===2?2:1):String(s.lastResult.label).replace(/jeton/gi,'kristal')):'';result.textContent=pending?'Ödülün belirleniyor…':s.lastResult?(resultLabel==='Boş'?'Boş dilim ödül vermez.':`Kazandın: ${resultLabel}!`):'';
 status.textContent=pending?'Ödülün belirleniyor…':free?'Günde 1 ücretsiz çevirme.':s.bonusUsed?'Bugün tamamlandı. Yarın tekrar gel.':s.adCount>=3?'Ek çevirmen hazır: 2× ödül.':'3 reklamla ek çevirme: 2× kristal ve ipucu.';
 overlay.dataset.spinning=String(!!pending);overlay.dataset.result=pending?'pending':s.lastResult?(resultLabel==='Boş'?'blank':'won'):'none';
 if(!pending&&s.lastResult&&validPrize(s.lastResult.prizeIndex)){const disc=overlay.querySelector('.kdWheelDisc');disc.style.transition='none';disc.style.transform=`rotate(${360-(s.lastResult.prizeIndex+.5)*45}deg)`;}
 if(pending){const disc=overlay.querySelector('.kdWheelDisc');rotation=1800+(360-(pending.prizeIndex+.5)*45);disc.style.transition=`transform ${Math.max(0,pending.readyAt-Date.now())}ms ${window.kdWheelMotion?.easing||"ease-in-out"}`;requestAnimationFrame(()=>{if(disc.isConnected)disc.style.transform=`rotate(${rotation}deg)`});}
}
function spin(){
 const s=state();if(s.pending)return;
 const multiplier=s.freeUsed?2:1;
 if(!s.freeUsed)s.freeUsed=true;
 else if(s.adCount>=3&&!s.bonusUsed)s.bonusUsed=true;
 else return;
 const duration=matchMedia('(prefers-reduced-motion:reduce)').matches?200:4200;
 s.lastResult=null;s.pending={id:id(),date:day(),prizeIndex:Math.floor(Math.random()*prizes.length),multiplier,readyAt:Date.now()+duration};
 write(key,s);write('kd64_shopWheelDate',day());changed();
 const disc=document.querySelector('.kdWheelDisc');if(disc){disc.style.transition='none';disc.style.transform='rotate(0deg)';disc.getBoundingClientRect();}
 render();finishPending();window.kdFeedback?.play('wheel');if(disc)window.kdWheelMotion?.start(rotation,duration,disc);
}
function requestAd(){
 const s=state();if(!s.freeUsed||s.bonusUsed||s.adCount>=3||s.pending||read(pendingAdKey,null))return;
 if(typeof window.KaraNative?.rewardedWheel!=='function'){document.querySelector('.kdWheelStatus').textContent='Reklam hazır değil. Tekrar dene.';return;}
 const request={id:id(),date:day(),at:Date.now()};write(pendingAdKey,request);render();
 try{KaraNative.rewardedWheel(request.id)}catch(e){localStorage.removeItem(pendingAdKey);render();document.querySelector('.kdWheelStatus').textContent='Reklam hazır değil. Tekrar dene.';}
}
window.kdCloseWheel=()=>{window.kdWheelMotion?.stop();document.getElementById('kdWheelOverlay')?.remove();changed();};
window.kdOpenWheel=()=>{
 if(document.getElementById('kdWheelOverlay'))return;
 const overlay=document.createElement('div');overlay.id='kdWheelOverlay';overlay.className='kdWheelOverlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','kdWheelTitle');
 overlay.innerHTML=`<div class="kdWheelCard"><button class="kdWheelClose" aria-label="Çarkı kapat">×</button><h2 id="kdWheelTitle"><span aria-hidden="true">✧</span> ŞANS ÇARKI</h2><p class="kdWheelStatus"></p><div class="kdWheelStage"><span class="kdWheelPointer" aria-hidden="true">▼</span>${drawWheel()}</div><p class="kdWheelResult" aria-live="polite"></p><button class="kdWheelSpin"></button><button class="kdWheelAd"></button><small><span>Günde 1 ücretsiz çevirme.</span><br><span>3 reklamla ek çevirme: 2× kristal ve ipucu.</span><br><span>Boş dilim ödül vermez.</span></small></div>`;
 document.body.appendChild(overlay);overlay.querySelector('.kdWheelClose').onclick=window.kdCloseWheel;overlay.querySelector('.kdWheelSpin').onclick=spin;overlay.querySelector('.kdWheelAd').onclick=requestAd;overlay.onclick=e=>{if(e.target===overlay)window.kdCloseWheel()};render();finishPending();
};
const previous=window.kdNativeEvent;
window.kdNativeEvent=function(event,payload){
 const request=read(pendingAdKey,null);
 if(event==='adReward'&&typeof payload==='string'&&payload.startsWith('wheel:')){
  if(!request||payload!=='wheel:'+request.id)return;
  const before=availability();localStorage.removeItem(pendingAdKey);
  const s=state();if(request.date===day()&&s.freeUsed&&!s.bonusUsed){s.adCount=Math.min(3,s.adCount+1);write(key,s);}render();changedIf(before);return;
 }
 if((event==='adUnavailable'||event==='wheelAdUnavailable'&&request&&payload===request.id)&&request){const before=availability();localStorage.removeItem(pendingAdKey);render();changedIf(before);const status=document.querySelector('.kdWheelStatus');if(status)status.textContent='Reklam hazır değil. Tekrar dene.';return;}
 if(typeof previous==='function')return previous.apply(this,arguments);
};
document.addEventListener('visibilitychange',()=>{if(!document.hidden){finishPending();render();}});
finishPending();changed();
})();
