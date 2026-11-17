/* Short, bounded UI cues. No music, polling, permission prompt, economy or save writes. */
(() => {
 'use strict';
 const read=(key,fallback)=>{try{return localStorage.getItem(key)??fallback}catch{return fallback}};
 const write=(key,value)=>{try{localStorage.setItem(key,String(value));return true}catch{return false}};
 const clamp=value=>Number.isFinite(Number(value))?Math.max(0,Math.min(100,Number(value))):60;
 const cues=Object.freeze({
  tap:[[560,.045,'triangle',.025,0]],ui:[[470,.045,'sine',.023,0]],
  lock:[[190,.075,'sine',.023,0]],undo:[[340,.055,'triangle',.023,0],[260,.07,'sine',.019,.045]],
  chain:[[520,.075,'sine',.025,0],[780,.095,'sine',.023,.05]],
  win:[[523.25,.14,'sine',.035,0],[659.25,.15,'sine',.029,.07],[783.99,.19,'sine',.028,.14]],
  fail:[[220,.09,'sine',.025,0],[165,.12,'sine',.019,.065]],
  wheelTick:[[720,.025,'triangle',.012,0]],
  wheel:[[392,.085,'triangle',.025,0],[587.33,.12,'sine',.023,.08]],
  reward:[[659.25,.12,'sine',.028,0],[880,.16,'sine',.028,.065]],
  empty:[[293.66,.09,'sine',.022,0]],confirm:[[660,.07,'sine',.026,0],[880,.10,'sine',.022,.045]]
 });
 const priority={tap:1,ui:1,undo:2,wheel:3,wheelTick:1,lock:3,chain:4,empty:4,confirm:5,reward:6,fail:7,win:8};
 const settings={effects:read('kd3_sound','1')!=='0',haptics:read('kdUX_haptics','0')==='1',volume:clamp(read('kdUX_fxVolume','60'))};
 let activated=false,context=null,pending=null,queued=false;const voices=new Set(),last=new Map();
 const metrics={contexts:0,cues:0,haptics:0,peakVoices:0};
 const visible=()=>!document.hidden&&!window.kdAppBackground;
 function nativeSupported(){try{return typeof window.KaraNative?.haptic==='function'&&typeof window.KaraNative?.setHapticsEnabled==='function'&&window.KaraNative.hapticAvailable?.()===true}catch{return false}}
 function configureNative(){try{window.KaraNative?.setHapticsEnabled?.(settings.haptics&&nativeSupported())}catch{}}
 function stopAll(){for(const voice of [...voices])voice.end();pending=null;}
 function silence(){stopAll();try{context?.suspend?.()?.catch?.(()=>{})}catch{}}
 function audio(){try{if(!context){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;context=new C();metrics.contexts++;}if(context.state==='closed')return null;if(context.state==='suspended')context.resume()?.catch?.(()=>{});return context;}catch{return null}}
 function schedule(a,note){
  if(voices.size>=8)return;
  let oscillator,gain,timer,ended=false;const voice={end(){if(ended)return;ended=true;clearTimeout(timer);try{oscillator?.stop()}catch{}try{oscillator?.disconnect?.();gain?.disconnect?.()}catch{}voices.delete(voice);}};
  try{const [frequency,duration,type,volume,delay]=note,t=a.currentTime+delay;oscillator=a.createOscillator();gain=a.createGain();oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,t);gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume*settings.volume/100),t+.008);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);oscillator.connect(gain);gain.connect(a.destination);voices.add(voice);metrics.peakVoices=Math.max(metrics.peakVoices,voices.size);oscillator.onended=voice.end;timer=setTimeout(voice.end,Math.ceil((delay+duration)*1000)+90);oscillator.start(t);oscillator.stop(t+duration+.015);}catch{voice.end();}
 }
 function audioAllowed(){try{return typeof window.KaraNative?.feedbackAudioAllowed!=='function'||KaraNative.feedbackAudioAllowed()===true}catch{return false}}
 function flush(){queued=false;const selected=pending;pending=null;const kind=selected?.kind,channel=selected?.channel;if(!kind||!activated||!visible())return;const now=performance.now();if(now-(last.get(kind)??-1000)<(kind==='wheelTick'?28:65))return;last.set(kind,now);metrics.cues++;
  if(channel!=='haptics'&&settings.effects&&settings.volume>0&&audioAllowed()){if(priority[kind]>=6)stopAll();const a=audio();if(a)for(const note of cues[kind])schedule(a,note);}
  if(channel!=='sound'&&settings.haptics&&nativeSupported()){try{KaraNative.haptic(kind);metrics.haptics++;}catch{}}
 }
 function play(kind,channel='both'){if(!Object.hasOwn(cues,kind)||!activated||!visible())return false;if(!pending||priority[kind]>priority[pending.kind])pending={kind,channel};if(!queued){queued=true;queueMicrotask(flush);}return true;}
 function unlock(event){if(event&&!event.isTrusted)return;activated=true;if(context&&settings.effects&&settings.volume>0&&visible())audio();}
 document.addEventListener('pointerdown',unlock,true);document.addEventListener('keydown',unlock,true);
 document.addEventListener('visibilitychange',()=>{if(!visible())silence()});
 window.addEventListener('pagehide',silence);
 document.addEventListener('click',event=>{const button=event.target.closest?.('[data-go],[data-extra]');if(button&&!button.disabled)play('ui');});
 window.kdFeedback={
  play,cues,
  state:()=>({...settings,haptics:settings.haptics&&nativeSupported(),hapticSupported:nativeSupported()}),
  setEffects(value){settings.effects=!!value;write('kd3_sound',value?'1':'0');if(!value)silence();},
  setVolume(value){settings.volume=clamp(value);write('kdUX_fxVolume',settings.volume);if(!settings.volume)silence();},
  setHaptics(value){if(!nativeSupported())return false;settings.haptics=!!value;write('kdUX_haptics',value?'1':'0');configureNative();return true;},
  stats:()=>({...metrics,activeVoices:voices.size,activated,contextState:context?.state||'uncreated'}),
  stop:silence
 };
 // The native lifecycle calls this existing entry point; it never starts ambient audio.
 window.kdUnlockAudio=()=>{if(context&&activated&&settings.effects&&settings.volume>0&&visible())audio();else if(!visible())stopAll();};
 configureNative();
})();
