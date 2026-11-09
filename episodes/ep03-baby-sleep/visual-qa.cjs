'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { startServer } = require('../../tools/serve');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '../..');
const scenario = require('./scenario.json');
const timing = require('./timing.json');
const sound = require('./sound.json');
const times = Object.fromEntries(timing.lines.map(l => [l.id, l]));
const samples = [];
const sample = (name, time, room, shot, items) => samples.push({ name, time, room, shot, items });
const nursery = 'nursery-bedroom', clinic = scenario.location;
const cutHits = sound.hits.filter(h => h.category === 'whoosh');
const flashAt = cutHits.find(h => h.line === 'L03').at;
sample('flashback', flashAt + 1, nursery, 'flashback-fall');
sample('flashback-return', flashAt + 2.7, clinic, 'medium-family');
sample('held', times.L04.start + 0.8, clinic, 'close-mother-baby');
sample('father', times.L09.start + 0.8, clinic, 'close-father');
sample('nursery-wide', times.L10.end - 0.8, nursery, 'nursery-wide');
for (const id of ['L11', 'L12']) {
  const cfg = scenario.lines.find(l => l.id === id).forbiddenItems;
  cfg.items.forEach((key, i) => sample(id + '-' + key, times[id].start + cfg.fractions[i] * times[id].duration + 0.5, nursery, 'crib-close', [key]));
}
sample('position-guide', times.L14.start + times.L14.duration * 0.82, nursery, 'crib-close', []);
sample('two-beds', times.L16.start + 3, nursery, 'nursery-top', []);
sample('endcard-one', times.L19.start + times.L19.duration * 0.3, nursery, 'nursery-top', []);
sample('endcard-all', times.L19.start + times.L19.duration * 0.85, nursery, 'nursery-top', []);
sample('final-hold', timing.total - 4, nursery, 'nursery-top', []);
(async () => {
  const out = path.join(__dirname, 'render/qa');
  fs.mkdirSync(out, { recursive: true });
  const server = startServer(8097, ROOT);
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars'] });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
    await page.goto('http://127.0.0.1:8097/src/index.html?ep=ep03-baby-sleep&render=1', { waitUntil: 'networkidle0' });
    await page.waitForFunction('window.__ready === true', { timeout: 60000 });
    const results = [];
    for (const s of samples.sort((a, b) => a.time - b.time)) {
      await page.evaluate(t => window.__seek(t), s.time);
      const state = await page.evaluate(() => ({ ...window.__insertState,
        subtitle: document.getElementById('subtitle').style.background,
        shownBullets: Array.from(document.querySelectorAll('#endItems li')).filter(el => el.style.visibility === 'visible').length,
        captionOn: document.getElementById('subtitleBox').classList.contains('on'),
      }));
      assert.equal(state.room, s.room, s.name);
      assert.equal(state.shot, s.shot, s.name);
      assert.equal(state.pose, s.room === nursery ? 'lying' : 'held');
      if (s.items) assert.deepEqual(state.visibleItems, s.items, s.name);
      if (s.name === 'endcard-one') assert.equal(state.shownBullets, 1);
      if (s.name === 'endcard-all') assert.equal(state.shownBullets, 3);
      if (s.name === 'final-hold') assert.equal(state.captionOn, false);
      await page.screenshot({ path: path.join(out, s.name + '.png') });
      results.push({ ...s, state });
    }
    const colors = {};
    for (const id of ['L02', 'L04', 'L09', 'L19']) {
      await page.evaluate(t => window.__seek(t), times[id].start + 0.5);
      colors[id] = await page.evaluate(() => document.getElementById('subtitle').style.background);
    }
    assert.equal(new Set(Object.values(colors)).size, 4);
    const hashes = [];
    for (const time of [times.L16.start + 3, times.L04.start + 0.8, times.L16.start + 3]) {
      await page.evaluate(t => window.__seek(t), time);
      hashes.push(crypto.createHash('sha256').update(await page.screenshot()).digest('hex'));
    }
    assert.equal(hashes[0], hashes[2], 'Backward/random seek must reproduce identical pixels');
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'visual-qa.json'), JSON.stringify({ passed: true, errors, colors, deterministicHashes: hashes, samples: results }, null, 2));
    console.log('PASS: ' + results.length + ' visual states, four speaker colors, sequential bullets, bare final crib, pixel-identical random seeks');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
