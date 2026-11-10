'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const {execFileSync}=require('node:child_process'),os=require('node:os');
const aab=path.resolve(process.argv[2]||''),version=process.argv[3],code=Number(process.argv[4]);
assert(fs.statSync(aab).isFile()&&/^\d+\.\d+$/.test(version)&&Number.isInteger(code),'AAB, version and code required');
const work=fs.mkdtempSync(path.join(os.tmpdir(),'kd-store-media-')),source=path.join(work,'assets'),out=path.resolve('dist/store-media');fs.mkdirSync(out,{recursive:true});
execFileSync('python3',['-c',`import sys,zipfile,pathlib
z=zipfile.ZipFile(sys.argv[1]);root=pathlib.Path(sys.argv[2]);root.mkdir(parents=True,exist_ok=True)
for name in z.namelist():
 if name.startswith('base/assets/') and not name.endswith('/'):
  target=root/name[len('base/assets/'):];assert target.resolve().is_relative_to(root.resolve());target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(z.read(name))
icon=next(n for n in z.namelist() if n.endswith('/karadugum_icon.png'))
pathlib.Path(sys.argv[3]).write_bytes(z.read(icon))`,aab,source,path.join(work,'packaged-icon.png')]);
const aabSha256=crypto.createHash('sha256').update(fs.readFileSync(aab)).digest('hex');
const staged=path.resolve('dist/live/KaraDugum-v'+version+'-LIVE-build-info.json');
if(fs.existsSync(staged)){const proof=JSON.parse(fs.readFileSync(staged,'utf8'));assert.equal(proof.version,version);assert.equal(proof.versionCode,code);assert.equal(proof.adsMode,'live');assert.equal(proof.files.aab.sha256,aabSha256);if(process.env.GITHUB_SHA)assert.equal(proof.commit,process.env.GITHUB_SHA);}else assert.notEqual(process.env.GITHUB_ACTIONS,'true','Verified staged LIVE build-info is required in CI');
function convert(args){for(const cmd of ['magick','convert']){try{execFileSync(cmd,args,{stdio:'pipe'});return;}catch(error){if(error.code!=='ENOENT')throw error;}}throw Error('ImageMagick is required for exact Play image dimensions/PNG encoding');}
// Format conversion only: preserve the exact packaged icon artwork.
convert([path.join(work,'packaged-icon.png'),'-resize','512x512','-strip','PNG32:'+path.join(out,'icon-512.png')]);
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(req.url.split('?')[0]);if(pathname==='/feature.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(path.join(work,'feature.html')));return;}if(pathname==='/actual-board.png'){res.setHeader('Content-Type','image/png');res.end(fs.readFileSync(path.join(out,'actual-board.png')));return;}const f=path.resolve(source,'.'+pathname);if(!f.startsWith(source+'/')||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':f.endsWith('.png')?'image/png':f.endsWith('.webp')?'image/webp':'application/octet-stream');res.end(fs.readFileSync(f));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({args:['--no-sandbox']});const entries=[],errors=[];try{
 for(const [locale,code] of [['tr-TR','tr'],['en-US','en'],['ar','ar'],['zh-CN','zh']]){
  const context=await browser.newContext({viewport:{width:360,height:640},deviceScaleFactor:3,isMobile:true,hasTouch:true,locale,reducedMotion:'reduce'});await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());const p=await context.newPage();p.on('pageerror',e=>errors.push(locale+': '+e.message));
  await p.addInitScript(code=>{
   localStorage.setItem('kd6_lang',code);localStorage.setItem('kd64_level','17');
   localStorage.setItem('kd64_completed',JSON.stringify(Object.fromEntries(Array.from({length:16},(_,i)=>[String(i+1),2]))));
   localStorage.setItem('kd64_best',JSON.stringify(Object.fromEntries(Array.from({length:16},(_,i)=>[String(i+1),1000+i*25]))));
   localStorage.setItem('kd64_coins','240');localStorage.setItem('kd64_xp','800');localStorage.setItem('kd64_hintCoupons','2');
   let seed=646;Math.random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
  },code);
  await p.clock.install({time:new Date('2026-11-10T12:00:00Z')});await p.goto(base+'/index.html');await p.clock.fastForward(2500);if(await p.locator('.kdDailyClose').count())await p.locator('.kdDailyClose').click();
  const dir=path.join(out,locale);fs.mkdirSync(dir,{recursive:true});
  async function shot(name,route){
   await p.evaluate(()=>document.activeElement?.blur());await p.evaluate(()=>window.scrollTo(0,0));await p.evaluate(()=>document.fonts.ready);
   assert.equal(await p.locator('html').getAttribute('lang'),code);
   assert.equal(await p.locator('html').getAttribute('dir'),code==='ar'?'rtl':'ltr');
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),locale+'/'+name+' overflow');
   const filename=name+'.jpg',f=path.join(dir,filename);await p.screenshot({path:f,type:'jpeg',quality:96,animations:'disabled'});
   const bytes=fs.readFileSync(f);assert(bytes.length<8*1024*1024);
   entries.push({locale,language:code,file:locale+'/'+filename,route,width:1080,height:1920,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
  }
  await p.evaluate(()=>kdNavigate('home'));await shot('01-home','home');
  await p.evaluate(()=>{kdSelectLevel(17);kdNavigate('game');});
  for(let i=0;i<3;i++)await p.locator('#board>.tile').nth(1+i).click();await p.clock.runFor(7000);await p.evaluate(()=>kdSetPaused(true));await shot('02-gameplay','game');
  if(code==='tr')await p.locator('#board').screenshot({path:path.join(out,'actual-board.png'),animations:'disabled'});
  await p.evaluate(()=>kdNavigate('levels'));await shot('03-levels','levels');
  await p.evaluate(()=>{kdNavigate('home');kdOpenExtras('quests')});await shot('04-daily-quests','quests');await p.locator('#v9Close').click();
  await p.evaluate(()=>kdNavigate('shop'));await shot('05-shop','shop');
  await p.evaluate(()=>kdNavigate('workshop'));await p.locator('[data-workshop-start="energy-1"]').click();await shot('06-workshop','workshop');
  await context.close();console.log('Captured '+locale+': six actual game UI screens');
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(work,'feature.html'),`<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0;width:1024px;height:500px;overflow:hidden;background:#070909}body{position:relative;color:#f2d49a}.scene{position:absolute;inset:0;background:url('/assets/kara-dugum-menu.png') center 50%/cover;opacity:.36}.shade{position:absolute;inset:0;background:linear-gradient(90deg,#050707f5,#05070775 54%,#050707aa)}.brand{position:absolute;left:64px;top:112px;width:460px;font-family:Georgia,serif;text-shadow:0 3px 15px #000}.brand small{display:block;font:11px system-ui,sans-serif;letter-spacing:5px;color:#bba67d;margin-bottom:21px}.brand strong{display:block;font-size:70px;line-height:1.06;font-weight:400;letter-spacing:4px}.rule{margin-top:27px;display:flex;align-items:center;gap:15px;width:342px;color:#dbb86e}.rule:before,.rule:after{content:'';height:1px;background:linear-gradient(90deg,transparent,#b58f4b);flex:1}.rule:after{transform:rotate(180deg)}.board{position:absolute;right:48px;top:62px;width:376px;height:376px;object-fit:contain;border:1px solid #c39c55;box-shadow:0 18px 48px #000b;outline:1px solid #4b3a1d;outline-offset:7px}</style></head><body><div class="scene"></div><div class="shade"></div><div class="brand"><small>ORYNEXA GAMES</small><strong>KARA<br>DÜĞÜM</strong><div class="rule">◇</div></div><img class="board" src="/actual-board.png" alt=""></body></html>`);
 const feature=await browser.newPage({viewport:{width:1024,height:500},deviceScaleFactor:1});await feature.goto(base+'/feature.html');await feature.evaluate(()=>document.fonts.ready);await feature.screenshot({path:path.join(work,'feature.png')});await feature.close();
 convert([path.join(work,'feature.png'),'-alpha','off','-strip','PNG24:'+path.join(out,'feature-1024x500.png')]);
 fs.unlinkSync(path.join(out,'actual-board.png'));
 for(const [name,width,height,pngType] of [['icon-512.png',512,512,6],['feature-1024x500.png',1024,500,2]]){const buf=fs.readFileSync(path.join(out,name));assert.equal(buf.readUInt32BE(16),width);assert.equal(buf.readUInt32BE(20),height);assert.equal(buf[25],pngType);}
 fs.writeFileSync(path.join(out,'YUKLEME-REHBERI.txt'),`KARA DÜĞÜM ${version} / ${code} — Google Play mağaza görselleri\n\nUygulama simgesi: icon-512.png (512×512, 32 bit PNG).\nÖzellik grafiği: feature-1024x500.png (1024×500, 24 bit PNG).\nTelefon ekranları: seçtiğiniz mağaza dilinin klasöründeki 01–06 JPG dosyaları, sırayla. Her biri 1080×1920.\n\ntr-TR: Türkçe; en-US: İngilizce; ar: Arapça; zh-CN: Basitleştirilmiş Çince.\nVarsayılan Türkçe girişte eski simgeyi, özellik grafiğini ve eski telefon ekranlarını kaldırıp yenilerini yükleyin. Diğer mağaza dillerinde ilgili klasörü kullanın. YouTube tanıtım videonuz yoksa Video alanı boş kalabilir.\n\nGerçek oyun arayüzü, imzalı LIVE AAB içinden alınan dosyalarla oluşturuldu. Temsilî test ilerlemesi kullanıldı; gerçek oyuncu hesabı veya kaydına erişilmedi. Görsellere yeni oyun özelliği veya sahte reklam/ödül eklenmedi.\n`);
 fs.writeFileSync(path.join(out,'media-verification.json'),JSON.stringify({sourceVersion:version,versionCode:code,sourceCommit:process.env.GITHUB_SHA||null,sourceAabSha256:aabSha256,shared:[['icon-512.png',512,512,32],['feature-1024x500.png',1024,500,24]].map(([file,width,height,bitDepth])=>({file,width,height,bitDepth,bytes:fs.statSync(path.join(out,file)).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex')})),method:'Unmodified HTML/CSS/JS assets extracted from the signed LIVE AAB, rendered in Chromium. Isolated representative test profile; no real player/account data or live ads.',screenSize:'1080x1920',screenFormat:'JPEG RGB',screens:entries},null,2)+'\n');
 console.log('PASS: 24 actual screenshots, four locales/RTL, 1080x1920, each under 8 MiB; no page errors or horizontal overflow');
 }finally{await browser.close();server.close();fs.rmSync(work,{recursive:true,force:true});}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
