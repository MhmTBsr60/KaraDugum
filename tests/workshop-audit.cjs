'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),w=require('../workshop.js');
assert.equal(w.puzzles.length,6);assert.equal(new Set(w.puzzles.map(p=>p.id)).size,6);
for(const p of w.puzzles){assert(Object.isFrozen(p)&&Object.isFrozen(p.cells));assert.equal(p.cells.length,p.n*p.n);assert.equal(p.sources.length,p.kind==='dual'?2:1);assert.equal(new Set([...p.sources,...p.targets]).size,p.sources.length*2);assert(w.evaluate(p,Array(p.cells.length).fill(0)).solved,p.id+' canonical route');assert(!w.evaluate(p,p.initial).solved,p.id+' starts unsolved');assert(p.cells.every(c=>c.mask>0&&c.mask<16));const turns=p.initial.slice();for(let i=0;i<turns.length;i++){if(p.fixed.includes(i))continue;for(let k=0;k<(4-p.initial[i])%4;k++)turns[i]=(turns[i]+1)%4;}assert(w.evaluate(p,turns).solved,p.id+' legal rotations reach target');assert(!w.evaluate(p,[]).solved);assert(!w.evaluate(p,turns.map((v,i)=>i?0:1.5)).solved);}
// Physically connected pipes alone are insufficient: actual channel identity matters.
const dual=w.puzzles[0],swapped={...dual,targets:[...dual.targets].reverse()};assert(!w.evaluate(swapped,Array(9).fill(0)).solved);assert.equal(w.evaluate(swapped,Array(9).fill(0)).reason,'targets');
const mixed={kind:'dual',n:2,cells:[{mask:6,input:0,output:0},{mask:12,input:0,output:0},{mask:3,input:0,output:0},{mask:9,input:0,output:0}],sources:[0,2],targets:[1,3]};assert.equal(w.evaluate(mixed,[0,0,0,0]).reason,'mixed');
// Reversing a straight valve preserves its physical pipe mask but blocks directed flow.
const flow=w.puzzles[3],backward=Array(9).fill(0);backward[1]=2;assert.equal(w.rotate(flow.cells[1].mask,2),flow.cells[1].mask);const evaluation=w.evaluate(flow,backward);assert(!evaluation.solved);assert.equal(evaluation.reason,'direction');assert(!evaluation.flows[flow.targets[0]]);
assert(!w.evaluate(flow,[0,0,0,0,NaN,0,0,0,0]).solved);
// No campaign, economy, native ad or leaderboard integration is present.
const source=fs.readFileSync(require.resolve('../workshop.js'),'utf8');assert(!/KaraNative|kdSafeUpload|kdCloudSync|\.transact\(|kd64_(?:level|coins|xp|completed)/.test(source));
console.log('PASS: six reachable unsolved fixed puzzles, separate energy channel targets, mixing rejection, true one-way valve validation, invalid input rejection and campaign/economy isolation');
