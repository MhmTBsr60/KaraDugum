/* An optional layout change for large boards. The original cells and handlers stay in place. */
(()=>{'use strict';let active=false,button=null;
const game=()=>document.getElementById('kdGame'),state=()=>window.kdGetLearningState?.(),t=s=>window.kdTranslate?.(s)||s;
function sync(){const host=game(),s=state(),eligible=!!host&&!host.hidden&&Number(s?.n)>=7;
 if(!host)return;if(!eligible)active=false;
 host.classList.toggle('kdBoardFocus',active);host.classList.toggle('kdCanFocusBoard',eligible);
 if(!button){const instructions=host.querySelector('.instructions');if(!instructions)return;button=document.createElement('button');button.id='kdBoardFocusToggle';button.className='kdBoardFocusButton';button.type='button';button.setAttribute('aria-controls','board');button.onclick=()=>set(!active);instructions.appendChild(button);}
 button.hidden=!eligible;button.setAttribute('aria-pressed',String(active));const label=t(active?'Normal görünüme dön':'Tahtaya odaklan');if(button.textContent!==label)button.textContent=label;if(button.getAttribute('aria-label')!==label)button.setAttribute('aria-label',label);
}
function set(value){active=!!value;sync();return active;}
window.kdBoardFocus={sync,set,active:()=>active,back:()=>{if(!active||window.kdLearning?.isOpen?.()||document.querySelector('#modal.show,#kdRuleHelpOverlay,.kdV9Overlay,.kdDailyOverlay,#kdWheelOverlay'))return false;set(false);button?.focus();return true;}};sync();
})();
