'use strict';

const assert = require('node:assert/strict');
const H = require('./energy-wave-harness.cjs');

const themes = ['gold', 'ice', 'fire', 'shadow', 'emerald', 'ruby'];
const rtl = ['ar', 'ur', 'fa'];
const clockStart = new Date('2026-11-19T12:00:00Z');

async function openGame(page, url, {deviceLocale, seed = true} = {}) {
  if (deviceLocale || seed) {
    await page.addInitScript(({deviceLocale, seed}) => {
      if (deviceLocale) {
        Object.defineProperty(navigator, 'language', {get: () => deviceLocale});
        Object.defineProperty(navigator, 'languages', {get: () => [deviceLocale]});
      }
      if (!seed || localStorage.getItem('kdLocaleAuditSeed')) return;
      const fixture = {
        kdLocaleAuditSeed: '1', kd64_level: '17', kd64_coins: '510',
        kd64_hintCoupons: '7', kd64_xp: '92', kd64_completed: '{"1":3,"2":2}',
        kd64_best: '{"1":4200,"2":3100}', kd3_sound: '0', kd5_glow: '1',
        kd64_dailyDate: '"2026-11-18"', kd64_streak: '2',
      };
      for (const theme of ['gold', 'ice', 'fire', 'shadow', 'emerald', 'ruby']) {
        fixture['kd64_shopTheme_' + theme] = 'true';
      }
      for (const [key, value] of Object.entries(fixture)) localStorage.setItem(key, value);
    }, {deviceLocale, seed});
  }
  // Pause before navigating so slow WebView initialization can't outrun the fixture clock.
  await page.clock.install({time: new Date(clockStart.getTime() - 60_000)});
  await page.clock.pauseAt(clockStart);
  await page.goto(url);
  await page.clock.runFor(2600);
}

async function resume(page) {
  await page.evaluate(() => {
    document.querySelector('.kdDailyClose')?.click();
    kdNavigate('game');
    kdSetPaused(true);
  });
  await page.clock.runFor(90);
  assert.equal(await page.locator('#kdGame').isVisible(), true);
}

async function prime(page) {
  await H.select(page, 6);
  for (const i of [10, 14, 14]) await H.rotate(page, i);
  await page.clock.runFor(1800);
  assert.equal(await page.evaluate(() => kdGetLearningState().moves), 3);
}

async function choose(page, preference, expected = preference) {
  await page.evaluate(() => {
    window.localeAuditBoard = document.querySelector('#board');
    window.localeAuditTile = document.querySelector('#board>.tile');
    kdNavigate('settings');
  });
  const select = page.locator('#kdLangSelect');
  await select.selectOption(preference);
  assert.equal(await select.inputValue(), preference);
  assert.equal(await page.locator('html').getAttribute('lang'), expected);
  assert.equal(await page.locator('html').getAttribute('dir'), rtl.includes(expected) ? 'rtl' : 'ltr');
  assert.equal(await select.getAttribute('aria-label'), await page.evaluate(() => kdTranslate('Oyun dili')));
  await resume(page);
  assert(await page.evaluate(() => window.localeAuditBoard === document.querySelector('#board') &&
    window.localeAuditTile === document.querySelector('#board>.tile')), expected + ': replaced board DOM or reloaded document');
}

function savedGame(page) {
  return page.evaluate(() => {
    const game = kdGetLearningState();
    const save = JSON.parse(localStorage.getItem('kd64_activeGame'));
    delete save.elapsed;
    const keys = ['level', 'coins', 'hintCoupons', 'completed', 'best', 'xp', 'dailyDate', 'dailySeen',
      'dailyLastReward', 'streak', 'shopActiveTheme', 'shopTheme_gold', 'shopTheme_ice', 'shopTheme_fire',
      'shopTheme_shadow', 'shopTheme_emerald', 'shopTheme_ruby'];
    return {
      level: game.level, size: game.n, optimum: game.optimal, targets: game.targets,
      moves: game.moves, hints: game.usedHints, undos: game.undos, mode: game.mode,
      current: kdLessonPreview().before, save,
      storage: Object.fromEntries(keys.map(key => [key, localStorage.getItem('kd64_' + key)])),
    };
  });
}

function boardAppearance(page) {
  return page.evaluate(() => {
    const game = document.querySelector('#kdGame');
    const board = document.querySelector('#board');
    const flow = kdPipeFlow.state();
    const style = (element, keys) => {
      const computed = getComputedStyle(element);
      return keys.map(key => computed[key]);
    };
    const order = selector => Array.from(game.querySelectorAll(selector)).sort(
      (a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x,
    ).map(e => e.id || e.className);
    const tiles = Array.from(board.querySelectorAll(':scope>.tile'));
    const centers = tiles.map(tile => {
      const r = tile.getBoundingClientRect();
      return [r.x + r.width / 2, r.y + r.height / 2];
    });
    const {n} = kdGetLearningState();
    const physicalOrder = centers.every(([x, y], i) =>
      (i % n === 0 || (x > centers[i - 1][0] && Math.abs(y - centers[i - 1][1]) < 1)) &&
      (i < n || (y > centers[i - n][1] && Math.abs(x - centers[i - n][0]) < 1)));
    return {
      physicalOrder, direction: getComputedStyle(board).direction,
      toolbar: order('.kdGameActions button'), ruleToolbar: order('#kdModeRule button'),
      theme: document.documentElement.dataset.kdTheme,
      surfaces: [game, board].map(e => style(e, ['backgroundColor', 'backgroundImage', 'borderColor', 'boxShadow', 'animationName'])),
      pipes: tiles.map(tile => {
        const svg = tile.querySelector('.kdSculptedPipe');
        return {
          mask: svg.dataset.pipeMask, theme: svg.dataset.pipeTheme, axis: svg.dataset.metalAxis,
          stone: style(tile, ['backgroundImage', 'backgroundColor', 'boxShadow', 'animationName', 'transform']),
          geometry: Array.from(svg.querySelectorAll('path')).map(e =>
            [e.getAttribute('d'), ...style(e, ['fill', 'stroke', 'strokeWidth', 'transform', 'animationName'])]),
        };
      }),
      energy: {enabled: flow.enabled, profile: flow.profile, theme: flow.theme, ports: flow.ports,
        edges: flow.edges, drawn: flow.canvas},
    };
  });
}

async function artwork(page, selector) {
  return page.locator(selector).evaluate(async root => {
    const elements = [root, ...root.querySelectorAll('*')];
    // Live SVG theme cards intentionally hide their static fallback art.
    const shownImages = Array.from(root.querySelectorAll('img')).filter(image =>
      !image.closest('.kdLivePreview > .kdThemePreview'));
    const imgs = await Promise.all(shownImages.map(async image => {
      await image.decode();
      const computed = getComputedStyle(image), {width, height} = image.getBoundingClientRect();
      if (!image.naturalWidth || !width || !height || computed.visibility === 'hidden' || computed.display === 'none') {
        throw Error('Asset is unloaded or hidden: ' + image.src);
      }
      return [new URL(image.currentSrc).pathname, image.naturalWidth, image.naturalHeight,
        image.style.cssText, computed.transform, computed.objectPosition];
    }));
    const hasArtwork = e => e.matches('path,circle,ellipse,polygon,rect,polyline,line,use,stop') && e.closest('svg');
    const vectors = elements.filter(hasArtwork).map(e => [
      e.nodeName, Array.from(e.attributes, a => [a.name, a.value]).filter(([name]) => name !== 'aria-label'),
    ]);
    const fills = elements.filter(e => e.namespaceURI === 'http://www.w3.org/1999/xhtml').flatMap(e => {
      const s = getComputedStyle(e);
      return s.backgroundImage.includes('url(') ? [s.backgroundImage] : [];
    });
    return {imgs, vectors, fills};
  });
}

async function treasure(page) {
  const panel = page.locator('.kdTreasureCard');
  assert.equal(await panel.isVisible(), true);
  assert.equal(await panel.locator('.kdTreasureDay.today').getAttribute('data-day'), '3');
  assert.equal(await panel.locator('.kdTreasureDay').count(), 7);
  const art = await artwork(page, '.kdTreasureCard');
  assert.equal(art.imgs.length, 1);
  assert(art.imgs[0][0].endsWith('/assets/daily-treasure-chest.webp'));
  await page.locator('.kdDailyClose').click();
  return art;
}

async function menus(page) {
  await page.evaluate(() => kdNavigate('home'));
  const home = await artwork(page, '.kdExactHome');
  assert(home.imgs.length >= 5);
  const result = {home};
  for (const [name, button] of [['chest', '.kdHotChest'], ['quests', '.kdHotTasks']]) {
    await page.locator(button).click();
    result[name] = await artwork(page, '.kdV9Overlay');
    assert(result[name].imgs.length > 0, name + ': missing illustration');
    await page.locator('#v9Close').click();
  }
  await page.locator('.kdHotShop').click();
  result.shop = await artwork(page, '.kdRefShop');
  assert(result.shop.imgs.length > 1);
  const banner = page.locator('.kdLocalizedShopBanner');
  const shopText = {maskVisible: await banner.isVisible(), value: await banner.textContent()};
  await page.locator('[data-shop-spin]').click();
  result.wheel = await artwork(page, '.kdWheelStage');
  assert.equal(await page.locator('.kdWheelDisc path').count(), 8);
  assert.equal(await page.locator('.kdWheelDisc text.kdWheelPrize').count(), 8);
  await page.locator('.kdWheelClose').click();
  await resume(page);
  return {art: result, shopText};
}

async function motion(page) {
  const sample = () => page.evaluate(() => {
    const state = kdPipeFlow.state();
    const canvas = document.querySelector('#kdPipeFlowCanvas');
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 2166136261, brightPixels = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const [red, green, blue, alpha] = [pixels[i], pixels[i+1], pixels[i+2], pixels[i+3]];
      hash = Math.imul(hash ^ (red << 24 | green << 16 | blue << 8 | alpha), 16777619);
      if (red > 230 && green > 190 && alpha >= 96) brightPixels++;
    }
    return {hash, brightPixels, fronts: state.effects.fronts, wavePaths: state.effects.layers.wave};
  });
  const move = await H.nextMove(page);
  assert(move.score > move.base, 'Fixture must create a verified new connection');
  await H.rotate(page, move.i);
  await page.clock.runFor(350);
  const first = await sample();
  await page.clock.runFor(550);
  const middle = await sample();
  assert(first.wavePaths > 0 && middle.wavePaths > 0 && middle.brightPixels > 0);
  assert.notEqual(first.hash, middle.hash, 'Rendered Canvas pixels must advance');
  assert(middle.fronts.some(current => first.fronts.some(previous =>
    current.id === previous.id && current.progress > previous.progress)));
  await page.clock.runFor(1800);
  assert.equal((await sample()).wavePaths, 0);
  return {newConnections: move.score - move.base, moved: true, settled: true};
}

async function checkReload(page, code, before, artworkBefore) {
  await page.reload();
  await page.clock.runFor(2700);
  assert.equal(await page.locator('html').getAttribute('lang'), code);
  assert.equal(await page.locator('.kdDailyOverlay').count(), 0);
  await resume(page);
  assert.deepEqual(await savedGame(page), before, code + ': reload changed the save');
  assert.deepEqual(await boardAppearance(page), artworkBefore, code + ': reload changed artwork');
}

module.exports = {themes, rtl, openGame, resume, prime, choose, savedGame, boardAppearance, treasure, menus, motion, checkReload};
