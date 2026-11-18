/* Brand regression. Full replacement light architecture is tested by poco-runtime-audit + Android. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const repo=path.resolve(__dirname,'..'),root=path.resolve(process.argv[2]||repo),read=f=>fs.readFileSync(path.join(root,f),'utf8'),before=f=>execFileSync('git',['show','d8985fd:'+f],{cwd:repo,encoding:'utf8'});
require('./ux-protected-core.cjs').check(read('index.html'));
for(const f of ['feedback.js','onboarding.js','onboarding.css','cloud-model.js','cloud-sync.js','reward-receipts.js','board-renderer.js','theme-renderer.js','gameplay-ui.js','gameplay-layout.css'])assert.equal(read(f),before(f),'Protected runtime changed: '+f);
for(const f of ['HapticFeedbackPlayer.java','UiFeedbackGate.java','AndroidManifest.xml','admob-units.json'])assert.equal(fs.readFileSync(path.join(repo,f),'utf8'),before(f),'Native audio/identity/ads changed: '+f);
for(const f of ['index.html','localization.js','privacy-policy.html','delete-account.html']){
 const s=read(f);assert(!/(?<![A-Za-z])orynexa(?![A-Za-z])/i.test(s.replace(/com\.orynexa\.karadugum/g,'')),f);
 const links=s=>s.match(/(?:https?:\/\/|mailto:)[^\s"'<>]+/g)||[];assert.deepEqual(links(s),links(before(f)));
 const keys=s=>s.match(/\bkd\d*_[A-Za-z0-9_]+/g)||[];assert.deepEqual(keys(s),keys(before(f)));
}
const html=read('index.html');assert(html.includes('>VORY<span'));assert(html.includes('VORYNEXA GAMES açılış ekranı'));assert(html.includes('VORYNEXA OYUNCUSU'));assert(html.includes('src="light-feedback.js"'));assert(html.includes('href="light-feedback.css"'));
console.log('PASS: VORYNEXA preserved; game, saves, tutorial, sound/haptics, package and URLs protected. New native light architecture covered by poco-runtime-audit and real Android instrumentation.');
