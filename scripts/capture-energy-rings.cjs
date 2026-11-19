'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {chromium} = require('playwright');
const game = require('../tests/energy-wave-harness.cjs');

const output = process.env.KD_WAVE_REPORT || path.join(game.root, 'design/energy-rings-preview');
const fps = 24, duration = 14;
const viewport = {width:430, height:932};
const shots = new Map([[12,'01-light-off'],[53,'02-new-connection'],[132,'04-settled']]);

async function toggleLight(page) {
  await page.evaluate(() => {
    kdNavigate('settings');
    document.querySelector('[data-setting=glow]').click();
    kdNavigate('game');
    kdSetPaused(true);
  });
}

async function prepare(page) {
  await game.initialize(page);
  await game.select(page, 6);
  await game.rotate(page, 10);
  await game.rotate(page, 14);
  await page.clock.runFor(2300);
}

async function capture(page, name, second, states) {
  await page.screenshot({path:path.join(output, name+'.png')});
  const board = await page.locator('#board').boundingBox();
  await page.screenshot({path:path.join(output, name+'-board.png'), clip:board});
  states[name] = {second, flow:await game.state(page), game:await game.snapshot(page)};
}

async function run() {
  fs.mkdirSync(output, {recursive:true});
  const frames = fs.mkdtempSync(path.join(os.tmpdir(), 'kd-rings-frames-'));
  const browser = await chromium.launch({args:['--no-sandbox']});
  const events = [], states = {}, errors = [];
  try {
    const page = await browser.newPage({viewport, deviceScaleFactor:2});
    page.on('pageerror', error => errors.push(error.message));
    await prepare(page);
    await page.evaluate(() => document.fonts.ready);
    await toggleLight(page);
    let bestBends = 0, bestWin = 0;
    for (let frame = 0; frame < fps*duration; frame++) {
      const second = frame/fps;
      if (frame === 32) await toggleLight(page);
      if (frame === 46) {
        await game.rotate(page, 14);
        events.push({second, action:'Connect reciprocal ports with real tile tap', tile:14});
      }
      if (frame === 145) {
        const move = await game.nextMove(page, {breakLink:true});
        assert(move.lost.length);
        await game.rotate(page, move.i);
        events.push({second, action:'Break actual connections', lost:move.lost});
      }
      if (frame === 170) {
        await page.locator('#undo').click();
        events.push({second, action:'Undo restores the connection'});
      }
      if (frame === 241) {
        await game.solve(page);
        events.push({second, action:'Engine win via real rotations, no hints'});
      }
      await page.clock.runFor(1000/fps);
      await page.screenshot({type:'jpeg', quality:94, path:path.join(frames, String(frame).padStart(4,'0')+'.jpg')});
      if (shots.has(frame)) await capture(page, shots.get(frame), second, states);

      if (frame >= 60 && frame < 91) {
        const {effects} = await game.state(page);
        const score = effects.rings.length*3 + effects.rings.reduce((sum,r) => sum+Math.sin(Math.PI*r.phase),0)
          + (effects.waves.some(w => w.bright.length > 1) ? 1 : 0);
        if (effects.rings.length >= 2 && score > bestBends) {
          bestBends = score;
          await capture(page, '03-bend-rings', second, states);
        }
      }
      if (frame >= 255 && frame <= 277) {
        const {effects} = await game.state(page);
        const score = effects.rings.length*2 + effects.waves.filter(w => w.bright.length > 1).length;
        if (score > bestWin) {
          bestWin = score;
          await capture(page, '05-completion', second, states);
        }
      }
    }
    assert.equal(states['01-light-off'].flow.canvas, false);
    assert(states['02-new-connection'].flow.effects.waves.some(w => w.bright.length > 1));
    assert(states['03-bend-rings'].flow.effects.rings.length >= 2);
    assert(states['04-settled'].flow.edges.length >= 5);
    assert.equal(states['04-settled'].flow.effects.waves.length, 0);
    assert(states['05-completion'].game.game.locked && states['05-completion'].flow.effects.waves.some(w => w.winning));
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output,'preview-state.json'),JSON.stringify({level:6,fps,duration,viewport,realEngine:true,events,states},null,2));
    execFileSync('ffmpeg',['-y','-loglevel','error','-framerate',String(fps),'-i',path.join(frames,'%04d.jpg'),
      '-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',
      path.join(output,'energy-wave-14s.mp4')],{stdio:'inherit'});
    console.log('PASS: real Level 6, five states and 14-second video');
  } finally {
    await browser.close();
    fs.rmSync(frames,{recursive:true,force:true});
  }
}

if (require.main === module) run().catch(error => { console.error(error); process.exitCode=1; });
module.exports = {prepare};
