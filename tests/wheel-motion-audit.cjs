/* Exercise actual wheel presentation and payouts; no real advertising or player data. */
'use strict';
const assert=require('node:assert/strict'),{chromium,serve,init}=require('./ux-harness.cjs');
(async()=>{const {server,url}=await serve(),b=await chromium.launch({args:['--no-sandbox']});let checked=0;try{
 for(const limited of [false,true]){const p=await init(b,url,{limited,audioMock:true,motion:'no-preference'}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.evaluate(()=>{kdNavigate('shop');kdFeedback.setHaptics(true)});
  assert.equal(await p.evaluate(()=>document.documentElement.hasAttribute('data-kd-wheel-low-motion')),limited);
  for(let index=0;index<8;index++){
   await p.evaluate(index=>{localStorage.setItem('kd64_coins','100');localStorage.setItem('kd64_hintCoupons','0');localStorage.removeItem('kd64_shopWheelDate');localStorage.setItem('kd64_wheelState',JSON.stringify({date:new Date().toLocaleDateString('en-CA'),freeUsed:false,adCount:0,bonusUsed:false,pending:null}));Math.random=()=>(index+.2)/8;__ux.haptics=[];kdOpenWheel()},index);
   await p.locator('.kdWheelSpin').click();const reserved=await p.evaluate(()=>JSON.parse(localStorage.getItem('kd64_wheelState')).pending);assert.equal(reserved.prizeIndex,index);assert.equal(reserved.multiplier,1);
   await p.clock.runFor(2100);assert.equal(await p.evaluate(()=>Number(localStorage.getItem('kd64_coins'))),100,'No early payout');assert.equal(await p.locator('#kdWheelOverlay').getAttribute('data-spinning'),'true');const planned=await p.locator('.kdWheelDisc').evaluate(e=>Number(e.style.transform.match(/rotate\(([-\d.]+)deg\)/)[1]));assert.equal(planned,(limited?720:1800)+360-(index+.5)*45);
   await p.clock.runFor(2400);assert.equal(await p.locator('#kdWheelOverlay').getAttribute('data-spinning'),'false');const expected=360-(index+.5)*45;
   const landed=await p.locator('.kdWheelDisc').evaluate(e=>{const m=new DOMMatrixReadOnly(getComputedStyle(e).transform);return {cos:m.a,sin:m.b,layer:getComputedStyle(e).willChange}});assert(Math.abs(landed.cos-Math.cos(expected*Math.PI/180))<.00001);assert(Math.abs(landed.sin-Math.sin(expected*Math.PI/180))<.00001);assert.equal(landed.layer,'auto');
   const ticks=await p.evaluate(()=>__ux.haptics.filter(x=>x==='wheelTick').length);assert(ticks>= (limited?15:39)&&ticks<=(limited?24:48),`${limited}/${index}: ${ticks} ticks`);
   assert.equal(await p.evaluate(()=>Number(localStorage.getItem('kd64_coins'))),100+[10,25,0,0,15,50,20,30][index]);assert.equal(await p.evaluate(()=>Number(localStorage.getItem('kd64_hintCoupons'))),index===2?1:0);assert.equal(await p.locator('#kdWheelOverlay').getAttribute('data-result'),index===3?'blank':'won');
   if(limited)assert.equal(await p.locator('.kdWheelResult').evaluate(e=>getComputedStyle(e).animationName),'none');assert(await p.locator('.kdWheelSpin').isDisabled());await p.locator('.kdWheelClose').click();checked++;
  }assert.deepEqual(errors,[]);await p.close();
 }
 const p=await init(b,url,{limited:true,audioMock:true,motion:'reduce'});await p.evaluate(()=>{kdNavigate('shop');kdFeedback.setHaptics(true);kdOpenWheel()});await p.locator('.kdWheelSpin').click();await p.clock.runFor(500);assert.equal(await p.evaluate(()=>__ux.haptics.filter(x=>x==='wheelTick').length),0);assert.equal(await p.locator('.kdWheelDisc').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');assert.equal(await p.locator('#kdWheelOverlay').getAttribute('data-spinning'),'false');await p.close();
 console.log(`PASS: ${checked} actual high/low-hardware spins; original 8 payouts, preselection/no early payout, all final pointer angles, reduced turn/tick counts, static low-hardware result, independent reduced-motion override`);
 }finally{await b.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1});
