'use strict';
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const root = path.resolve(__dirname, '../../..');
const {chromium} = require(path.join(root, 'node_modules/playwright'));
const proposal = fs.readFileSync(path.join(__dirname, '../proposal.css'), 'utf8');
const final = fs.readFileSync(path.join(__dirname, 'final.css'), 'utf8');
const adapter = fs.readFileSync(path.join(__dirname, 'preview-effects.js'), 'utf8');
const anchor = "const savedGame=get64('activeGame',null);";
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!source.includes(anchor)) throw Error('Test-only legal-solve hook anchor changed');
// Expose existing legal move planner for isolated tests only. Never written to index.html.
const testHtml = source.replace(anchor, 'window.__visualAudit={plan:rotationPlan,valid:countValid};'+anchor);
function serve() {
  const server = http.createServer((q, r) => {
    const file = path.resolve(root, '.'+decodeURIComponent(q.url.split('?')[0]));
    if (!file.startsWith(root+path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {r.writeHead(404); r.end(); return;}
    const types = {'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
    r.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    r.end(file === path.join(root, 'index.html') ? testHtml : fs.readFileSync(file));
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({server, url:`http://127.0.0.1:${server.address().port}`})));
}
async function init(browser, url, lang='tr', viewport={width:390,height:844}, options={}) {
  const p = await browser.newPage({viewport, deviceScaleFactor:options.dpr||1, reducedMotion:'reduce'});
  await p.addInitScript(lang => {
    localStorage.setItem('kd64_level', '300'); localStorage.setItem('kd6_lang', lang);
    localStorage.setItem('kd3_sound', '0'); localStorage.setItem('kd3_music', '0');
  }, lang);
  if (!options.realClock) await p.clock.install({time:new Date('2026-11-17T12:00:00Z')});
  await p.goto(url+'/index.html');
  if (!options.realClock) await p.clock.fastForward(2500);
  if (await p.locator('.kdDailyClose').count()) await p.locator('.kdDailyClose').click();
  await p.locator('#kdSplash').waitFor({state:'detached'});
  await p.addStyleTag({content:proposal+'\n'+final});
  await p.addScriptTag({content:adapter});
  return p;
}
async function variant(p, name) {
  await p.evaluate(name => {
    const html=document.documentElement, game=document.getElementById('kdGame');
    if (name==='current') {delete html.dataset.visualProposal; delete game.dataset.visualProposal;}
    else {html.dataset.visualProposal='obsidian-gold'; game.dataset.visualProposal='obsidian-gold';}
    if (name==='final') html.dataset.kdFinal=''; else delete html.dataset.kdFinal;
    window.kdFinalPreview?.sync();
  }, name);
}
async function select(p, level) {
  await p.evaluate(level=>{kdSelectLevel(level); kdNavigate('game'); kdLearning.leave(); kdSetPaused(true);},level);
  await p.clock.runFor(20);
}
const snapshot = p=>p.evaluate(()=>({
  game:kdGetLearningState(),
  save:Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])),
  cells:[...document.querySelectorAll('#board>.tile')].map(e=>({mask:e.dataset.pipe,svg:e.querySelector('svg')?.outerHTML,badges:[...e.querySelectorAll('span')].map(x=>x.textContent),rect:e.getBoundingClientRect().toJSON()})),
  energy:[...document.querySelectorAll('#board .kdPipeEnergy')].map(e=>getComputedStyle(e).stroke),
  board:document.getElementById('board').getBoundingClientRect().toJSON(),
  controls:[...document.querySelectorAll('#kdGame main>.controls button,#kdGame>.kdTop button')].map(e=>({id:e.id,text:e.textContent,rect:e.getBoundingClientRect().toJSON()}))
}));
module.exports={root,chromium,serve,init,variant,select,snapshot};
