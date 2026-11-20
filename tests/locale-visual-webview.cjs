'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {_android} = require('playwright');
const L = require('./locale-visual-harness.cjs');

const out = process.env.KD_LOCALE_ANDROID_OUT || 'dist/locale-webview';
const url = 'http://127.0.0.1:8765/index.html';
const locales = ['tr', 'en', 'ar', 'ja'];
const reportPath = path.join(out, 'webview-report.json');
fs.mkdirSync(out, {recursive: true});

function capture(name) {
  const frame = execFileSync('adb', ['exec-out', 'screencap', '-p'], {maxBuffer: 16e6});
  assert.equal(frame.subarray(1, 4).toString(), 'PNG');
  fs.writeFileSync(path.join(out, name + '.png'), frame);
}

async function main() {
  const reopening = process.argv.includes('--reopen');
  const report = reopening ? JSON.parse(fs.readFileSync(reportPath)) : {
    host: 'Android 35 system WebView shell', phoneVerified: false, locales: [], errors: [], status: 'RUNNING',
  };
  const [device] = await _android.devices();
  assert(device, 'Android emulator missing');
  try {
    const webview = await device.webView({pkg: 'org.chromium.webview_shell'});
    const page = await webview.page();
    page.on('pageerror', error => report.errors.push(String(error)));
    await L.openGame(page, url, {seed: !reopening, native: true});
    report.userAgent = await page.evaluate(() => navigator.userAgent);
    assert.match(report.userAgent, /Android.*wv/i);
    report.viewport = await page.evaluate(() => ({width: innerWidth, height: innerHeight, dpr: devicePixelRatio}));
    if (reopening) {
      await L.resume(page);
      assert.equal(await page.locator('html').getAttribute('lang'), 'ja');
      assert.equal(await page.locator('.kdDailyOverlay').count(), 0);
      assert.deepEqual(await L.savedGame(page), report.baseline);
      assert.deepEqual(await L.boardAppearance(page), report.artwork);
      capture('android-ja-yeniden-acilis');
      report.processRestartPreserved = true;
      report.status = 'PASS';
    } else {
      await L.treasure(page);
      await L.prime(page);
      report.baseline = await L.savedGame(page);
      report.artwork = await L.boardAppearance(page);
      assert.equal(report.artwork.physicalOrder, true);
      assert.deepEqual(report.artwork.toolbar, ['hint', 'undo', 'restart', 'new']);
      assert(report.artwork.energy.enabled && report.artwork.energy.drawn && report.artwork.energy.edges.length > 0);
      const baseline = await L.menus(page);
      for (const code of locales) {
        await L.choose(page, code);
        assert.deepEqual(await L.savedGame(page), report.baseline);
        assert.deepEqual(await L.boardAppearance(page), report.artwork);
        await page.evaluate(() => document.fonts.ready);
        capture('android-' + code);
        const panels = await L.menus(page);
        assert.deepEqual(panels.art, baseline.art);
        await L.checkReload(page, code, report.baseline, report.artwork);
        report.locales.push({code, level: 6, theme: 'gold', liveChange: true, reload: true});
        console.log('Android WebView surface captured:', code);
      }
    }
    assert.deepEqual(report.errors, []);
  } finally {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    await device.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
