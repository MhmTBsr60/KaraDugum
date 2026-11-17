'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),baseline=path.resolve(root,'../KaraDugum-ux-baseline');
const {chromium}=require(path.join(root,'node_modules/playwright'));
function serve({beforeRoot=baseline}={}){const server=http.createServer((q,r)=>{const pathname=decodeURIComponent(q.url.split('?')[0]),before=pathname.startsWith('/before/'),dir=before?beforeRoot:root,url=before?pathname.slice(7):pathname.replace(/^\/after/,'');const f=path.resolve(dir,'.'+url);if(!f.startsWith(dir+path.sep)||url.includes('/.git')||!fs.existsSync(f)||!fs.statSync(f).isFile()){r.writeHead(404);r.end();return;}const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json','.wav':'audio/wav'};r.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');r.end(fs.readFileSync(f));});return new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve({server,url:`http://127.0.0.1:${server.address().port}`})));}
async function init(b,url,{before=false,lang='tr',viewport={width:390,height:844},dpr=1,motion='reduce',audioMock=false,native=true,legacyMusic=false,limited=false}={}){
 const p=await b.newPage({viewport,deviceScaleFactor:dpr,reducedMotion:motion});
 await p.addInitScript(({lang,native,audioMock,legacyMusic,limited})=>{
  Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>limited?2:8});Object.defineProperty(navigator,'deviceMemory',{get:()=>limited?2:8});
  let seed=12;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  if(localStorage.getItem('__ux_seeded')!=='1'){localStorage.setItem('__ux_seeded','1');
  localStorage.setItem('kd64_level','300');localStorage.setItem('kd64_coins','1200');localStorage.setItem('kd64_hintCoupons','6');localStorage.setItem('kd64_xp','1600');localStorage.setItem('kd64_completed','{"1":3,"2":2,"3":3,"4":2,"5":3,"11":2,"17":3}');localStorage.setItem('kd64_best','{"1":1200,"2":1100,"3":1300,"4":1050,"5":1280,"11":1550,"17":1900}');localStorage.setItem('kd6_lang',lang);localStorage.setItem('kd3_name','Gezgin');localStorage.setItem('kd3_music',legacyMusic?'1':'0');localStorage.setItem('kd3_sound','1');}
  window.__ux={haptics:[],configurations:[],ads:[],contexts:0,notes:[],stops:0};
  if(native)window.KaraNative={hapticAvailable:()=>true,feedbackAudioAllowed:()=>!__ux.quiet,setHapticsEnabled:enabled=>__ux.configurations.push(enabled),haptic:kind=>__ux.haptics.push(kind),rewardedWheel:id=>__ux.ads.push(id)};
  if(audioMock){class AudioMock{constructor(){__ux.contexts++;this.state='suspended';this.currentTime=0;this.destination={};}resume(){this.state='running';return Promise.resolve()}suspend(){this.state='suspended';return Promise.resolve()}createOscillator(){return {type:'',frequency:{setValueAtTime:v=>__ux.notes.push(v),exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(){},stop(){__ux.stops++}}}createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}}}window.AudioContext=AudioMock;}
 },{lang,native,audioMock,legacyMusic,limited});
 await p.clock.install({time:new Date('2026-11-17T12:00:00Z')});await p.goto(url+(before?'/before':'/after')+'/index.html');await p.clock.fastForward(2500);if(await p.locator('.kdDailyClose').count())await p.locator('.kdDailyClose').click();return p;
}
module.exports={root,baseline,chromium,serve,init};
