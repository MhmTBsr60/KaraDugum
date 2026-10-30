/* Native consent status is kept in memory; UMP owns persisted choices. */
(()=>{'use strict';
const state={required:false,busy:false,formOpen:false};
function refresh(){
 for(const button of document.querySelectorAll('[data-privacy-options]')){
  button.hidden=!state.required||typeof window.KaraNative?.privacyOptions!=='function';
  button.disabled=state.busy;
  button.setAttribute('aria-busy',String(state.busy));
 }
}
window.kdPrivacy={refresh};
const previous=window.kdNativeEvent;
window.kdNativeEvent=function(event,payload){
 if(event==='privacyState'){
  if(payload&&typeof payload.required==='boolean'&&typeof payload.busy==='boolean'&&(payload.formOpen===undefined||typeof payload.formOpen==='boolean')){
   const previousForm=state.formOpen;
   state.required=payload.required;state.busy=payload.busy;state.formOpen=payload.formOpen===true;
   window.kdAdPrivacyBusy=state.formOpen;
   if(previousForm!==state.formOpen)window.kdSetPaused?.(state.formOpen||document.hidden||!!window.kdAppBackground||document.getElementById('kdGame')?.hidden);
   refresh();
  }
  return;
 }
 return previous?.apply(this,arguments);
};
document.addEventListener('click',event=>{
 const control=event.target.closest('[data-privacy-policy],[data-privacy-options]');
 if(!control||control.disabled)return;
 if(control.hasAttribute('data-privacy-policy')){
  if(typeof window.KaraNative?.openPrivacyPolicy==='function'){event.preventDefault();window.KaraNative.openPrivacyPolicy();}
  return;
 }
 if(!state.required||state.busy||typeof window.KaraNative?.privacyOptions!=='function')return;
 state.busy=true;refresh();
 try{window.KaraNative.privacyOptions();}catch(error){state.busy=false;refresh();console.warn('Privacy options unavailable',error);}
});
refresh();
window.KaraNative?.privacyState?.();
})();
