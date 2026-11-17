/* Short, bounded UI cues. No music, polling, permission prompt, economy or progress writes. */
(() => {
 'use strict';
 const read=(key,fallback)=>{try{return localStorage.getItem(key)??fallback}catch{return fallback}};
 const write=(key,value)=>{try{localStorage.setItem(key,String(value));return true}catch{return false}};
 const clamp=value=>Number.isFinite(Number(value))?Math.max(0,Math.min(100,Number(value))):60;
 const cues=Object.freeze({
  tap:[[560,.035,'triangle',.08,0]],ui:[[470,.045,'sine',.07,0]],
  lock:[[190,.075,'sine',.07,0]],undo:[[340,.055,'triangle',.07,0],[260,.07,'sine',.06,.045]],
  chain:[[520,.075,'sine',.075,0],[780,.095,'sine',.07,.05]],
  win:[[523.25,.14,'sine',.10,0],[659.25,.15,'sine',.085,.07],[783.99,.19,'sine',.08,.14]],
  fail:[[220,.09,'sine',.075,0],[165,.12,'sine',.06,.065]],
  wheelTick:[[720,.025,'triangle',.028,0]],
  wheel:[[392,.085,'triangle',.075,0],[587.33,.12,'sine',.07,.08]],
  reward:[[659.25,.12,'sine',.08,0],[880,.16,'sine',.08,.065]],
  empty:[[293.66,.09,'sine',.065,0]],confirm:[[660,.07,'sine',.08,0],[880,.10,'sine',.065,.045]]
 });
 const priority={tap:1,ui:1,undo:2,wheel:3,wheelTick:1,lock:3,chain:4,empty:4,confirm:5,reward:6,fail:7,win:8};
 const settings={effects:read('kd3_sound','1')!=='0',haptics:read('kdUX_haptics','0')==='1',volume:clamp(read('kdUX_fxVolume','60'))};
 let activated=false,context=null,pending=null,queued=false,resuming=null,generation=0,lastStatus=null;const voices=new Set(),last=new Map();
 const metrics={contexts:0,cues:0,haptics:0,peakVoices:0};
 const visible=()=>!document.hidden&&!window.kdAppBackground;
 function nativeSupported(){try{return typeof window.KaraNative?.haptic==='function'&&typeof window.KaraNative?.setHapticsEnabled==='function'&&window.KaraNative.hapticAvailable?.()===true}catch{return false}}
 function configureNative(){try{window.KaraNative?.setHapticsEnabled?.(settings.haptics&&nativeSupported())}catch{}}
 function stopAll(){for(const voice of [...voices])voice.end();pending=null;}
 function silence(){generation++;stopAll();try{context?.suspend?.()?.catch?.(()=>{})}catch{}}
 function status(channel,reason){lastStatus={channel,reason};document.getElementById('kdFeedbackNotice')?.remove();if(!reason)return;const messages={volume:'Ses seviyesi sıfır.',system:'Sistem sesini kontrol et.',blocked:'Sistem titreşimi kapalı.',unavailable:'Bu cihazda titreşim kullanılamıyor.',permission:'Titreşim izni kullanılamıyor.',busy:'Tekrar dene.',audio:'Ses başlatılamadı. Tekrar dene.'};const id='kdFeedbackNotice';document.getElementById(id)?.remove();const box=document.createElement('div');box.id=id;box.className='kdFeedbackNotice';box.setAttribute('role','status');box.textContent=window.kdTranslate?.(messages[reason]||messages.audio)||messages[reason]||messages.audio;document.body.append(box);setTimeout(()=>box.remove(),3500);}
 function audio(){try{if(!context||context.state==='closed'){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;context=new C();metrics.contexts++;}return context;}catch{return null}}
 function resume(a){if(!a)return Promise.resolve(null);if(resuming)return resuming;try{resuming=Promise.resolve(a.resume()).then(()=>a.state==='running'?a:null,()=>null).finally(()=>{resuming=null});return resuming;}catch{return Promise.resolve(null)}}
 function sound(kind,preview){const stamp=generation,a=audio();if(!a){if(preview)status('sound','audio');return;}const emit=()=>{if(stamp!==generation||!visible()||!settings.effects||settings.volume<=0)return;for(const note of cues[kind])schedule(a,note);};if(a.state==='running'&&!resuming)emit();else resume(a).then(ready=>{if(ready)emit();else if(preview&&stamp===generation)status('sound','audio')});}
 function schedule(a,note){
  if(voices.size>=8)return;
  let oscillator,gain,timer,ended=false;const voice={end(){if(ended)return;ended=true;clearTimeout(timer);try{oscillator?.stop()}catch{}try{oscillator?.disconnect?.();gain?.disconnect?.()}catch{}voices.delete(voice);}};
  try{const [frequency,duration,type,volume,delay]=note,t=a.currentTime+delay;oscillator=a.createOscillator();gain=a.createGain();oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,t);gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume*settings.volume/100),t+.008);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);oscillator.connect(gain);gain.connect(a.destination);voices.add(voice);metrics.peakVoices=Math.max(metrics.peakVoices,voices.size);oscillator.onended=voice.end;timer=setTimeout(voice.end,Math.ceil((delay+duration)*1000)+90);oscillator.start(t);oscillator.stop(t+duration+.015);}catch{voice.end();}
 }
 function audioAllowed(){try{return typeof window.KaraNative?.feedbackAudioAllowed!=='function'||KaraNative.feedbackAudioAllowed()===true}catch{return false}}
 function flush(){queued=false;const selected=pending;pending=null;const kind=selected?.kind,channel=selected?.channel;if(!kind||!activated||!visible())return;const now=performance.now();if(now-(last.get(kind)??-1000)<(kind==='wheelTick'?28:65))return;last.set(kind,now);metrics.cues++;
  if(channel!=='haptics'&&settings.effects){if(!settings.volume){if(channel==='sound')status('sound','volume');}else if(!audioAllowed()){if(channel==='sound')status('sound','system');}else{if(priority[kind]>=6)stopAll();sound(kind,channel==='sound');}}
  if(channel!=='sound'&&settings.haptics&&nativeSupported()){try{if(channel==='haptics'&&typeof KaraNative.testHaptic==='function')KaraNative.testHaptic();else KaraNative.haptic(kind);metrics.haptics++;}catch{}}
 }
 function play(kind,channel='both'){if(!Object.hasOwn(cues,kind)||!activated||!visible())return false;if(!pending||priority[kind]>priority[pending.kind])pending={kind,channel};if(!queued){queued=true;setTimeout(flush,0);}return true;}
 function unlock(event){if(event&&!event.isTrusted)return;activated=true;if(settings.effects&&settings.volume>0&&visible()&&audioAllowed())resume(audio());}
 for(const type of ['pointerdown','touchstart','mousedown','keydown','click'])document.addEventListener(type,unlock,{capture:true,passive:true});
 document.addEventListener('visibilitychange',()=>{if(!visible())silence()});
 window.addEventListener('pagehide',silence);
 // Reuse the game's own ratio and completed transactions; never duplicate rules.
 const snapshots=new WeakMap();
 document.addEventListener('click',event=>{
  if(!activated||!visible()||(!(settings.effects&&settings.volume>0)&&!settings.haptics))return;
  const tile=event.target.closest?.('#board>.tile'),claim=event.target.closest?.('[data-shop-daily],[data-achievement-claim],[data-journey-claim],[data-shop-buy]');
  if(tile)snapshots.set(event,{game:window.kdGetLearningState?.(),ratio:Number.parseInt(document.getElementById('links')?.textContent)||0});
  else if(claim&&!claim.disabled)snapshots.set(event,{claim,coins:Number(read('kd64_coins','0')),hints:Number(read('kd64_hintCoupons','0'))});
 },true);
 window.addEventListener('click',event=>{const before=snapshots.get(event);snapshots.delete(event);if(!before)return;
  if(before.game){const after=window.kdGetLearningState?.(),next=Number.parseInt(document.getElementById('links')?.textContent)||0;if(after&&before.game.level===after.level&&after.moves>before.game.moves&&next>before.ratio)play('chain');}
  else if(Number(read('kd64_coins','0'))>before.coins||Number(read('kd64_hintCoupons','0'))>before.hints)play(before.claim.hasAttribute('data-shop-buy')?'confirm':'reward');
 });
 document.addEventListener('click',event=>{const button=event.target.closest?.('[data-go],[data-extra]');if(button&&!button.disabled)play('ui');});
 window.kdFeedback={
  play,cues,
  state:()=>({...settings,haptics:settings.haptics&&nativeSupported(),hapticSupported:nativeSupported()}),
  setEffects(value){settings.effects=!!value;write('kd3_sound',value?'1':'0');if(!value)silence();},
  setVolume(value){settings.volume=clamp(value);write('kdUX_fxVolume',settings.volume);if(!settings.volume)silence();},
  setHaptics(value){if(!nativeSupported())return false;settings.haptics=!!value;write('kdUX_haptics',value?'1':'0');configureNative();return true;},
  stats:()=>({...metrics,activeVoices:voices.size,activated,contextState:context?.state||'uncreated',lastStatus}),
  nativeResult(value){if(value?.channel==='haptics')status(value.channel,value.reason||null);},
  stop:silence
 };
 // The native lifecycle calls this existing entry point; it never starts ambient audio.
 window.kdUnlockAudio=()=>{if(!visible())silence();};
 configureNative();
})();
