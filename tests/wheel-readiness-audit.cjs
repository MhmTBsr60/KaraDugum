/* Lightweight VM checks: observing a badge must never grant or consume a reward. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.resolve(__dirname,'../wheel.js'),'utf8'),clock={now:Date.parse('2026-11-09T12:00:00Z')},data=new Map(),writes=[],events=[],listeners=new Map(),timers=new Map();let sequence=0,previousCalls=0;
class TestDate extends Date{constructor(...args){super(...(args.length?args:[clock.now]));}static now(){return clock.now;}}
const document={hidden:false,getElementById:()=>null,querySelector:()=>null,addEventListener:(name,fn)=>listeners.set(name,fn)};
const window={kdNativeEvent(){previousCalls++;},dispatchEvent:event=>{events.push(event.type);return true;}};
const localStorage={getItem:key=>data.has(key)?data.get(key):null,setItem:(key,value)=>{writes.push(['set',key]);data.set(key,String(value));},removeItem:key=>{writes.push(['remove',key]);data.delete(key);}};
const context=vm.createContext({window,document,localStorage,Date:TestDate,console,Event:class{constructor(type){this.type=type;}},setTimeout:(fn,ms)=>{timers.set(++sequence,{fn,ms});return sequence;},clearTimeout:id=>timers.delete(id),matchMedia:()=>({matches:false}),requestAnimationFrame:()=>{}});
vm.runInContext(source,context,{filename:'wheel.js'});
assert.deepEqual(events,['kd:rewards-changed'],'Wheel initialization must announce readiness once');assert.equal(timers.size,0,'Idle readiness must not create a polling timer');
const plain=value=>JSON.parse(JSON.stringify(value)),today=new TestDate().toLocaleDateString('en-CA'),yesterday='2026-11-08',stateKey='kd64_wheelState',legacyKey='kd64_shopWheelDate';
function seed(state,legacy=''){data.clear();if(state!==undefined)data.set(stateKey,JSON.stringify(state));data.set(legacyKey,JSON.stringify(legacy));data.set('kd64_coins','100');data.set('kd64_hintCoupons','2');writes.length=events.length=0;}
const expected=(freeReady,bonusReady,pending)=>({freeReady,bonusReady,pending,total:Number(freeReady)+Number(bonusReady)}),spin={id:'selected-spin',prizeIndex:0,multiplier:1,readyAt:clock.now-5000};
const cases=[
 ['fresh',undefined,'',expected(true,false,false)],
 ['today free',{date:today,freeUsed:false,adCount:0,bonusUsed:false,pending:null},'',expected(true,false,false)],
 ['legacy consumed',{date:today,freeUsed:false,adCount:0,bonusUsed:false,pending:null},today,expected(false,false,false)],
 ['two videos',{date:today,freeUsed:true,adCount:2,bonusUsed:false,pending:null},today,expected(false,false,false)],
 ['bonus ready',{date:today,freeUsed:true,adCount:3,bonusUsed:false,pending:null},today,expected(false,true,false)],
 ['bonus taken',{date:today,freeUsed:true,adCount:3,bonusUsed:true,pending:null},today,expected(false,false,false)],
 ['selected overdue spin',{date:today,freeUsed:true,adCount:3,bonusUsed:false,pending:spin},today,expected(false,false,true)],
 ['midnight unsettled spin',{date:yesterday,freeUsed:true,adCount:3,bonusUsed:false,pending:spin},yesterday,expected(false,false,true)],
 ['new day',{date:yesterday,freeUsed:true,adCount:3,bonusUsed:true,pending:null},yesterday,expected(true,false,false)],
 ['invalid array',[],today,expected(false,false,false)]
];
window.kdEconomy={active(){throw Error('Badge queried a wallet-mutating path');},transact(){throw Error('Badge granted a reward');}};
for(const [name,state,legacy,result]of cases){seed(state,legacy);const before=[...data];for(let n=0;n<5;n++)assert.deepEqual(plain(window.kdWheel.availability()),result,name);assert.deepEqual([...data],before,name+' mutated persisted values');assert.deepEqual(writes,[],name+' wrote storage');assert.deepEqual(events,[],name+' emitted recursive refresh events');assert.equal(timers.size,0,name+' scheduled polling');}
delete window.kdEconomy;
// Third completed ad changes claimability; duplicates, failures and mere progress do not.
seed({date:today,freeUsed:true,adCount:2,bonusUsed:false,pending:null},today);data.set('kd64_wheelAdPending',JSON.stringify({id:'third-video',date:today,at:clock.now}));window.kdNativeEvent('adReward','wheel:third-video');assert.deepEqual(plain(window.kdWheel.availability()),expected(false,true,false));assert.deepEqual(events,['kd:rewards-changed']);assert.equal(JSON.parse(data.get('kd64_coins')),100);window.kdNativeEvent('adReward','wheel:third-video');assert.equal(events.length,1);
seed({date:today,freeUsed:true,adCount:1,bonusUsed:false,pending:null},today);data.set('kd64_wheelAdPending',JSON.stringify({id:'second-video',date:today,at:clock.now}));window.kdNativeEvent('adReward','wheel:second-video');assert.equal(JSON.parse(data.get(stateKey)).adCount,2);assert.equal(events.length,0);data.set('kd64_wheelAdPending',JSON.stringify({id:'failed-video',date:today,at:clock.now}));window.kdNativeEvent('wheelAdUnavailable','failed-video');assert.equal(data.has('kd64_wheelAdPending'),false);assert.equal(events.length,0);
// Existing lifecycle settlement still pays exactly once; availability alone paid nothing above.
for(const date of [today,yesterday]){seed({date,freeUsed:true,adCount:0,bonusUsed:false,pending:{...spin,date}},date);assert.deepEqual(plain(window.kdWheel.availability()),expected(false,false,true));listeners.get('visibilitychange')();assert.equal(JSON.parse(data.get('kd64_coins')),110);assert.equal(JSON.parse(data.get('kd64_hintCoupons')),2);assert.deepEqual(events,['kd:rewards-changed']);listeners.get('visibilitychange')();assert.equal(JSON.parse(data.get('kd64_coins')),110);assert.equal(events.length,1);assert.equal(window.kdWheel.availability().pending,false);assert.equal(window.kdWheel.availability().freeReady,date===yesterday);}
const beforeClose=[...data];window.kdCloseWheel();assert.deepEqual([...data],beforeClose);assert.equal(events.at(-1),'kd:rewards-changed');window.kdNativeEvent('unrelated','data');assert.equal(previousCalls,1);
console.log('PASS: pure free/bonus readiness, legacy daily consumption, pending/midnight suppression, no wallet writes or polling, readiness-change events, duplicate/failed-ad handling and existing exactly-once lifecycle settlement');
