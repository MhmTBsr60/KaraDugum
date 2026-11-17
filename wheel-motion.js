/* Presentation only. One timer per segment, no frame loop, RNG, storage or reward APIs. */
(() => {
 'use strict';
 const limited=(navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=4)||(navigator.deviceMemory>0&&navigator.deviceMemory<=4)||matchMedia('(update: slow)').matches;
 if(limited)document.documentElement.setAttribute('data-kd-wheel-low-motion','');
 const baseRotation=limited?720:1800;
 const easing='cubic-bezier(.42,0,.18,1)';
 const curve=(t,a,b)=>3*(1-t)*(1-t)*t*a+3*(1-t)*t*t*b+t*t*t;
 function crossingTimes(degrees,duration){
  const times=[];
  for(let angle=45;angle<degrees;angle+=45){
   const target=angle/degrees;let low=0,high=1;
   for(let i=0;i<20;i++){const t=(low+high)/2;if(curve(t,0,1)<target)low=t;else high=t;}
   times.push(Math.round(curve((low+high)/2,.42,.18)*duration));
  }return times;
 }
 let timer=null,epoch=0;
 function stop(){epoch++;clearTimeout(timer);timer=null;}
 function start(degrees,duration,disc){
  stop();if(matchMedia('(prefers-reduced-motion:reduce)').matches||document.hidden||window.kdAppBackground)return;
  const token=epoch,times=crossingTimes(degrees,duration),at=performance.now();let i=0;
  const next=()=>{if(token!==epoch||!disc.isConnected||document.hidden||window.kdAppBackground){stop();return;}if(i>=times.length)return;
   timer=setTimeout(()=>{if(token!==epoch)return;if(!document.hidden&&!window.kdAppBackground&&disc.isConnected)window.kdFeedback?.play('wheelTick');i++;next();},Math.max(0,at+times[i]-performance.now()));};next();
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});window.addEventListener('pagehide',stop);
 matchMedia('(prefers-reduced-motion:reduce)').addEventListener('change',stop);
 window.kdWheelMotion={easing,baseRotation,crossingTimes,start,stop};
})();
