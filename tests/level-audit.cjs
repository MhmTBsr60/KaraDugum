// Run with: node tests/level-audit.cjs
// Executes the actual first game script in a small DOM stub and audits all 300 generated boards.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(x => x[1]);
const source = scripts.find(x => x.includes('function generate(){') && x.includes('function solved(){'));
assert(source, 'Game generator script not found');
const hook = `
const failures=[];
const difficultyBands={};
const solvedAtStart=[];
for(let testLevel=1;testLevel<=300;testLevel++){
 level=testLevel;
 generate();
 const snapshot=JSON.stringify({n,mode,tiles,solution,fixed,optimal});
 generate();
 if(JSON.stringify({n,mode,tiles,solution,fixed,optimal})!==snapshot)failures.push([testLevel,'nondeterministic board']);
 const band=n+'x'+n;
 if(!difficultyBands[band])difficultyBands[band]={levels:0,totalOptimal:0,minOptimal:Infinity,maxOptimal:0};
 difficultyBands[band].levels++;
 difficultyBands[band].totalOptimal+=optimal;
 difficultyBands[band].minOptimal=Math.min(difficultyBands[band].minOptimal,optimal);
 difficultyBands[band].maxOptimal=Math.max(difficultyBands[band].maxOptimal,optimal);
 const count=n*n;
 if(tiles.length!==count||solution.length!==count||fixed.length!==count)failures.push([testLevel,'board size']);
 if(!Number.isFinite(optimal)||optimal<1)failures.push([testLevel,'optimal']);
 if(tiles.some(v=>!Number.isInteger(v)||v<0||v>15))failures.push([testLevel,'tile bits']);
 if(fixed.some((v,i)=>v&&tiles[i]!==solution[i]))failures.push([testLevel,'fixed mismatch']);
 if(level>10&&mode===4){
  const neighbor=i=>[i-n,i+n,i-1,i+1].filter(j=>j>=0&&j<count&&(Math.abs(j%n-i%n)+Math.abs((j/n|0)-(i/n|0))===1)&&!fixed[j])[0];
  for(let i=0;i<count;i++)if(tiles[i]!==solution[i]){
   const j=neighbor(i);
   if(j===undefined||neighbor(j)!==i||tiles[i]!==solution[j]||tiles[j]!==solution[i])failures.push([testLevel,'unreachable slide pair '+i]);
  }
 }
 const expectedHints=testLevel<=25?3:testLevel<=70?2:testLevel<=100?1:0;
 if(hints!==expectedHints)failures.push([testLevel,'free hint count '+hints+' expected '+expectedHints]);
 if(testLevel>10&&[3,4,6,9].includes(mode)){
  const candidates=tiles.map((v,i)=>i).filter(i=>!fixed[i]&&tiles[i]!==solution[i]);
  if(!candidates.length && !tiles.every((v,i)=>fixed[i]||v===solution[i]))failures.push([testLevel,'no special hint candidates despite unsolved board']);
 }
 const saved=tiles;
 if(solved())solvedAtStart.push(testLevel);
 tiles=solution.slice();
 if(!solved())failures.push([testLevel,'solution connectivity']);
 tiles=saved;
}
window.auditResult={tested:300,failures,difficultyBands,solvedAtStart};
`;
const patched=source.replace(/generate\(\)\s*\}\)\(\);\s*$/, 'generate();'+hook+'})();');
assert.notEqual(patched,source,'Could not attach audit hook');
const storage=new Map();
const elements=new Map();
const el=id=>{if(!elements.has(id))elements.set(id,{
 textContent:'',innerHTML:'',style:{},classList:{add(){},remove(){}},
 addEventListener(){},insertAdjacentElement(){},children:[],onclick:null
});return elements.get(id)};
const ctx={console,Math,Date,JSON,Set,Array,Object,Number,String,
 localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v))},
 document:{getElementById:el,createElement:()=>el('fake'),addEventListener(){},hidden:false},
 window:{},setInterval:()=>0,clearInterval(){},setTimeout(){},alert(){}};
vm.createContext(ctx);
vm.runInContext(patched,ctx,{timeout:15000});
const result=ctx.window.auditResult;
assert(result,'Audit did not execute');
console.log('Audited '+result.tested+' levels');
for(const [band,v] of Object.entries(result.difficultyBands))console.log('Difficulty '+band+': '+v.levels+' levels, estimated moves '+v.minOptimal+'-'+v.maxOptimal+', mean '+(v.totalOptimal/v.levels).toFixed(1));
console.log('Already solved at start: '+(result.solvedAtStart.join(', ')||'none'));
if(result.solvedAtStart.length){console.error('Levels starting solved:',result.solvedAtStart);process.exitCode=1;}
if(result.failures.length){console.error(JSON.stringify(result.failures));process.exitCode=1}
else console.log('PASS: board sizes, tile bits, fixed tiles and solved target connectivity');
console.log('NOTE: This is NOT an exhaustive proof of reachability under special-mode rules.');


/* Hint regression checks: run against the shipped HTML, not a duplicate rules table. */
const hintHandler = html.match(/\$\('hint'\)\.onclick=\(\)=>\{[\s\S]*?\};function tick\(/)?.[0];
assert(hintHandler, 'Hint click handler missing');
assert(hintHandler.includes('rewardedHint()'), 'Rewarded hint request missing');
assert(hintHandler.includes('hintCoupons'), 'Hint coupon spending missing');
assert(hintHandler.includes('usedHints++'), 'Hint usage accounting missing');
assert(hintHandler.includes('if(locked)return'), 'Hint usable after game lock');
const restartHandler = html.match(/\$\('restart'\)\.onclick=\(\)=>\{[\s\S]*?\};\$\('new'\)/)?.[0];
assert(restartHandler, 'Restart handler missing');
assert(restartHandler.includes('level<=25?3:level<=70?2:level<=100?1:0'), 'Restart free hint bands differ from generator');
assert(html.includes("window.kdHintAdPending=false"), 'Rewarded hint pending state is not cleared');
console.log('PASS: hint handler, reward path, coupon accounting and restart hint bands present');
