/* Read-only projections of normal level results; no extra counters or save schema. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KdMechanicProgress=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{'use strict';
const shortNames=Object.freeze(['Ters','Hedef','Sabit','Zincir','Kaydır','Çift hat','Ayna','Sınır','Portal','Satır','Anahtar','Engel','2 katman','Yön','Sis']);
function modeOf(value){if(!['number','string'].includes(typeof value))return null;const level=Number(value);return Number.isInteger(level)&&level>=1&&level<=300?(level<=10?'tutorial':String((level-11)%15)):null;}
function starsOf(value){if(!['number','string'].includes(typeof value))return 0;const number=Number(value);return Number.isFinite(number)?Math.min(3,Math.max(0,Math.trunc(number))):0;}
function normalizeMode(value){const mode=String(value);return mode==='all'||mode==='tutorial'||/^(?:[0-9]|1[0-4])$/.test(mode)?mode:'all';}
function progress(completed,unlocked=1){
 const results=completed&&typeof completed==='object'&&!Array.isArray(completed)?completed:{},limit=Math.min(300,Math.max(1,Math.trunc(Number(unlocked))||1));
 const modes=shortNames.map((shortName,id)=>({id:String(id),shortName,total:0,completed:0,perfect:0,stars:0,available:0}));
 for(let level=11;level<=300;level++){
  const mode=modes[Number(modeOf(level))],stars=starsOf(Object.hasOwn(results,level)?results[level]:0);mode.total++;mode.stars+=stars;if(stars>0)mode.completed++;if(stars===3)mode.perfect++;if(level<=limit)mode.available++;
 }
 return {modes,mastered:modes.filter(mode=>mode.perfect===mode.total).length,perfect:modes.reduce((n,mode)=>n+mode.perfect,0),total:290};
}
function matches(level,mode='all'){const actual=modeOf(level),selected=normalizeMode(mode);return actual!==null&&(selected==='all'||selected===actual);}
return Object.freeze({shortNames,modeOf,normalizeMode,progress,matches});
});
