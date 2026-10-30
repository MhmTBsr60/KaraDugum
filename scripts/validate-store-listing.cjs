'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'store-listing','6.36');
const read=p=>fs.readFileSync(path.join(folder,p),'utf8');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(read('screenshots-manifest.json'));
assert.equal(manifest.version,'6.36');assert.equal(manifest.versionCode,96);
assert.equal(manifest.indexSha256,sha(fs.readFileSync(path.join(root,'index.html'))),'Game source differs from captured release');
function jpegSize(b){
 assert.equal(b.readUInt16BE(0),0xffd8,'Expected JPEG');let i=2;
 while(i<b.length){assert.equal(b[i++],255);while(b[i]===255)i++;const marker=b[i++];if(marker===0xd9||marker===0xda)break;
 if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
 const n=b.readUInt16BE(i);assert(n>=2&&i+n<=b.length);
 if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))return {width:b.readUInt16BE(i+5),height:b.readUInt16BE(i+3)};
 i+=n;
 }throw Error('JPEG dimensions unavailable');
}
const counts={};assert.equal(manifest.files.length,16);assert.equal(new Set(manifest.files.map(f=>f.path)).size,16);
for(const locale of ['tr-TR','en-US']){
 counts[locale]={};
 for(const [name,limit]of [['title',30],['short_description',80],['full_description',4000]]){
  const text=read(`${locale}/${name}.txt`),count=[...text].length;assert(text.trim());assert(count<=limit,`${locale}/${name}: ${count}/${limit}`);counts[locale][name]={characters:count,limit};
 }
 const files=manifest.files.filter(f=>f.locale===locale);assert.equal(files.length,8);assert.deepEqual(files.map(f=>f.order),[1,2,3,4,5,6,7,8]);
 for(const f of files){assert(f.path.startsWith(`${locale}/images/phoneScreenshots/`)&&!f.path.includes('..'));const bytes=fs.readFileSync(path.join(folder,f.path)),size=jpegSize(bytes);assert.equal(sha(bytes),f.sha256,f.path);assert.deepEqual(size,{width:1080,height:1920});assert.equal(size.width,f.width);assert.equal(size.height,f.height);assert(Math.min(size.width,size.height)>=320&&Math.max(size.width,size.height)<=3840);assert(Math.max(size.width,size.height)<=2*Math.min(size.width,size.height));}
}
for(const name of ['geri-bildirimler.csv','rapor-sablonu.csv','yayin-durumu.csv','testci-mesaji.txt','kullanim.txt'])assert(read('feedback/'+name).trim());
assert(read('feedback/yayin-durumu.csv').includes('AdMob paneline doğrudan erişimle doğrulanmadı'));
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sections=['tr-TR','en-US'].map(locale=>`<section><h2>${locale}</h2>${['title','short_description','full_description'].map(name=>`<h3>${name} · ${counts[locale][name].characters}/${counts[locale][name].limit}</h3><pre>${esc(read(`${locale}/${name}.txt`))}</pre>`).join('')}<div class="gallery">${manifest.files.filter(f=>f.locale===locale).map(f=>`<figure><a href="${f.path}"><img loading="lazy" width="1080" height="1920" src="${f.path}" alt="${esc(f.caption)}"></a><figcaption>${f.order}. ${esc(f.caption)}</figcaption></figure>`).join('')}</div></section>`).join('');
fs.writeFileSync(path.join(folder,'preview.html'),`<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>KARA DÜĞÜM · Mağaza önizlemesi</title><style>body{margin:24px auto;padding:0 20px;max-width:1200px;background:#0b0d0e;color:#eee3c9;font:16px system-ui}h1,h2,h3{color:#e1bd72}pre{white-space:pre-wrap;font:inherit;line-height:1.6;background:#181b1b;padding:18px;border-radius:12px}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px}figure{margin:0}img{width:100%;height:auto;border-radius:12px}figcaption{padding:10px}section{margin:45px 0}</style><h1>KARA DÜĞÜM · 6.36</h1><p>Google Play için metinler ve 16 telefon görüntüsü. Görseller aynı oyun arayüzünün mobil Chromium görünümünden, örnek yerel kayıtla alındı; gerçek telefon veya testçi kaydı değildir. Play Console’a yüklenmedi.</p><p><a href="YUKLEME-REHBERI.txt">Yükleme rehberi</a> · <a href="feedback/testci-mesaji.txt">Testçi mesajı</a></p>${sections}</html>\n`);
fs.writeFileSync(path.join(folder,'validation.json'),JSON.stringify({version:manifest.version,appSourceCommit:manifest.appSourceCommit,text:counts,images:{count:16,width:1080,height:1920,format:'JPEG',sha256:'All matched'},scope:'Store package only; no new game test run or Play Console upload'},null,2)+'\n');
console.log(JSON.stringify({text:counts,images:'16 JPEGs checked, hashes matched',gameSource:'Unchanged captured index SHA-256'},null,2));
