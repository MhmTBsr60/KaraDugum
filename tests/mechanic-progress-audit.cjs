// Prepared for the final verification pass; this projection must never write progress.
'use strict';
const assert=require('node:assert/strict'),P=require('../mechanic-progress.js');
for(const [level,mode]of [[1,'tutorial'],[10,'tutorial'],[11,'0'],[25,'14'],[26,'0'],[300,'4']])assert.equal(P.modeOf(level),mode);
for(const level of [0,301,1.5,null,true,{},'invalid'])assert.equal(P.modeOf(level),null);
const empty=P.progress({},1);assert.equal(empty.modes.length,15);assert.equal(empty.total,290);assert.equal(empty.mastered,0);assert.equal(empty.modes.reduce((n,m)=>n+m.total,0),290);assert.deepEqual(empty.modes.map(m=>m.total),[20,20,20,20,20,19,19,19,19,19,19,19,19,19,19]);assert(empty.modes.every(m=>m.available===0));
const completed={1:3,2:3,11:3,12:2,26:1,27:3,41:3,999:3},before=JSON.stringify(completed),partial=P.progress(completed,52);
assert.equal(JSON.stringify(completed),before);assert.deepEqual(partial.modes[0],{id:'0',shortName:'Ters',total:20,completed:3,perfect:2,stars:7,available:3});assert.equal(partial.modes[1].completed,2);assert.equal(partial.modes[1].perfect,1);assert.equal(partial.perfect,3);
assert.equal(P.progress({1:3,2:3,10:3},300).perfect,0,'Tutorials do not count as a special mechanic');
const all=Object.fromEntries(Array.from({length:300},(_,i)=>[i+1,3])),full=P.progress(all,300);assert.equal(full.mastered,15);assert.equal(full.perfect,290);assert(full.modes.every(m=>m.perfect===m.total&&m.available===m.total));
assert.equal(P.progress(Object.create({11:3}),300).perfect,0,'Only recorded own keys count');assert.equal(P.progress({11:true,26:'invalid'},300).modes[0].completed,0);assert.equal(P.progress({11:'3',26:100},300).modes[0].perfect,2);
assert(P.matches(11,'0'));assert(!P.matches(12,'0'));assert(P.matches(10,'tutorial'));assert(!P.matches(11,'tutorial'));assert(P.matches(300,'all'));assert(!P.matches(301,'all'));assert.equal(P.normalizeMode('15'),'all');
console.log('PASS: 15 mechanic families, 290 normal levels, tutorial separation, existing stars, unlock bounds, read-only aggregates and safe mechanic filters');
