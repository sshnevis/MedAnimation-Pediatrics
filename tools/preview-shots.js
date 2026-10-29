// Captures key storyboard frames at 1080x1920 for framing review.
// Usage: node tools/preview-shots.js
const path = require('path');
const fs = require('fs');
const { startServer } = require('./serve');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'render', 'preview');

(async () => {
  let puppeteer;
  try { puppeteer = require('puppeteer'); }
  catch (e) { console.error('Run npm install first'); process.exit(1); }

  fs.mkdirSync(OUT, { recursive: true });
  const port = 8095;
  const server = startServer(port, ROOT);
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:' + port + '/src/index.html?render=1', { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.__ready === true', { timeout: 60000 });

  const timing = JSON.parse(fs.readFileSync(path.join(ROOT, 'timing.json'), 'utf8'));
  const byId = Object.fromEntries(timing.lines.map((l) => [l.id, l]));
  // Monotonic times so seek callbacks apply cleanly forward
  const shots = [
    { name: '00_open', t: 0.8 },
    { name: '01_L01_greet', t: byId.L01.start + 0.4 },
    { name: '02_walkin', t: Math.min(byId.L01.end - 0.2, 3.2) },
    { name: '03_L02_mother', t: byId.L02.start + 0.8 },
    { name: '04_L03_foods', t: byId.L03.start + byId.L03.duration * 0.55 },
    { name: '05_L04_warn', t: byId.L04.start + byId.L04.duration * 0.55 },
    { name: '06_L05_doctor', t: byId.L05.start + 0.6 },
    { name: '07_L06_heart', t: byId.L06.start + 0.9 },
    { name: '08_L07_close', t: byId.L07.start + 0.4 },
    { name: '09_L08_mother', t: byId.L08.start + 0.5 },
    { name: '10_L09_wide', t: byId.L09.start + 1.2 },
    { name: '11_endcard', t: timing.total - 4.0 },
  ];

  for (const s of shots) {
    await page.evaluate((t) => window.__seek(t), s.t);
    await new Promise((r) => setTimeout(r, 40));
    const file = path.join(OUT, s.name + '.png');
    await page.screenshot({ path: file });
    console.log('wrote', path.relative(ROOT, file), 't=' + s.t.toFixed(2));
  }

  await browser.close();
  server.close();
  console.log('\nPreview shots in render/preview/');
})().catch((e) => { console.error(e); process.exit(1); });
