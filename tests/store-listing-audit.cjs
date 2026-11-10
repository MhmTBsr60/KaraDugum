'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../store-listings');
const checklist=JSON.parse(fs.readFileSync(path.join(root,'release-checklist.json'),'utf8'));
assert.deepEqual(checklist.listingLocales,['tr-TR','en-US','ar','zh-CN']);
const descriptions=new Set();
for(const locale of checklist.listingLocales){
 for(const [name,max,min] of [['title',30,5],['short-description',80,15],['full-description',4000,200],['release-notes',500,25]]){
  const text=fs.readFileSync(path.join(root,locale,name+'.txt'),'utf8').trim();
  const length=[...text].length;
  assert(length>=min&&length<=max,`${locale}/${name}: ${length} characters (limit ${max})`);
  assert(!/TODO|PLACEHOLDER|\{\d+\}|<script/i.test(text),`${locale}/${name}: unfinished content`);
  if(name==='full-description'){
   assert(text.includes('300'),`${locale}: existing level count`);
   assert(text.includes('vorynexagames@gmail.com'),`${locale}: support contact`);
   assert(!descriptions.has(text),`${locale}: untranslated full description`);descriptions.add(text);
  }
 }
}
assert.equal(checklist.release.applicationId,'com.orynexa.karadugum');
assert(checklist.operatorActions.some(task=>task.area==='Target audience / Families'&&task.status==='children-restricted-rewarded'),'Confirmed children require the restricted rewarded-ad audience behavior');
console.log('PASS: four Play listing locales, title/short/full/release-note limits, real localized content and explicit unresolved operator declarations');
