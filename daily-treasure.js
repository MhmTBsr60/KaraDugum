/* Presentation adapter only. Original dailyReward/showDaily own all payouts, receipts,
   streak/date decisions, seen-state and close action. This module never writes storage. */
(()=>{'use strict';
 const t=s=>window.kdTranslate?.(s)||s;
 const svg=(kind)=>kind==='lock'?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5zM12 14v3"/></svg>':kind==='hint'?'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M17 31c0-6-8-7-8-16a15 15 0 0 1 30 0c0 9-8 10-8 16M17 35h14M18 40h12M21 44h6M24 6v3M6 8l4 3M42 8l-4 3"/></svg>':'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 6h24l9 13-21 25L3 19zM3 19h42M12 6l4 13 8 25 8-25 4-13M16 19l8-13 8 13"/></svg>';
 function decorate(overlay){
  if(overlay.dataset.treasure==='1')return;
  const card=overlay.querySelector('.kdDailyCard'),title=card?.querySelector('h2'),intro=card?.querySelector('p'),prize=card?.querySelector('.kdDailyPrize'),days=card?.querySelector('.kdDailyDays'),close=card?.querySelector('.kdDailyClose');
  let reward;try{reward=JSON.parse(localStorage.getItem('kd64_dailyLastReward'));}catch(_){return;}
  if(!card||!title||!intro||!prize||!days||!close||!reward||!Number.isInteger(reward.day)||reward.day<1||reward.day>7)return;
  const previous=document.activeElement;overlay.dataset.treasure='1';overlay.classList.add('kdTreasureOverlay');card.classList.add('kdTreasureCard');overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');title.id='kdTreasureTitle';overlay.setAttribute('aria-labelledby',title.id);title.classList.add('kdTreasureRibbon');intro.classList.add('kdTreasureIntro');
  const quiet=matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.hasAttribute('data-kd-gold-low-motion')||(navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=4)||(navigator.deviceMemory>0&&navigator.deviceMemory<=4)||matchMedia('(update: slow)').matches;
  overlay.dataset.motion=quiet?'static':document.querySelector('#kdSplash,.kdSplash')?'pending':'short';overlay.dataset.rewardDay=String(reward.day);
  const hero=document.createElement('div');hero.className='kdTreasureHero';hero.setAttribute('aria-hidden','true');const image=document.createElement('img');image.src='assets/daily-treasure-chest.webp';image.alt='';image.width=840;image.height=560;image.decoding='async';hero.append(image);
  const body=document.createElement('div');body.className='kdTreasureBody';
  prize.classList.add('kdTreasurePrize');prize.replaceChildren();
  for(const [value,label,kind] of [[reward.coins,'kristal','crystal'],[reward.hints,'ipucu kuponu','hint']]){
   if(!Number.isFinite(value)||value<=0)continue;
   const item=document.createElement('div');item.className='kdTreasurePrizeItem';const icon=document.createElement('i');icon.className='kdTreasureIcon-'+kind;icon.innerHTML=svg(kind);const amount=document.createElement('strong');amount.className='kdTreasureAmount';amount.textContent='+'+value;const unit=document.createElement('span');unit.className='kdTreasureUnit';unit.textContent=t(label);item.append(icon,amount,unit);prize.append(item);
  }
  days.classList.add('kdTreasureDays');days.replaceChildren();
  for(let day=1;day<=7;day++){
   const cell=document.createElement('div');cell.className='kdTreasureDay '+(day===reward.day?'today active':day<reward.day?'claimed':'future');cell.dataset.day=String(day);
   const status=document.createElement('b');status.className='kdTreasureDayStatus';status.setAttribute('aria-hidden','true');if(day>reward.day)status.innerHTML=svg('lock');else status.textContent=day===reward.day?'✦':'✓';
   const number=document.createElement('strong');number.textContent=String(day);const unit=document.createElement('span');unit.className='kdTreasureDayUnit';unit.textContent=t('GÜN');
   cell.append(status,number,unit);if(day===reward.day){cell.setAttribute('aria-current','date');const check=document.createElement('i');check.className='kdTreasureTodayCheck';check.textContent='✓';check.setAttribute('aria-hidden','true');cell.append(check);}days.append(cell);
  }
  close.classList.add('kdTreasureConfirm');body.append(intro,prize,days,close);card.replaceChildren(hero,title,body);
  close.addEventListener('click',()=>{if(previous?.isConnected&&!overlay.contains(previous))previous.focus?.({preventScroll:true});},{once:true});
  overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close.click();}else if(event.key==='Tab'){event.preventDefault();close.focus({preventScroll:true});}});
  close.focus({preventScroll:true});
 }
 const scan=()=>{document.querySelectorAll('.kdDailyOverlay').forEach(decorate);if(!document.querySelector('#kdSplash,.kdSplash'))document.querySelectorAll('.kdTreasureOverlay[data-motion=pending]').forEach(el=>el.dataset.motion='short');};new MutationObserver(scan).observe(document.body,{childList:true});scan();
 window.kdDailyTreasure={version:'preview-1',decorate,scope:'presentation-only; original game owns rewards and date rules'};
})();
