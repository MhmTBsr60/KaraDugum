'use strict';
const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),Module=require('node:module'),{performance}=require('node:perf_hooks');
const oldSource=execFileSync('git',['show','21038c76dec5dc46944e94462eb6d341df947b18:cloud-model.js'],{encoding:'utf8'});
const previous=new Module('6.55-cloud-model');previous._compile(oldSource,'6.55-cloud-model.js');
const a=previous.exports,b=require('../cloud-model.js');
const stableProjection=p=>({wallet:p.wallet,stats:p.stats,owned:[...p.owned],claims:[...p.claims],accepted:[...p.accepted],rejected:[...p.rejected]});
for(const count of [300,3000,15000]){
 const root={id:'base',wallet:{coins:100,hintCoupons:20,xp:0},stats:{},owned:['gold'],claims:{}};
 const left={schema:1,account:'synthetic-owner',root,ops:{},counters:{},state:{}},right=JSON.parse(JSON.stringify(left));
 for(let i=1;i<=count;i++){const o={n:i,d:i%2?'actorA':'actorB',coins:i%7===0?-3:5,hintCoupons:i%5===0?1:0,xp:2};(i%2?left:right).ops['transaction:'+i]=o;if(i%10===0)left.ops['transaction:'+i]={...o,coins:7};}
 const before=JSON.stringify([left,right]), old=a.merge(left,right),candidate=b.merge(left,right);
 assert.deepEqual(candidate,old);assert.deepEqual(stableProjection(b.project(candidate)),stableProjection(a.project(old)));assert.equal(JSON.stringify([left,right]),before);
 candidate.ops['transaction:1'].coins=12345;assert.equal(JSON.stringify([left,right]),before,'Merge result must never alias source objects');
 const timings={};for(const [name,model] of [['6.55',a],['6.56',b]]){const samples=[];for(let run=0;run<7;run++){const start=performance.now(),merged=model.merge(left,right);model.project(merged);JSON.stringify(merged);samples.push(performance.now()-start);}samples.sort((x,y)=>x-y);timings[name]=Number(samples[3].toFixed(2));}
 console.log(JSON.stringify({count,medianMs:timings,identical:true}));
}
assert.throws(()=>b.merge({schema:1,account:'one'},{schema:1,account:'two'}));
console.log('PASS: old/new cloud merge results, wallets, ownership, input isolation, and account rejection match.');
