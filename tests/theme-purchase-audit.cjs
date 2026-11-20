'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');

const root = path.resolve(process.env.KD_RUNTIME_ROOT || path.join(__dirname, '..'));
const out = process.env.KD_THEME_REPORT || 'dist/theme-purchase-report.json';
const purchase = '.kdThemePurchase';
const confirm = '[data-theme-confirm]';
const cancel = '[data-theme-cancel]';
const prices = {ice: 150, fire: 200, shadow: 250, emerald: 900, ruby: 1200};
const report = {status: 'RUNNING', prices, layouts: [], faults: [], decisions: [], errors: []};
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css',
  '.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server = http.createServer((request, response) => {
  const file = path.resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream'});
  fs.createReadStream(file).pipe(response);
});

async function newPage(browser, balance=1500) {
  const page = await browser.newPage({viewport:{width:390,height:844}, locale:'tr', timezoneId:'UTC'});
  page.on('pageerror', error => report.errors.push(String(error)));
  await page.addInitScript(balance => {
    const get = Storage.prototype.getItem, set = Storage.prototype.setItem, remove = Storage.prototype.removeItem;
    const write = (key, value) => set.call(localStorage, key, JSON.stringify(value));
    if (get.call(localStorage, 'themePurchaseFixture') === null) {
      write('themePurchaseFixture', true);
      write('kd64_coins', balance);
      write('kd64_hintCoupons', 7);
      write('kd64_level', 6);
      write('kd64_completed', {1:3});
      write('kd64_dailyDate', '2026-11-20');
    }
    window.purchaseRaw = keys => Object.fromEntries(keys.map(key => [key,JSON.parse(get.call(localStorage,key))]));
    window.purchaseFixtureOnLoad = !!get.call(localStorage,'themePurchaseFixture');
    Storage.prototype.setItem = function (key, value) {
      if (this === localStorage && key === window.purchaseWriteFault) throw new DOMException('Fixture write failed','QuotaExceededError');
      return set.call(this, key, value);
    };
    Storage.prototype.removeItem = function (key) {
      if (this === localStorage && key === window.purchaseRemoveFault) throw new DOMException('Fixture remove failed','QuotaExceededError');
      return remove.call(this, key);
    };
  }, balance);
  await page.clock.install({time:new Date('2026-11-20T11:59:00Z')});
  await page.clock.pauseAt(new Date('2026-11-20T12:00:00Z'));
  await page.goto('http://127.0.0.1:' + server.address().port + '/index.html');
  await page.clock.runFor(2600);
  await shop(page);
  return page;
}

const shop = page => page.evaluate(() => kdNavigate('shop'));
const theme = (page,id) => page.locator(`[data-shop-theme="${id}"]`);
const snapshot = (page,id='emerald') => page.evaluate(id => purchaseRaw([
  'kd64_coins', 'kd64_shopTheme_'+id, 'kd64_shopActiveTheme', 'kd64_hintCoupons', 'kd64_level',
  'kd64_completed', 'kdCloud_guestReward',
]), id);
const reload = async page => {
  await page.reload();
  await page.clock.runFor(2600);
  await shop(page);
};
const closed = async page => assert.equal(await page.locator(purchase).count(),0);
const still = async (page, before, id) => assert.deepEqual(await snapshot(page,id),before);
const account = async (page, name) => page.evaluate(name => {
  kdCloud.activate(name);
  kdCloud.receive(KdCloudModel.merge(null,kdCloud.exportFull()));
  kdNavigate('shop');
}, name);

async function choices(browser) {
  const page = await newPage(browser, 3000);
  const before = await snapshot(page);
  await page.evaluate(()=>{const card=document.querySelector('[data-shop-theme=emerald]');card.click();card.click();});
  assert.equal(await page.locator(purchase).count(),1);
  await still(page,before);
  await page.locator(cancel).click();
  const exits = [
    ['cancel',()=>page.locator(cancel).click()],
    ['Android bridge back',()=>page.evaluate(()=>kdHandleBack())],
    ['close',()=>page.locator('.kdThemePurchaseClose').click()],
    ['escape',()=>page.keyboard.press('Escape')],
    ['backdrop',()=>page.mouse.click(2,2)],
  ];
  for (const [name, exit] of exits) {
    await theme(page,'emerald').click();
    assert(await page.locator(purchase).isVisible());
    assert.equal(await page.locator('[data-purchase-price]').textContent(),'900');
    assert.equal(await page.locator('[data-purchase-balance]').textContent(),'3.000');
    assert.equal(await page.locator('.kdThemePurchaseName').textContent(),'ZÜMRÜT MABEDİ');
    assert(await page.locator(cancel).evaluate(e=>e===document.activeElement));
    await still(page,before);
    await exit();
    await closed(page);
    await still(page,before);
    report.decisions.push(name);
  }
  await theme(page,'emerald').click();
  await reload(page);
  await closed(page);
  await still(page,before);
  report.decisions.push('process reload with open confirmation');
  for (const [id,price] of Object.entries(prices)) {
    const prior=await snapshot(page,id);
    await theme(page,id).click();
    await still(page,prior,id);
    assert.equal(await page.locator('[data-purchase-price]').textContent(),Intl.NumberFormat('tr').format(price));
    await page.evaluate(()=>{const button=document.querySelector('[data-theme-confirm]');button.click();button.click();});
    await closed(page);
    const paid=await snapshot(page,id);
    assert.deepEqual(paid,{...prior,kd64_coins:prior.kd64_coins-price,['kd64_shopTheme_'+id]:true,kd64_shopActiveTheme:id});
    await theme(page,'gold').click();
    await theme(page,id).click();
    await closed(page);
    await still(page,paid,id);
  }
  await page.close();

  const profile = await newPage(browser);
  await profile.evaluate(()=>kdNavigate('profile'));
  await profile.locator('[data-profile-tab="themes"]').click();
  await theme(profile,'emerald').click();
  await profile.locator(confirm).click();
  assert.equal((await snapshot(profile)).kd64_coins,600);
  await profile.close();
}

async function layouts(browser) {
  const page = await newPage(browser,33);
  const languages = await page.evaluate(()=>Object.keys(kdLocalization.languages));
  assert.equal(languages.length,25);
  const requested = ['Tema satın al','Fiyat','Mevcut bakiye','VAZGEÇ','SATIN AL','Kapat',
    'Bu tema için yeterli kristalin yok.','Satın alma için önce bulut kaydını eşitle.',
    'Satın alma kaydı tamamlanamadı. Tekrar dene.'];
  for (const code of languages) {
    await page.evaluate(()=>kdNavigate('settings'));
    await page.locator('#kdLangSelect').selectOption(code);
    await shop(page);
    await theme(page,'emerald').click();
    assert(await page.locator(confirm).isDisabled());
    const texts=await page.locator(purchase).evaluate(dialog => {
      const value=selector=>dialog.querySelector(selector).textContent.trim();
      return [value('h2'),value('dt'),dialog.querySelectorAll('dt')[1].textContent,
        value('[data-theme-cancel]'),value('[data-theme-confirm]'),
        dialog.querySelector('.kdThemePurchaseClose').getAttribute('aria-label'),
        value('.kdThemePurchaseStatus')];
    });
    const expected = await page.evaluate(keys=>{
      const code=kdLocalization.language(),dictionary=kdLocalization.dictionaries[code];
      if(code!=='tr'&&keys.some(key=>!Object.hasOwn(dictionary,key)||!dictionary[key]))throw Error('Missing theme purchase translation: '+code);
      return keys.map(key=>kdTranslate(key));
    },requested);
    assert.deepEqual(texts,expected.slice(0,7),code);
    for (const size of [{width:320,height:568},{width:390,height:844},{width:568,height:320}]) {
      await page.setViewportSize(size);
      const layout=await page.locator(purchase).evaluate(dialog=>{
        const rect=dialog.getBoundingClientRect();
        const bounds=[...dialog.querySelectorAll('button')].map(button=>button.getBoundingClientRect());
        return {direction:getComputedStyle(dialog).direction,horizontal:dialog.scrollWidth>dialog.clientWidth+1,
          visible:rect.left>=0&&rect.right<=innerWidth+1&&rect.top>=0&&rect.bottom<=innerHeight+1,
          touch:bounds.every(button=>button.height>=44)};
      });
      assert.deepEqual(layout,{direction:['ar','fa','ur'].includes(code)?'rtl':'ltr',horizontal:false,visible:true,touch:true},code+' '+size.width);
      report.layouts.push({code,...size});
    }
    await page.locator(cancel).click();
    assert.equal((await snapshot(page)).kd64_coins,33);
  }
  await page.close();
}

async function interrupted(browser) {
  const cases = [
    ['guest','kdCloud_guestReward',false],
    ['guest','kd64_coins',true],
    ['guest','kd64_shopTheme_emerald',true],
    ['guest','remove:kdCloud_guestReward',true],
    ['account','kdCloud_ops_theme-fixture',false],
    ['account','kd64_coins',true],
    ['account','kd64_shopTheme_emerald',true],
    ['account','kd64_v9_emerald',true],
  ];
  for (const [mode,key,prepared] of cases) {
    const page=await newPage(browser);
    if (mode==='account') await account(page,'theme-fixture');
    await theme(page,'emerald').click();
    await page.evaluate(key=>{
      if(key.startsWith('remove:'))window.purchaseRemoveFault=key.slice(7);
      else window.purchaseWriteFault=key;
    },key);
    await page.locator(confirm).click();
    assert(await page.locator('.kdThemePurchaseStatus').isVisible());
    const journal=mode==='guest'?'kdCloud_guestReward':'kdCloud_ops_theme-fixture';
    assert.equal(await page.evaluate(key=>!!purchaseRaw([key])[key],journal),prepared,key);
    await reload(page);
    assert(await page.evaluate(()=>purchaseFixtureOnLoad));
    const recovered=await snapshot(page);
    assert.equal(recovered.kd64_coins,prepared?600:1500,key);
    assert.equal(recovered.kd64_shopTheme_emerald||false,prepared,key);
    assert.equal(recovered.kdCloud_guestReward,null);
    await theme(page,'emerald').click();
    if(prepared) await closed(page);
    else await page.locator(confirm).click();
    const result=await snapshot(page);
    assert.equal(result.kd64_coins,600,key);
    assert.equal(result.kd64_shopTheme_emerald,true,key);
    assert.equal(result.kd64_hintCoupons,7,key);
    assert.deepEqual(result.kd64_completed,{1:3},key);
    report.faults.push({mode,key,prepared,balance:600,owned:true});
    await page.close();
  }

  const retry=await newPage(browser);
  await account(retry,'theme-retry');
  await theme(retry,'emerald').click();
  await retry.evaluate(()=>window.purchaseWriteFault='kd64_shopTheme_emerald');
  await retry.locator(confirm).click();
  await retry.evaluate(()=>delete window.purchaseWriteFault);
  await retry.locator(confirm).click();
  await closed(retry);
  const repaired=await snapshot(retry);
  assert.equal(repaired.kd64_coins,600);
  assert.equal(repaired.kd64_shopTheme_emerald,true);
  assert.equal(await retry.evaluate(()=>Object.values(kdCloud.model().ops).filter(op=>op.theme==='emerald').length),1);
  report.liveAccountRetryPass=true;
  await retry.close();

  const page=await newPage(browser);
  await account(page,'first-owner');
  await theme(page,'emerald').click();
  const oldButton=await page.locator(confirm).elementHandle();
  await page.evaluate(()=>kdCloud.activate('other-owner'));
  await closed(page);
  const switched=await snapshot(page);
  await oldButton.evaluate(button=>button.click());
  await still(page,switched);
  await page.close();
}

async function simultaneousAccount(browser) {
  const [first, second] = await Promise.all([newPage(browser),newPage(browser)]);
  await account(first,'shared-theme-account');
  const before=await first.evaluate(()=>kdCloud.exportFull());
  await second.evaluate(before=>{
    kdCloud.activate('shared-theme-account');
    kdCloud.receive(before);
    kdNavigate('shop');
  },before);
  await Promise.all([first,second].map(async page=>{
    await theme(page,'emerald').click();
    await page.locator(confirm).click();
  }));
  const copies=await Promise.all([first,second].map(page=>page.evaluate(()=>kdCloud.exportFull())));
  const merged=await first.evaluate(([a,b])=>KdCloudModel.merge(a,b),copies);
  for (const page of [first,second]) {
    for(let i=0;i<3;i++)await page.evaluate(merged=>kdCloud.receive(merged),merged);
    const current=await snapshot(page);
    assert.equal(current.kd64_coins,600);
    assert.equal(current.kd64_shopTheme_emerald,true);
    await page.close();
  }
  report.sharedAccountReplayPass=true;
}

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
  try {
    await choices(browser);
    await layouts(browser);
    await interrupted(browser);
    await simultaneousAccount(browser);
    assert.deepEqual(report.errors,[]);
    report.status='PASS';
    console.log(`PASS: 5 paid themes, 6 uncharged exit scenarios, ${report.layouts.length} locale layouts, ${report.faults.length} interrupted writes and concurrent cloud receipt replay`);
  }finally {
    fs.mkdirSync(path.dirname(out),{recursive:true});
    fs.writeFileSync(out,JSON.stringify(report,null,2));
    await browser.close();
    server.close();
  }
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
