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
