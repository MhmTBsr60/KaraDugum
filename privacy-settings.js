/* Native consent status is kept in memory; UMP owns persisted choices. */
(()=>{'use strict';
const state={required:false,busy:false,formOpen:false};
// Read-only native age status is deliberately not part of game/cloud/localStorage saves.
const audience={received:false,band:'pending',accountsAllowed:false,busy:false};
const hasAgeControls=()=>typeof window.KaraNative?.ageOptions==='function';
const bandLabels={pending:'Seçilmedi',under13:'13 yaş altı',teen:'13–17 yaş',adult:'18 yaş ve üzeri',unknown:'Belirtilmedi'};
const audienceView=()=>({available:hasAgeControls(),band:audience.band,accountsAllowed:!hasAgeControls()||audience.received&&audience.accountsAllowed&&!audience.busy,needsReview:hasAgeControls()&&audience.received&&audience.band!=='adult',busy:hasAgeControls()&&(!audience.received||audience.busy)});
function openAgeOptions(){
 if(!hasAgeControls()||audienceView().busy)return;
 const previousBusy=audience.busy;audience.busy=true;refresh();window.kdRefreshAccountViews?.();
 try{window.KaraNative.ageOptions();}catch(error){audience.busy=previousBusy;refresh();window.kdRefreshAccountViews?.();console.warn('Age options unavailable',error);}
}
window.kdAudience={view:audienceView,canUseAccounts:()=>audienceView().accountsAllowed,open:openAgeOptions};
function refresh(){
 for(const button of document.querySelectorAll('[data-privacy-options]')){
  button.hidden=!state.required||typeof window.KaraNative?.privacyOptions!=='function';
  button.disabled=state.busy;
  button.setAttribute('aria-busy',String(state.busy));
 }
 for(const button of document.querySelectorAll('[data-age-options]')){
  button.hidden=!hasAgeControls();button.disabled=audienceView().busy;
  button.setAttribute('aria-busy',String(audienceView().busy));
  const label=button.querySelector('[data-age-band]');
  if(label){const text=window.kdTranslate?.(bandLabels[audience.band])||bandLabels[audience.band];if(label.textContent!==text)label.textContent=text;}
 }
}
window.kdPrivacy={refresh};
const previous=window.kdNativeEvent;
window.kdNativeEvent=function(event,payload){
 if(event==='audienceState'){
  if(payload&&typeof payload.band==='string'&&Object.hasOwn(bandLabels,payload.band)&&typeof payload.accountsAllowed==='boolean'&&typeof payload.busy==='boolean'&&(!payload.accountsAllowed||payload.band==='adult')){
   const changed=!audience.received||audience.band!==payload.band||audience.accountsAllowed!==payload.accountsAllowed||audience.busy!==payload.busy;
   audience.received=true;audience.band=payload.band;audience.accountsAllowed=payload.accountsAllowed;audience.busy=payload.busy;
   refresh();if(changed)window.kdRefreshAccountViews?.();
  }
  return;
 }
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
 const control=event.target.closest('[data-privacy-policy],[data-privacy-options],[data-delete-account],[data-age-options]');
 if(!control||control.disabled)return;
 if(control.hasAttribute('data-age-options')){event.preventDefault();openAgeOptions();return;}
 if(control.matches('[data-privacy-policy],[data-delete-account]')){
  const language=document.documentElement.lang;
  control.hash=['tr','en','ar','zh'].includes(language)?language:'en';
 }
 if(control.hasAttribute('data-delete-account')){
  if(typeof window.KaraNative?.openAccountDeletion==='function'){event.preventDefault();window.KaraNative.openAccountDeletion();}
  return;
 }
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
window.KaraNative?.audienceState?.();
})();
