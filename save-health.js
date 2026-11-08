/* Recoverable UI saves. Critical cloud journals retain their own durable-write contract. */
(()=>{'use strict';
const MAX_ENTRIES=48,MAX_BYTES=1024*1024,events=[],pending=new Map();let explicitOwner=null,report=null,sequence=0,retryScheduled=null,overflow=false;
const text=s=>window.kdTranslate?.(s)||s;
const scope=()=>{if(explicitOwner!==null)return explicitOwner;try{return window.kdEconomy?.owner?.()||JSON.parse(localStorage.getItem('kdCloud_activeAccount')||'null')||'guest';}catch{return 'guest';}};
const token=(owner,key)=>owner+'\u0000'+key;
function note(code){events.push({at:new Date().toISOString(),code});if(events.length>16)events.shift();}
function failure(error,operation){note(error?.name==='QuotaExceededError'?'storage_full':error?.name==='SecurityError'?'storage_denied':operation+'_failed');}
function bytes(){return [...pending.values()].reduce((n,v)=>n+v.bytes,0);}
function rawRead(key){return localStorage.getItem(key);}
function getItem(key){key=String(key);const entry=pending.get(token(scope(),key));if(entry)return entry.remove?null:entry.value;try{return rawRead(key);}catch(error){failure(error,'read');return null;}}
function read(key,fallback=null){const raw=getItem(key);if(raw===null)return fallback;try{return JSON.parse(raw)??fallback;}catch{note('invalid_json');return fallback;}}
function remember(owner,key,value,remove,base){const id=token(owner,key),old=pending.get(id),size=(key.length+(value?.length||0))*2;
 if((!old&&pending.size>=MAX_ENTRIES)||bytes()-(old?.bytes||0)+size>MAX_BYTES){overflow=true;note('pending_limit');render();return;}
 pending.set(id,{owner,key,value,remove,base:old?old.base:base,bytes:size,sequence:++sequence});render();
}
function mutate(key,value,remove=false){key=String(key);if(!remove)value=String(value);const owner=scope(),id=token(owner,key);let base=null;
 try{base=rawRead(key);if(remove)localStorage.removeItem(key);else localStorage.setItem(key,value);pending.delete(id);render();return true;}
 catch(error){failure(error,remove?'remove':'write');remember(owner,key,value,remove,base);return false;}
}
function write(key,value){try{const raw=JSON.stringify(value);if(typeof raw!=='string')throw Error('serialization');return mutate(key,raw);}catch{note('serialization_failed');render();return false;}}
function retry(){let applied=0,conflicts=0;const owner=scope();for(const [id,entry]of [...pending]){if(entry.owner!==owner)continue;
 try{const current=rawRead(entry.key),desired=entry.remove?null:entry.value;if(current===desired){pending.delete(id);applied++;continue;}if(current!==entry.base){conflicts++;continue;}if(entry.remove)localStorage.removeItem(entry.key);else localStorage.setItem(entry.key,entry.value);pending.delete(id);applied++;}
 catch(error){failure(error,'retry');break;}}
 if(conflicts)note('newer_save_preserved');if(pending.size===0)overflow=false;render();return {applied,conflicts,pending:pending.size};
}
function setOwner(owner){const next=typeof owner==='string'&&owner?owner:'guest';if(scope()===next&&explicitOwner===next)return;explicitOwner=next;clearTimeout(retryScheduled);retryScheduled=null;render();window.dispatchEvent(new Event('kd:storage-owner'));}
function diagnostic(){const android=(navigator.userAgent.match(/Android\s+(\d+)/)||[])[1]||null;return {format:'KaraDugum-diagnostics-v1',createdAt:new Date().toISOString(),version:window.kdVersion||'6.37',androidMajor:android,viewport:{width:innerWidth,height:innerHeight},online:navigator.onLine!==false,pending:{entries:pending.size,bytes:bytes(),currentOwnerEntries:[...pending.values()].filter(e=>e.owner===scope()).length,limitReached:overflow},events:events.map(e=>({...e}))};}
function closeReport(){if(!report)return false;const previous=report._previousFocus;report.remove();report=null;window.kdSetPaused?.(document.hidden||document.getElementById('kdGame')?.hidden!==false||!!window.kdAppBackground);previous?.isConnected&&previous.focus();return true;}
function showReport(){if(report){report.querySelector('textarea').focus();return;}report=document.createElement('div');report.className='kdSaveReport';report.setAttribute('role','dialog');report.setAttribute('aria-modal','true');report.setAttribute('aria-labelledby','kdSaveReportTitle');report._previousFocus=document.activeElement;
 const card=document.createElement('section'),title=document.createElement('h2'),description=document.createElement('p'),area=document.createElement('textarea'),copy=document.createElement('button'),close=document.createElement('button');title.id='kdSaveReportTitle';title.textContent=text('Tanı raporu');description.textContent=text('Bu rapor hesap, oyun kaydı veya kişisel veri içermez. Destek için kopyalayabilirsin.');area.readOnly=true;area.value=JSON.stringify(diagnostic(),null,2);area.setAttribute('aria-label',text('Kopyalanabilir tanı raporu'));copy.textContent=text('Raporu kopyala');close.textContent=text('Kapat');copy.type=close.type='button';copy.onclick=async()=>{area.focus();area.select();try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(area.value);else if(!document.execCommand('copy'))throw Error('copy');copy.textContent=text('Kopyalandı');}catch{description.textContent=text('Metni seçip cihazının kopyalama seçeneğini kullan.');}};close.onclick=closeReport;card.append(title,description,area,copy,close);report.append(card);document.body.append(report);window.kdSetPaused?.(true);close.focus();
}
function render(){if(!document.body)return;let banner=document.getElementById('kdSaveHealth');if(!pending.size&&!overflow){banner?.remove();return;}if(!banner){banner=document.createElement('aside');banner.id='kdSaveHealth';banner.className='kdSaveHealth';banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');document.body.append(banner);}const own=[...pending.values()].some(e=>e.owner===scope());banner.replaceChildren();const message=document.createElement('span');message.textContent=text(own||overflow?'Kayıt bekliyor. Oyunu kapatmadan yeniden dene.':'Önceki oturumun kaydı bekliyor; bu hesaba uygulanmaz.');const retryButton=document.createElement('button'),reportButton=document.createElement('button');retryButton.type=reportButton.type='button';retryButton.textContent=text('Yeniden dene');retryButton.disabled=!own&&!overflow;retryButton.onclick=retry;reportButton.textContent=text('Tanı raporu');reportButton.onclick=showReport;banner.append(message,retryButton,reportButton);}
function scheduleRetry(){if(document.hidden||!pending.size)return;clearTimeout(retryScheduled);retryScheduled=setTimeout(()=>{retryScheduled=null;retry();},200);}
window.kdStorage={read,getItem,write,setItem:(key,value)=>mutate(key,value),remove:key=>mutate(key,null,true),retry,setOwner,owner:scope,pendingCount:()=>pending.size,diagnostic,showReport,isOpen:()=>!!report,back:closeReport};
window.addEventListener('focus',scheduleRetry);document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleRetry();});window.addEventListener('error',()=>note('script_error'));window.addEventListener('unhandledrejection',()=>note('unhandled_promise'));
document.addEventListener('keydown',event=>{if(!report)return;if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeReport();}else if(event.key==='Tab'){const elements=[...report.querySelectorAll('textarea,button')],first=elements[0],last=elements.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
document.addEventListener('DOMContentLoaded',render,{once:true});
})();
