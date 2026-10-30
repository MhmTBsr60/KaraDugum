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
function settle(s,force=false){
 const pending=s.pending;if(!pending||!validPrize(pending.prizeIndex)||(!force&&Date.now()<pending.readyAt))return false;
 const prize=prizes[pending.prizeIndex],multiplier=pending.multiplier===2?2:1;
 // Remove the receipt before applying it so repeated callbacks cannot pay twice.
 s.pending=null;s.lastResult={id:pending.id,label:prize.label,prizeIndex:pending.prizeIndex,multiplier};write(key,s);
 if(window.kdEconomy?.active())window.kdEconomy.transact('wheel:'+s.date+':'+(multiplier===2?'bonus':'free'),{coins:(prize.coins||0)*multiplier,hintCoupons:(prize.hints||0)*multiplier});else{
 if(prize.coins)write('kd64_coins',amount(read('kd64_coins',0))+prize.coins*multiplier);
 if(prize.hints)write('kd64_hintCoupons',amount(read('kd64_hintCoupons',0))+prize.hints*multiplier);
 }
 window.kdRefreshShop?.();window.kdCloudSync?.();render();return true;
}
function finishPending(){const s=state();if(s.pending){if(!settle(s)){clearTimeout(settleTimer);settleTimer=setTimeout(finishPending,Math.max(1,s.pending.readyAt-Date.now()));}}}
function prizeLabel(prize,multiplier=1){return prize.coins?`${prize.coins*multiplier} kristal`:prize.hints?`${prize.hints*multiplier} ipucu`:prize.label;}
function drawWheel(multiplier=1){
 const point=(r,degrees)=>{const a=degrees*Math.PI/180;return [160+r*Math.cos(a),160+r*Math.sin(a)]};
 return `<svg class="kdWheelDisc" viewBox="0 0 320 320" role="img" aria-label="Şans çarkı: kristal ödülleri, bir ipucu ve boş dilim">${prizes.map((p,i)=>{const start=-90+i*45,end=start+45,[x1,y1]=point(151,start),[x2,y2]=point(151,end),[tx,ty]=point(105,start+22.5);return `<path d="M160 160 L${x1} ${y1} A151 151 0 0 1 ${x2} ${y2} Z" fill="${i%2?'#6c4324':'#2b1d17'}" stroke="#efc978" stroke-width="1.5"/><text x="${tx}" y="${ty}" fill="#fff0c7" font-size="13" font-weight="750" text-anchor="middle" dominant-baseline="middle" transform="rotate(${start+22.5+90} ${tx} ${ty})">${prizeLabel(p,multiplier)}</text>`}).join('')}<circle cx="160" cy="160" r="26" fill="#efc978" stroke="#8b5a2b" stroke-width="4"/><text x="160" y="168" font-size="26" text-anchor="middle" fill="#25150b">✦</text></svg>`;
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
 overlay.dataset.spinning=String(!!pending);
 if(!pending&&s.lastResult&&validPrize(s.lastResult.prizeIndex)){const disc=overlay.querySelector('.kdWheelDisc');disc.style.transition='none';disc.style.transform=`rotate(${360-(s.lastResult.prizeIndex+.5)*45}deg)`;}
 if(pending){const disc=overlay.querySelector('.kdWheelDisc');rotation=1800+(360-(pending.prizeIndex+.5)*45);disc.style.transition=`transform ${Math.max(0,pending.readyAt-Date.now())}ms cubic-bezier(.14,.65,.08,1)`;requestAnimationFrame(()=>{if(disc.isConnected)disc.style.transform=`rotate(${rotation}deg)`});}
}
function spin(){
 const s=state();if(s.pending)return;
 const multiplier=s.freeUsed?2:1;
 if(!s.freeUsed)s.freeUsed=true;
 else if(s.adCount>=3&&!s.bonusUsed)s.bonusUsed=true;
 else return;
 const duration=matchMedia('(prefers-reduced-motion:reduce)').matches?200:4200;
 s.lastResult=null;s.pending={id:id(),date:day(),prizeIndex:Math.floor(Math.random()*prizes.length),multiplier,readyAt:Date.now()+duration};
 write(key,s);write('kd64_shopWheelDate',day());
 const disc=document.querySelector('.kdWheelDisc');if(disc){disc.style.transition='none';disc.style.transform='rotate(0deg)';disc.getBoundingClientRect();}
 render();finishPending();
}
function requestAd(){
 const s=state();if(!s.freeUsed||s.bonusUsed||s.adCount>=3||s.pending||read(pendingAdKey,null))return;
 if(typeof window.KaraNative?.rewardedWheel!=='function'){document.querySelector('.kdWheelStatus').textContent='Reklam hazır değil. Tekrar dene.';return;}
 const request={id:id(),date:day(),at:Date.now()};write(pendingAdKey,request);render();
 try{KaraNative.rewardedWheel(request.id)}catch(e){localStorage.removeItem(pendingAdKey);render();document.querySelector('.kdWheelStatus').textContent='Reklam hazır değil. Tekrar dene.';}
}
window.kdCloseWheel=()=>document.getElementById('kdWheelOverlay')?.remove();
window.kdOpenWheel=()=>{
 if(document.getElementById('kdWheelOverlay'))return;
 const overlay=document.createElement('div');overlay.id='kdWheelOverlay';overlay.className='kdWheelOverlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','kdWheelTitle');
 overlay.innerHTML=`<div class="kdWheelCard"><button class="kdWheelClose" aria-label="Çarkı kapat">×</button><h2 id="kdWheelTitle">🎡 ŞANS ÇARKI</h2><p class="kdWheelStatus"></p><div class="kdWheelStage"><span class="kdWheelPointer" aria-hidden="true">▼</span>${drawWheel()}</div><p class="kdWheelResult" aria-live="polite"></p><button class="kdWheelSpin"></button><button class="kdWheelAd"></button><small><span>Günde 1 ücretsiz çevirme.</span><br><span>3 reklamla ek çevirme: 2× kristal ve ipucu.</span><br><span>Boş dilim ödül vermez.</span></small></div>`;
 document.body.appendChild(overlay);overlay.querySelector('.kdWheelClose').onclick=window.kdCloseWheel;overlay.querySelector('.kdWheelSpin').onclick=spin;overlay.querySelector('.kdWheelAd').onclick=requestAd;overlay.onclick=e=>{if(e.target===overlay)window.kdCloseWheel()};render();finishPending();
};
const previous=window.kdNativeEvent;
window.kdNativeEvent=function(event,payload){
 const request=read(pendingAdKey,null);
 if(event==='adReward'&&typeof payload==='string'&&payload.startsWith('wheel:')){
  if(!request||payload!=='wheel:'+request.id)return;
  localStorage.removeItem(pendingAdKey);
  const s=state();if(request.date===day()&&s.freeUsed&&!s.bonusUsed){s.adCount=Math.min(3,s.adCount+1);write(key,s);}render();return;
 }
 if((event==='adUnavailable'||event==='wheelAdUnavailable'&&request&&payload===request.id)&&request){localStorage.removeItem(pendingAdKey);render();const status=document.querySelector('.kdWheelStatus');if(status)status.textContent='Reklam hazır değil. Tekrar dene.';return;}
 if(typeof previous==='function')return previous.apply(this,arguments);
};
document.addEventListener('visibilitychange',()=>{if(!document.hidden){finishPending();render();}});
finishPending();
})();
