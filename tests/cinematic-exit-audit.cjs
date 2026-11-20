'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');

const root = path.resolve(process.env.KD_RUNTIME_ROOT || path.join(__dirname, '..'));
const out = process.env.KD_EXIT_REPORT || 'dist/cinematic-exit.json';
const report = {status: 'RUNNING', layouts: [], exits: [], undo: [], errors: []};
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript; charset=utf-8',
  '.png':'image/png','.webp':'image/webp'};
const server = http.createServer((request, response) => {
  const file = path.resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream'});
  fs.createReadStream(file).pipe(response);
});

async function fixture(browser) {
  const page = await browser.newPage({viewport:{width:390,height:844}, locale:'tr', timezoneId:'UTC'});
  page.on('pageerror', error => report.errors.push(String(error)));
  await page.addInitScript(() => {
    if (!localStorage.getItem('exitFixture')) {
      for (const [key,value] of Object.entries({
        exitFixture: '1', kd64_level: '300', kd64_completed: '{"1":3}', kd64_coins: '1200',
        kd64_hintCoupons: '5', kd64_shopTheme_emerald: 'true', kd64_shopActiveTheme: '"emerald"',
        kd64_dailyDate: '"2026-11-20"', kd6_lang: 'tr', kd3_sound: '0',
      })) localStorage.setItem(key,value);
    }
    window.exitCalls = 0;
    window.KaraNative = {finishGame() {window.exitCalls++;}};
  });
  await page.clock.install({time:new Date('2026-11-20T11:59:00Z')});
  await page.clock.pauseAt(new Date('2026-11-20T12:00:00Z'));
  await page.goto('http://127.0.0.1:' + server.address().port + '/index.html');
  await page.clock.runFor(2600);
  return page;
}

const dialog = page => page.locator('.kdExitDialog');
const back = page => page.evaluate(()=>kdHandleBack());
const calls = page => page.evaluate(()=>exitCalls);
const wallet = page => page.evaluate(()=>Object.fromEntries([
  'kd64_coins','kd64_hintCoupons','kd64_completed','kd64_shopActiveTheme','kd64_shopTheme_emerald','kd6_lang',
].map(key=>[key,localStorage.getItem(key)])));
const board = page => page.evaluate(()=>({tiles:kdLessonPreview().before,moves:kdGetLearningState().moves,
  level:kdGetLearningState().level,undos:kdGetLearningState().undos}));
const enter = page => page.evaluate(()=>{kdNavigate('game');kdOnboarding.leave();kdLearning.leave();kdSetPaused(true);});

async function choices(browser) {
  const page = await fixture(browser);
  const before = await wallet(page);
  for (const [name, action] of [
    ['second Back',()=>back(page)],
    ['cancel',()=>page.locator('[data-exit-cancel]').click()],
    ['X',()=>page.locator('.kdExitClose').click()],
    ['Escape',()=>page.keyboard.press('Escape')],
    ['backdrop',()=>page.mouse.click(1,1)],
  ]) {
    assert.equal(await back(page),true);
    assert(await dialog(page).isVisible());
    assert(await page.locator('[data-exit-cancel]').evaluate(button=>button===document.activeElement));
    await action();
    assert.equal(await dialog(page).count(),0);
    assert.equal(await calls(page),0);
    assert.deepEqual(await wallet(page),before);
    report.exits.push(name);
  }
  await enter(page);
  assert.equal(await back(page),true);
  assert(await page.locator('.kdExactHome').isVisible());
  assert.equal(await dialog(page).count(),0);
  await page.evaluate(()=>{kdNavigate('shop');document.querySelector('[data-shop-theme=ruby]').click();});
  assert(await page.locator('.kdThemePurchase').isVisible());
  assert.equal(await back(page),true);
  assert.equal(await page.locator('.kdThemePurchase').count(),0);
  assert.equal(await dialog(page).count(),0);
  assert.equal(await back(page),true);
  assert(await page.locator('.kdExactHome').isVisible());
  assert.equal(await dialog(page).count(),0);

  await back(page);
  await page.evaluate(()=>window.KaraNative.saveExitUndo=()=>false);
  // Create actual undo history so failure occurs while storing the exit checkpoint.
  await page.evaluate(()=>{kdSelectLevel(6);kdNavigate('game');kdOnboarding.leave();kdLearning.leave();document.querySelector('#board .tile:not(.good)').click();kdNavigate('home');});
  await back(page);
  await page.locator('[data-exit-confirm]').click();
  assert.equal(await calls(page),0);
  assert.match(await page.locator('.kdExitSaveStatus').textContent(),/kaydedilemedi/);
  assert(await dialog(page).isVisible());
  await page.evaluate(()=>delete window.KaraNative.saveExitUndo);
  await page.locator('[data-exit-confirm]').click();
  assert.equal(await calls(page),1);
  assert.deepEqual(await wallet(page),before);
  report.exits.push('retry after save failure');
  await page.close();
}

async function allLocales(browser) {
  const page = await fixture(browser);
  const codes=await page.evaluate(()=>Object.keys(kdLocalization.languages));
  assert.equal(codes.length,25);
  const sizes=[{width:244,height:433},{width:320,height:568},{width:390,height:844},
    {width:568,height:320},{width:540,height:1080}];
  for (const code of codes) {
    await page.evaluate(()=>kdNavigate('settings'));
    await page.locator('#kdLangSelect').selectOption(code);
    await page.evaluate(()=>kdNavigate('home'));
    await back(page);
    const expect=await page.evaluate(()=>['Oyundan çıkmak istiyor musun?','VAZGEÇ','ÇIKIŞ','Kapat'].map(key=>kdTranslate(key)));
    assert.deepEqual(await dialog(page).evaluate(d=>{
      const pick=s=>d.querySelector(s);
      return [pick('#kdExitMessage').textContent,pick('[data-exit-cancel]').textContent,
        pick('[data-exit-confirm]').textContent,pick('.kdExitClose').getAttribute('aria-label')];
    }),expect,code);
    assert.equal(await page.locator('#kdExitTitle').textContent(),'KARA DÜĞÜM');
    for (const size of sizes) {
      await page.setViewportSize(size);
      const geometry = await dialog(page).evaluate(d=>{
        const rect=d.getBoundingClientRect(),cancel=d.querySelector('[data-exit-cancel]').getBoundingClientRect(),
          confirm=d.querySelector('[data-exit-confirm]').getBoundingClientRect();
        const wholeWords=[...d.querySelectorAll('.kdExitActions span')].every(label=>{
          const node=label.firstChild;
          return [...node.textContent.matchAll(/\S+/gu)].every(word=>{
            const range=document.createRange();
            range.setStart(node,word.index);
            range.setEnd(node,word.index+word[0].length);
            return range.getClientRects().length===1;
          });
        });
        return {dir:getComputedStyle(d).direction,leftCancel:cancel.x<confirm.x,
          usable:rect.left>=0&&rect.right<=innerWidth+1&&rect.top>=0&&rect.bottom<=innerHeight+1&&
            [...d.querySelectorAll('button')].every(b=>{const r=b.getBoundingClientRect();return r.height>=44&&r.bottom<=innerHeight+1;}),
          overflow:d.scrollWidth>d.clientWidth+1||[...d.querySelectorAll('h2,p,button')].filter(x=>!x.hidden).some(x=>x.scrollWidth>x.clientWidth+1),
          menuArt:getComputedStyle(d.querySelector('.kdExitHero')).backgroundImage.includes('kara-dugum-menu.png'),wholeWords};
      });
      assert.deepEqual(geometry,{dir:['ar','fa','ur'].includes(code)?'rtl':'ltr',leftCancel:true,usable:true,
        overflow:false,menuArt:true,wholeWords:true},code+' '+size.width);
      report.layouts.push({code,...size});
    }
    await page.locator('[data-exit-cancel]').click();
  }
  await page.close();
}

async function reopenWithUndo(browser) {
  for (const {level, account, daily} of [{level:6},{level:151,account:true},{level:12,daily:true}]) {
    const page = await fixture(browser);
    if (account) await page.evaluate(()=>kdCloud.activate('cinematic-exit-test-owner'));
    const openBoard = () => daily ? page.evaluate(()=>{
      kdStartDaily({date:'2026-11-20',seed:12731,template:12});
      kdNavigate('game');kdOnboarding.leave();kdLearning.leave();kdSetPaused(true);
    }) : enter(page);
    if (!daily) await page.evaluate(level=>kdSelectLevel(level),level);
    await openBoard();
    const gameBefore = await board(page);
    const beforeWallet = await wallet(page);
    await page.locator('#board .tile:not(.good)').first().click();
    await page.clock.runFor(180);
    const saved = await board(page);
    assert.notDeepEqual(saved,gameBefore);
    assert.equal(await back(page),true);
    await back(page);
    await page.locator('[data-exit-confirm]').click();
    assert.equal(await calls(page),1);
    if(account) await page.evaluate(()=>kdCloud.exportFull());
    await page.reload();
    await page.clock.runFor(2600);
    await openBoard();
    assert.deepEqual(await board(page),saved);
    assert.deepEqual(await wallet(page),beforeWallet);
    await page.locator('#undo').click();
    assert.deepEqual(await board(page),{...gameBefore,undos:gameBefore.undos+1});
    assert.deepEqual(await wallet(page),beforeWallet);
    report.undo.push({level,account:!!account,daily:!!daily,confirmed:true,boardMatches:true,undoReplayed:true});
    await page.close();
  }
}

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
  try {
    await choices(browser);
    await allLocales(browser);
    await reopenWithUndo(browser);
    assert.deepEqual(report.errors,[]);
    report.status='PASS';
    console.log(`PASS: ${report.layouts.length} localized exit layouts, close and confirm routes, save failure, board and undo restored on reopen`);
  }finally {
    fs.mkdirSync(path.dirname(out),{recursive:true});
    fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
    await browser.close();
    server.close();
  }
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
