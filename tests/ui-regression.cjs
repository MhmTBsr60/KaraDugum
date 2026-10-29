// Regression checks for menu, navigation, assets and Android packaging.
const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const workflow=fs.readFileSync('.github/workflows/android-apk.yml','utf8');
const check=(condition,message)=>assert(condition,message);
check(fs.existsSync('assets/kara-dugum-menu.png'),'Main menu image missing');
check(html.includes('src="assets/kara-dugum-menu.png"'),'Menu image path mismatch');
check(workflow.includes('cp assets/kara-dugum-menu.png app/src/main/assets/assets/kara-dugum-menu.png'),'APK does not package menu image');
for(const route of ['game','levels','profile','settings','shop']){
 check(html.includes('data-go="'+route+'"'),'Missing navigation: '+route);
}
check(html.includes('function go(next)'),'Navigation function missing');
check(html.includes('window.kdSelectLevel'),'Level selection missing');
check(html.includes("if(page==='shop')html="),'Shop screen missing');
check(html.includes("if(page==='levels')"),'Level screen missing');
check(html.includes('id="hint"'),'Hint button missing');
check(html.includes('id="board"'),'Game board missing');
console.log('PASS: menu image, APK packaging, navigation and game controls');

check(fs.existsSync('wheel.js'),'Wheel script missing');
check(html.includes('src="wheel.js"'),'Wheel script not loaded');
check(workflow.includes('cp wheel.js app/src/main/assets/wheel.js'),'APK does not package wheel script');

check(html.includes('href="screens.css"'),'Collection styles not loaded');
check(workflow.includes('cp screens.css app/src/main/assets/screens.css'),'APK does not package collection styles');
check(workflow.includes('cp assets/kara-dugum-treasury.webp app/src/main/assets/assets/kara-dugum-treasury.webp'),'APK does not package hero artwork');

check(html.includes('href="reference.css"'),'Reference screen styles not loaded');
check(workflow.includes('cp reference.css app/src/main/assets/reference.css'),'APK does not package reference screen styles');
check(workflow.includes('cp assets/kara-dugum-reference.png app/src/main/assets/assets/kara-dugum-reference.png'),'APK does not package approved reference artwork');

check(workflow.includes('cp assets/kara-dugum-expansion.webp app/src/main/assets/assets/kara-dugum-expansion.webp'),'APK does not package wheel and new theme art');

check(html.includes('src="localization.js"'),'Localization script missing');
check(workflow.includes('cp localization.js app/src/main/assets/localization.js'),'APK localization script missing');

for(const file of ['theme-renderer.js','theme-skins.css'])check(workflow.includes('cp '+file+' app/src/main/assets/'+file),'APK missing '+file);
for(const file of ['kara-dugum-theme-scenes.webp','kara-dugum-theme-stones.webp'])check(workflow.includes('cp assets/'+file+' app/src/main/assets/assets/'+file),'APK missing '+file);

check(html.includes('href="home-icons.css"'),'Premium navigation styles missing');
check(workflow.includes('cp home-icons.css app/src/main/assets/home-icons.css'),'APK missing navigation styles');
check(workflow.includes('cp assets/kara-dugum-home-icons.webp app/src/main/assets/assets/kara-dugum-home-icons.webp'),'APK missing navigation artwork');

for(const file of ['board-renderer.js','reward-receipts.js','modern-panels.css'])check(workflow.includes('cp '+file+' app/src/main/assets/'+file),'APK missing '+file);

for(const file of ['learning.js','learning.css']){assert(html.includes(file),file+' must be loaded');assert(workflow.includes('cp '+file+' app/src/main/assets/'+file),file+' must be packaged');}

for(const file of ['daily-challenge.js','daily-challenge.css']){check(html.includes(file),file+' not loaded');check(workflow.includes('cp '+file+' app/src/main/assets/'+file),file+' not packaged');}
