'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const {theme} = require('./energy-wave-harness.cjs');
const L = require('./locale-visual-harness.cjs');

// These are device-language fallback probes. The shipped language selector owns
// the list of localized languages; adding a probe does not add a translation.
const fallbackInputs = ['it', 'nl', 'pl', 'uk', 'th', 'ms', 'ro', 'el', 'he', 'sv', 'da', 'fi', 'no', 'cs', 'hu', 'sk', 'bg'];
const url = process.env.KD_LOCALE_URL || 'http://127.0.0.1:8766/index.html';
const out = process.env.KD_LOCALE_OUT || 'dist/locale-visual';
const size = {width: 390, height: 844};
fs.mkdirSync(out, {recursive: true});

async function main() {
  const report = {viewport: size, level: 6, fixedThemeForScreenshots: 'gold', localized: [],
    checks: [], reopen: [], fallback: [], panels: [], motion: [], errors: [], status: 'RUNNING'};
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox']});
  const newPage = async (locale) => {
    const page = await browser.newPage({viewport: size, locale});
    page.on('pageerror', error => report.errors.push(String(error)));
    return page;
  };
  const screenshot = (page, filename) => page.screenshot({path: path.join(out, filename + '.png')});

  try {
    const page = await newPage('tr-TR');
    await L.openGame(page, url);
    const codes = await page.evaluate(() => Object.keys(kdLocalization.languages));
    report.localized = codes;
    assert.equal(codes.length, 25);
    assert(fallbackInputs.every(code => !codes.includes(code)));
    const treasureArt = await L.treasure(page);
    await L.prime(page);
    const panels = await L.menus(page);

    for (const id of L.themes) {
      await L.choose(page, 'tr');
      await theme(page, id);
      const original = await L.savedGame(page), art = await L.boardAppearance(page);
      assert.equal(art.theme, id);
      assert.equal(art.physicalOrder, true);
      assert.equal(art.pipes.length, 16);
      assert(art.energy.enabled && art.energy.drawn && art.energy.edges.length > 0);
      assert.deepEqual(art.toolbar, ['hint', 'undo', 'restart', 'new']);

      for (const code of codes) {
        await L.choose(page, code);
        assert.deepEqual(await L.savedGame(page), original, code + '/' + id + ': language changed the save');
        assert.deepEqual(await L.boardAppearance(page), art, code + '/' + id + ': language changed the artwork or orientation');
        report.checks.push({code, theme: id, ports: art.energy.ports, connectionCount: art.energy.edges.length});
        if (id === 'gold') {
          await screenshot(page, 'oyun-' + code);
          const currentPanels = await L.menus(page);
          assert.deepEqual(currentPanels.art, panels.art, code + ': changed reward/menu illustration');
          assert.equal(currentPanels.shopText.maskVisible, code !== 'tr', code + ': incorrect shop text replacement');
          assert.equal(currentPanels.shopText.value,
            await page.evaluate(() => kdTranslate('Özel ipucu sandığı. Bulmacalarda yolunu aydınlat.')), code + ': incorrect shop text');
          await L.checkReload(page, code, original, art);
          report.panels.push({code, scenes: Object.keys(currentPanels.art), localizedShopCaption: currentPanels.shopText.maskVisible});
          report.reopen.push(code);
        }
      }
      console.log('Finished board, save and connection comparison:', id, codes.length);
    }

    // Undo uses an in-memory stack. A real locale change must preserve it.
    await L.choose(page, 'tr');
    await L.prime(page);
    const beforeUndo = await L.savedGame(page);
    await L.choose(page, 'ar');
    await page.locator('#undo').click();
    const afterUndo = await L.savedGame(page);
    assert.equal(afterUndo.undos, beforeUndo.undos + 1);
    assert.notDeepEqual(afterUndo.current, beforeUndo.current);
    report.liveUndoPreserved = true;
    await page.close();

    let englishSignature;
    for (const code of [...codes, ...fallbackInputs]) {
      const sample = await newPage(code);
      await L.openGame(sample, url, {deviceLocale: code});
      const expected = codes.includes(code) ? code : 'en';
      assert.equal(await sample.locator('html').getAttribute('lang'), expected);
      assert.equal(await sample.locator('html').getAttribute('dir'), L.rtl.includes(expected) ? 'rtl' : 'ltr');
      assert.deepEqual(await L.treasure(sample), treasureArt, code + ': altered treasure art');
      if (code === 'en' || fallbackInputs.includes(code)) {
        await L.prime(sample);
        const signature = await L.boardAppearance(sample);
        if (code === 'en') englishSignature = signature;
        else {
          assert.deepEqual(signature, englishSignature, code + ': fallback changed the board');
          const data = await L.menus(sample);
          assert.deepEqual(data.art, panels.art, code + ': fallback changed reward/menu art');
          await screenshot(sample, 'telefon-dili-' + code + '-en');
          await L.checkReload(sample, 'en', await L.savedGame(sample), englishSignature);
          report.fallback.push({device: code, gameLanguage: 'en'});
        }
      }
      if (codes.includes(code)) {
        report.panels.find(item => item.code === code).scenes.push('treasure');
        if (code !== 'en') await L.prime(sample);
        // Change from another UI language before the in-game animation check.
        await L.choose(sample, code === 'tr' ? 'en' : 'tr');
        await L.choose(sample, code);
      }
      report.motion.push({code, gameLanguage: expected, ...await L.motion(sample)});
      await sample.close();
    }
    assert.deepEqual(report.errors, []);
    report.status = 'PASS';
    console.log('PASS:', report.checks.length, 'language/theme combinations,', report.reopen.length,
      'localized reopen checks,', report.fallback.length, 'device fallbacks and 42 screenshots');
  } finally {
    fs.writeFileSync(path.join(out, 'browser-report.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
