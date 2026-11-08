/* Daily puzzles keep independent records; first wins use the existing reward ledger. */
(()=>{'use strict';
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem('kd64_'+k))??d}catch{return d}},write=(k,v)=>localStorage.setItem('kd64_'+k,JSON.stringify(v)),day=()=>new Date().toLocaleDateString('en-CA');
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),tr=s=>window.kdTranslate?.(s)||s;
const names=['TERS DÖNÜŞ','ENGELLİ HEDEFLER','SABİT VE TERS DÖNÜŞ','ZİNCİRLEME DÖNÜŞ','KAYDIRMALI DÜĞÜMLER','ÇİFT ENERJİ HATTI','AYNALI DÜĞÜMLER','HAMLE SINIRI','IŞINLANMA KAPILARI','DÖNEN SATIRLAR','ENERJİ ANAHTARLARI','HAREKETLİ ENGELLER','ÇİFT KATMAN','YÖNLÜ DÜĞÜMLER','KARANLIK AĞ'];
const reward={coins:10,xp:25},journalKey='kdDaily_rewardJournals';
const owner=()=>window.kdEconomy?.active()?window.kdEconomy.owner():null,ownerKey=value=>value===null?'guest':'account:'+value;
const amount=n=>Number.isFinite(Number(n))?Math.max(0,Math.floor(Number(n))):0;
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
function journals(){try{const value=JSON.parse(localStorage.getItem(journalKey)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch{return {}}}
function writeJournals(value){localStorage.setItem(journalKey,JSON.stringify(value));}
function claimKey(date){return 'dailyfirst:'+date;}
function claimed(date){return window.kdEconomy?.active()?!!window.kdCloud?.project()?.claims.has(claimKey(date)):read('dailyFirstClaims',{})[date]===true;}
function validWin(w){return !!w?.daily&&validDate(w.daily.date)&&typeof w.id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(w.id)&&Number.isFinite(w.moves)&&w.moves>=0&&Number.isFinite(w.seconds)&&w.seconds>=0&&[1,2,3].includes(w.star);}
function ownerMatches(w){return !Object.prototype.hasOwnProperty.call(w.daily,'owner')||(w.daily.owner??null)===owner();}
function spec(date=day()){let hash=2166136261;for(const c of 'daily-v1|'+date)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;const index=((Math.floor(Date.parse(date+'T12:00:00Z')/86400000)%15)+15)%15;return {date,seed:hash||1,template:11+index,name:names[index]};}
function attempt(date){const all=read('dailyRecords',{}),r=all[date]||{attempts:0,wins:0};const actor=window.kdEconomy?.device?.();if(actor){const counts={...(r.attemptActors||{})};r.attemptBase=r.attemptBase??Math.max(0,(Number(r.attempts)||0)-Object.values(counts).reduce((n,v)=>n+(Number(v)||0),0));counts[actor]=(Number(counts[actor])||0)+1;r.attemptActors=counts;r.attempts=r.attemptBase+Object.values(counts).reduce((n,v)=>n+(Number(v)||0),0);}else r.attempts=(Number(r.attempts)||0)+1;all[date]=r;write('dailyRecords',all);}
function storeWin(w){
 const all=read('dailyRecords',{}),r=all[w.daily.date]||{attempts:0,wins:0},runs=r.runs||{};if(runs[w.id])return false;
 const run={moves:w.moves,seconds:w.seconds,stars:w.star,assisted:!!w.usedHints||!!w.undos};
 if(!r.bestMoves||run.moves<r.bestMoves.moves||run.moves===r.bestMoves.moves&&(run.seconds<r.bestMoves.seconds||run.seconds===r.bestMoves.seconds&&r.bestMoves.assisted&&!run.assisted))r.bestMoves=run;
 if(!r.bestTime||run.seconds<r.bestTime.seconds||run.seconds===r.bestTime.seconds&&(run.moves<r.bestTime.moves||run.moves===r.bestTime.moves&&r.bestTime.assisted&&!run.assisted))r.bestTime=run;
 r.stars=Math.max(Number(r.stars)||0,w.star);r.wins=(Number(r.wins)||0)+1;runs[w.id]=true;r.runs=runs;r.last=run;all[w.daily.date]=r;write('dailyRecords',all);return true;
}
function validJournal(j){return j&&j.version===1&&validWin(j.win)&&j.date===j.win.daily.date&&(j.owner===null||typeof j.owner==='string'&&j.owner.length>0)&&(!Object.prototype.hasOwnProperty.call(j.win.daily,'owner')||(j.win.daily.owner??null)===j.owner)&&Number.isSafeInteger(j.coins)&&j.coins>=0&&Number.isSafeInteger(j.xp)&&j.xp>=0;}
function recover(){
 const all=journals(),key=ownerKey(owner()),j=all[key];if(!j)return false;
 if(!validJournal(j)||j.owner!==owner()){try{delete all[key];writeJournals(all)}catch{}return false;}
 // The intent is saved before the record and either wallet field. Recover only its owner.
 try{
  storeWin(j.win);
  if(window.kdEconomy?.active()){
   window.kdEconomy.transact(claimKey(j.date),reward);
   if(!claimed(j.date))return false;
  }else if(!claimed(j.date)){
   write('coins',Math.max(amount(read('coins',0)),j.coins));write('xp',Math.max(amount(read('xp',0)),j.xp));
   const claims=read('dailyFirstClaims',{});claims[j.date]=true;write('dailyFirstClaims',claims);
  }
  delete all[key];writeJournals(all);return true;
 }catch{return false;}
}
function record(w){
 if(!validWin(w)||!ownerMatches(w))return false;recover();
 const previous=read('dailyRecords',{})[w.daily.date],first=!amount(previous?.wins)&&!Object.keys(previous?.runs||{}).length;
 if(previous?.runs?.[w.id])return false;
 const eligible=first&&w.daily.date===day()&&!claimed(w.daily.date),key=ownerKey(owner());
 try{
  if(eligible){
   const all=journals();if(all[key]){w.dailyReward={...reward,pending:true};return false;}
   all[key]={version:1,owner:owner(),date:w.daily.date,win:JSON.parse(JSON.stringify(w)),coins:amount(read('coins',0))+reward.coins,xp:amount(read('xp',0))+reward.xp};writeJournals(all);
  }
  const changed=storeWin(w);if(eligible){recover();w.dailyReward={...reward,pending:!claimed(w.daily.date)};}return changed;
 }catch{if(eligible)w.dailyReward={...reward,pending:true};return false;}
}
function offset(date,days){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
function progress(){
 const today=day(),records=read('dailyRecords',{}),completed=Object.keys(records).filter(date=>validDate(date)&&date<=today&&amount(records[date]?.wins)>0).sort();
 return {days:completed.length,badges:[7,30].map(target=>({target,earned:completed.length>=target})),calendar:Array.from({length:30},(_,i)=>{const date=offset(today,i-29);return {date,completed:completed.includes(date),today:date===today};})};
}
const time=s=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
function growthMarkup(){
 const p=progress(),today=day(),r=read('dailyRecords',{})[today],paid=claimed(today),pending=!!journals()[ownerKey(owner())];
 return `<section class="kdDailyFirstReward"><div><h3>Günün ilk zaferi</h3><strong>+10 KRİSTAL · +25 XP</strong></div><p>${pending?'Ödül kaydı tamamlanıyor.':paid?'Bugünün ilk zafer ödülü alındı.':amount(r?.wins)?'Yeni ilk zafer ödülü yarın açılır.':'Bugünkü bulmacayı çöz, ödülünü bir kez kazan.'}</p></section><section class="kdDailyGrowth"><h3>Günlük yolculuğun</h3><p>Farklı günlerde çöz, kalıcı rozetlerini kazan.</p><div class="kdDailyBadgeGrid">${p.badges.map(b=>`<article class="${b.earned?'earned':''}"><span aria-hidden="true">${b.target===7?'◇':'✦'}</span><strong>${b.target===7?'7 günlük kâşif':'30 günlük usta'}</strong><small>${Math.min(b.target,p.days)}/${b.target} <span>farklı gün</span></small><b>${b.earned?'KAZANILDI':'KİLİTLİ'}</b></article>`).join('')}</div><h3>Son 30 gün</h3><div class="kdDailyCalendar" aria-label="Son 30 gün">${p.calendar.map(c=>`<div class="${c.completed?'completed':''} ${c.today?'today':''}" title="${c.date}" aria-label="${c.date}"><time datetime="${c.date}">${Number(c.date.slice(-2))}</time><span class="kdDailySrOnly">${c.completed?esc(tr('Tamamlandı')):esc(tr('Henüz tamamlanmadı'))}</span>${c.completed?'<i aria-hidden="true">✓</i>':''}</div>`).join('')}</div></section>`;
}
function render(){recover();const s=spec(),r=read('dailyRecords',{})[s.date]||{},saved=read('dailyActiveGame',null),resume=saved?.daily?.date===s.date,history=Object.entries(read('dailyRecords',{})).filter(([,v])=>v.wins>0).sort(([a],[b])=>b.localeCompare(a)).slice(0,7);return `<section class="kdDailyHub"><div class="kdDailyHero"><span class="kdEyebrow">HER GÜN YENİ BİR DÜĞÜM</span><h2>Günün Bulmacası</h2><p>${s.date} · 5×5 · ${s.name}</p><div class="kdDailySeal" aria-hidden="true">◇</div></div><p class="kdDailyIntro">Aynı gün aynı bulmaca. İstediğin kadar dene, kendi rekorunu geliştir.</p><button class="kdDailyStart" data-daily-start="1">${resume?'YARIM KALAN DENEMEYE DEVAM ET':r.wins?'YENİDEN MEYDAN OKU':'BUGÜNÜN BULMACASINI AÇ'} →</button>${growthMarkup()}<div class="kdDailyMetrics"><article><span>EN AZ HAMLE</span><strong>${r.bestMoves?r.bestMoves.moves:'—'}</strong><small>${r.bestMoves?time(r.bestMoves.seconds)+' · '+(r.bestMoves.assisted?'İpucu / geri alma kullanıldı':'Yardımsız çözüm'):'İlk çözümünü bekliyor'}</small></article><article><span>EN İYİ SÜRE</span><strong>${r.bestTime?time(r.bestTime.seconds):'—'}</strong><small>${r.bestTime?r.bestTime.moves+' hamle · '+(r.bestTime.assisted?'Yardımlı':'Yardımsız'):'Kendi hızını keşfet'}</small></article></div><div class="kdDailySummary"><span>★ ${r.stars||0}/3</span><span>${r.wins||0} çözüm</span><span>${r.attempts||0} deneme</span></div><p class="kdDailyInfo">Her denemede 3 ücretsiz ipucu. İlk zafer ödülü günde bir kez verilir; ana bölüm ilerlemen değişmez.</p><h3>Son günlük başarıların</h3><div class="kdDailyHistory">${history.length?history.map(([date,v])=>`<article><strong>${esc(date)}</strong><span>★ ${v.stars}/3</span><small>${v.bestMoves.moves} hamle · ${time(v.bestTime.seconds)}</small></article>`).join(''):'<p>İlk günlük çözümün burada yerini alacak.</p>'}</div></section>`;}
function resultPanel(w){const panel=document.createElement('div');panel.className='kdWinPanel kdDailyResult';panel.dataset.run=w.id;const r=read('dailyRecords',{})[w.daily.date]||{};panel.innerHTML=`<button class="kdWinClose" aria-label="Kapat">×</button><div class="kdWinHeading">GÜNÜN BULMACASI TAMAMLANDI</div><div class="kdWinStars">${Array.from({length:3},(_,i)=>`<span class="${i<w.star?'on':'off'}">★</span>`).join('')}</div><div class="kdDailyDate">${esc(w.daily.date)}</div><div class="kdDailyResultMetrics"><div><strong>${w.moves}</strong><small>HAMLE</small></div><div><strong>${time(w.seconds)}</strong><small>SÜRE</small></div></div>${w.dailyReward?`<p class="kdDailyRewardResult" role="status"><strong>Günün ilk zaferi</strong><span>${w.dailyReward.pending?'Ödül kaydı tamamlanıyor.':'+10 KRİSTAL · +25 XP'}</span></p>`:''}${window.kdLearning?.feedback(w)||''}<p class="kdDailyResultBest">En az hamle: ${r.bestMoves?.moves??w.moves} · En iyi süre: ${time(r.bestTime?.seconds??w.seconds)}</p><div class="kdWinActions"><button class="kdWinReplay">↻ TEKRAR DENE</button><button class="kdWinNext">GÜNLÜK MERKEZ →</button></div>`;const hide=()=>document.getElementById('modal').classList.remove('show','kdWinModal');panel.querySelector('.kdWinClose').onclick=()=>{hide();window.kdNavigate('daily')};panel.querySelector('.kdWinNext').onclick=()=>{hide();window.kdNavigate('daily')};panel.querySelector('.kdWinReplay').onclick=()=>{hide();document.getElementById('restart').click()};return panel;}
window.kdDaily={spec,attempt,record,render,resultPanel,recover,progress,reward:Object.freeze({...reward})};recover();
})();
