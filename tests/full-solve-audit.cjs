// Exercise the actual hint handler and board click listener for every generated level.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const script=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(x=>x[1]).find(x=>x.includes('function generate(){')&&x.includes('function solved(){'));
assert(script,'Game script missing');
const hook=`
const hintAudit=[];
for(let testLevel=1;testLevel<=300;testLevel++){
 level=testLevel;generate();set64('hintCoupons',2000);
 const snap=()=>JSON.stringify({tiles,sealed,keys,fog,rotCount,targetDone,ice,moves,extra:window.kdExtra});
 const original=snap();
 for(let step=0;step<8;step++){
  const i=(testLevel*7+step*11)%tiles.length,old=snap(),h=history.length;
  $('board').children[i].click();
  if(history.length>h){$('undo').onclick();if(snap()!==old)hintAudit.push({level:testLevel,error:'undo failed',step});}
 }
 $('hint').onclick();$('restart').onclick();
 if(snap()!==original)hintAudit.push({level:testLevel,error:'restart failed'});

 let steps=0;
 while(!locked&&steps<1000){
  const old=JSON.stringify({tiles,targetDone,keys,moves,extra:window.kdExtra});
  $('hint').onclick();steps++;
  if(old===JSON.stringify({tiles,targetDone,keys,moves,extra:window.kdExtra}))break;
 }
 if(!locked||!solved()||moves>optimal)hintAudit.push({level:testLevel,mode,steps,status:$('status').textContent});
}
window.hintAudit=hintAudit;
`;
const patched=script.replace(/generate\(\)\s*\}\)\(\);\s*$/,'generate();'+hook+'})();');
assert.notEqual(patched,script,'Unable to inject hint audit');
const storage=new Map(),elements=new Map();let boardClick=null;
function el(id){
 if(elements.has(id))return elements.get(id);
 const e={textContent:'',innerHTML:'',style:{},dataset:{},isConnected:true,
 classList:{add(){},remove(){}},addEventListener(type,fn){if(id==='board'&&type==='click')boardClick=fn;},
 insertAdjacentElement(){},onclick:null,scrollIntoView(){}};
 if(id==='board')Object.defineProperty(e,'children',{get(){const n=(this.innerHTML.match(/class="tile /g)||[]).length;return Array.from({length:n},(_,i)=>({dataset:{i:String(i)},style:{},isConnected:true,classList:{add(){},remove(){}},scrollIntoView(){},click(){if(boardClick)boardClick({target:{closest(){return {dataset:{i:String(i)},classList:{add(){},remove(){}}};}}});}}));}});
 else e.children=[];
 elements.set(id,e);return e;
}
const ctx={console,Math,Date,JSON,Set,Array,Object,Number,String,
 localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
 document:{getElementById:el,createElement:()=>el('fake'),addEventListener(){},hidden:false},
 window:{},setInterval:()=>0,clearInterval(){},setTimeout(){},alert(){}};
vm.createContext(ctx);
vm.runInContext(patched,ctx,{timeout:120000});
const failures=ctx.window.hintAudit;
assert(failures,'Audit did not run');
console.log('300 levels completed by legal hint moves; failures:',failures.length);
if(failures.length){console.error(JSON.stringify(failures));process.exitCode=1;}
