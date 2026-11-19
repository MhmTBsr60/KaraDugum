/* Deterministic screen recording of the real game, actual DOM input + actual engine.
   Only synthetic local saves, device capability and time are controlled by this harness. */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{execFileSync}=require('child_process'),{chromium}=require('playwright');
const H=require('../tests/energy-wave-harness.cjs'),out=process.env.KD_WAVE_REPORT||path.join(H.root,'design/energy-wave-preview'),frames=path.join('/tmp','kd-energy-wave-frames');fs.mkdirSync(out,{recursive:true});fs.mkdirSync(frames,{recursive:true});
(async()=>{const b=await chromium.launch({args:['--no-sandbox']});try{
 const p=await b.newPage({viewport:{width:430,height:932},deviceScaleFactor:2});const errors=[];p.on('pageerror',e=>errors.push(String(e)));await H.initialize(p);await p.evaluate(()=>document.fonts.ready);
 const fps=24,total=12*fps,shots={12:'01-before',40:'02-wave-middle',144:'03-connected',225:'04-completion'},events=[],states={};
 for(let f=0;f<total;f++){
  if(f===24){const m=await H.nextMove(p);assert(m.score>m.base);await H.rotate(p,m.i);events.push({second:f/fps,event:'real tile click forms reciprocal connection',move:m});}
  if([86,98,110].includes(f)){const m=await H.nextMove(p);if(m.score>m.base&&m.score<14){await H.rotate(p,m.i);events.push({second:f/fps,event:'additional real tile click',move:m});}}
  if(f===156){const m=await H.nextMove(p,{breakLink:true});assert(m.lost.length>0);await H.rotate(p,m.i);events.push({second:f/fps,event:'break reciprocal connection',move:m});}
  if(f===168){await p.locator('#undo').click();events.push({second:f/fps,event:'actual undo restores connection'});}
  if(f===210){await H.solve(p);events.push({second:f/fps,event:'real engine finishes via hints in isolated synthetic save'});}
  await p.clock.runFor(1000/fps);
  const file=path.join(frames,String(f).padStart(4,'0')+'.png');await p.screenshot({path:file,animations:'allow'});
  if(shots[f]){const n=shots[f];fs.copyFileSync(file,path.join(out,n+'.png'));const r=await p.locator('#board').boundingBox();await p.screenshot({path:path.join(out,n+'-board.png'),clip:{x:r.x-6,y:r.y-6,width:r.width+12,height:r.height+12},animations:'allow'});states[n]={flow:await H.state(p),game:await H.snapshot(p),second:f/fps};}
 }
 fs.writeFileSync(path.join(out,'capture-debug.json'),JSON.stringify({events,states,errors},null,2));
 assert(states['02-wave-middle'].flow.effects.waves.length>0);assert(states['02-wave-middle'].flow.effects.rings.length>0);assert(states['03-connected'].flow.edges.length>states['02-wave-middle'].flow.edges.length);assert(states['04-completion'].game.game.locked);assert(states['04-completion'].flow.effects.waves.some(w=>w.winning));assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'preview-state.json'),JSON.stringify({fps,durationSeconds:12,viewport:{width:430,height:932},imagePixels:{width:860,height:1864},syntheticClock:true,syntheticHardware:true,realEngine:true,realGeometry:true,events,states,errors,phoneVerified:false},null,2));
 execFileSync('ffmpeg',['-y','-loglevel','error','-framerate',String(fps),'-i',path.join(frames,'%04d.png'),'-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,'energy-wave-12s.mp4')],{stdio:'inherit'});
 console.log('PASS: 4 actual-game previews and 12s/24fps/860x1864 MP4. No game APK built. '+out);
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
