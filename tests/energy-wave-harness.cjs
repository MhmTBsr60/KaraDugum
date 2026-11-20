'use strict';
const path=require('path');
const root=path.resolve(__dirname,'..');
async function initialize(p,{base='file://'+root+'/',low=false,reduce=false,seed=true,pauseLead=1000,query='',deviceOverride=true}={}){
 await p.emulateMedia({reducedMotion:reduce?'reduce':'no-preference'});
 await p.addInitScript(({low,seed,deviceOverride})=>{
  if(deviceOverride){Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>low?2:8});Object.defineProperty(navigator,'deviceMemory',{get:()=>low?2:8});}
  if(seed){localStorage.setItem('kd6_lang','tr');localStorage.setItem('kd64_level','300');localStorage.setItem('kd64_coins','510');localStorage.setItem('kd64_hintCoupons','7');localStorage.setItem('kd3_sound','0');for(const t of ['gold','ice','fire','shadow','emerald','ruby'])localStorage.setItem('kd64_shopTheme_'+t,'true');}
 },{low,seed,deviceOverride});
 await p.clock.install({time:new Date('2026-11-19T12:00:00Z')});await p.goto(base+'index.html'+query);await p.clock.pauseAt(new Date(await p.evaluate(()=>Date.now())+pauseLead));await p.clock.runFor(2600);
 await select(p,1);await p.clock.runFor(1800);
}
async function select(p,level){await p.evaluate(level=>{document.querySelector('.kdDailyClose')?.click();kdSelectLevel(level);kdNavigate('game');kdOnboarding.leave();kdLearning.leave();kdSetPaused(true)},level);await p.clock.runFor(100);}
const snapshot=p=>p.evaluate(()=>{const s=kdGetLearningState();delete s.elapsed;return {game:s,tiles:kdLessonPreview().before,save:JSON.parse(localStorage.getItem('kd64_activeGame')),coins:localStorage.getItem('kd64_coins'),hints:localStorage.getItem('kd64_hintCoupons'),completed:localStorage.getItem('kd64_completed'),best:localStorage.getItem('kd64_best')};});
const state=p=>p.evaluate(()=>kdPipeFlow.state());
async function nextMove(p,{breakLink=false}={}){return p.evaluate(breakLink=>{const l=kdLessonPreview(),old=kdConnectionModel.graph(l.before,l.n,l.flags.fog).edges,base=old.length;let best=null;for(let i=0;i<l.before.length;i++){if(l.flags.fixed[i])continue;const v=l.before.slice();v[i]=((v[i]<<1)&15)|(v[i]>>3);const next=kdConnectionModel.graph(v,l.n,l.flags.fog).edges,score=next.length,lost=old.filter(e=>!next.some(n=>n.id===e.id)).map(e=>e.id);if(!best||(breakLink?(lost.length>best.lost.length||lost.length===best.lost.length&&score<best.score):score>best.score))best={i,score,base,lost};}return best;},breakLink);}

async function rotate(p,i){await p.locator('#board>.tile').nth(i).click();}
// Read-only orientation CSP for the ordinary 4x4 preview, then actual engine
// clicks. Never assigns tiles/solution/locked or consumes hint coupons.
async function solve(p){
 const data=await p.evaluate(()=>kdLessonPreview()),n=data.n,dirs=[[1,-1,0,4],[2,0,1,8],[4,1,0,1],[8,0,-1,2]];
 assertBasic(data);
 const domains=data.before.map((mask,i)=>{const options=[];let m=mask;for(let k=0;k<4;k++,m=((m<<1)&15)|(m>>3))if((!data.flags.fixed[i]||k===0)&&!options.some(x=>x.mask===m)&&dirs.every(([bit,dr,dc])=>!(m&bit)||Math.floor(i/n)+dr>=0&&Math.floor(i/n)+dr<n&&i%n+dc>=0&&i%n+dc<n))options.push({mask:m,turns:k});return options;});
 function search(input){const ds=input.map(a=>a.slice());let changed=true;while(changed){changed=false;for(let i=0;i<ds.length;i++){const next=ds[i].filter(v=>dirs.every(([bit,dr,dc,opp])=>{const r=Math.floor(i/n)+dr,c=i%n+dc;if(r<0||r>=n||c<0||c>=n)return !(v.mask&bit);return ds[r*n+c].some(w=>!!(w.mask&opp)===!!(v.mask&bit))}));if(!next.length)return null;if(next.length!==ds[i].length){ds[i]=next;changed=true;}}}const choices=ds.map((d,i)=>({d,i})).filter(x=>x.d.length>1).sort((a,b)=>a.d.length-b.d.length);if(!choices.length)return ds.map(d=>d[0]);const {d,i}=choices[0];for(const v of d){const next=ds.map(a=>a.slice());next[i]=[v];const found=search(next);if(found)return found;}return null;}
 const solution=search(domains);if(!solution)throw Error('Read-only preview CSP found no solution');
 await p.evaluate(solution=>{for(let i=0;i<solution.length;i++)for(let k=0;k<solution[i].turns;k++){if(kdGetLearningState().locked)break;document.querySelector('#board>.tile[data-i="'+i+'"]').click();}if(!kdGetLearningState().locked)throw Error('Actual engine rejected preview click solution');},solution);
}
function assertBasic(data){if(data.n!==4||data.mode!==-1)throw Error('Preview CSP supports ordinary tutorial board only');}

async function theme(p,id){await p.evaluate(id=>{kdNavigate('shop');const b=document.querySelector('[data-shop-theme="'+id+'"]');if(!b.disabled)b.click();kdNavigate('game');kdSetPaused(true)},id);await p.clock.runFor(100);}
module.exports={root,initialize,select,snapshot,state,nextMove,rotate,solve,theme};
