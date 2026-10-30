// Captures key storyboard frames at 1080x1920 for framing review.
// The shot list is derived from the episode's scenario.json staging.plan —
// one frame per dialogue line plus opening/walk-in/end-card beats.
// Usage: node tools/preview-shots.js [--ep <episode-id>]
const path = require('path');
const fs = require('fs');
const { startServer } = require('./serve');
const { resolveEp } = require('./ep');

const { id: EP, ROOT, EP_DIR } = resolveEp();
const OUT = path.join(EP_DIR, 'render', 'preview');

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
  await page.goto('http://127.0.0.1:' + port + '/src/index.html?ep=' + EP + '&render=1', { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.__ready === true', { timeout: 60000 });

  const timing = JSON.parse(fs.readFileSync(path.join(EP_DIR, 'timing.json'), 'utf8'));
  const scenario = JSON.parse(fs.readFileSync(path.join(EP_DIR, 'scenario.json'), 'utf8'));
  const byId = Object.fromEntries(timing.lines.map((l) => [l.id, l]));
  const plan = (scenario.staging && scenario.staging.plan) || [];
  // The actual opening line (timing.lines[0]) — the staging.plan may skip it
  // when its shot/effect is handled by the opening block.
  const first = byId[timing.lines[0].id];

  // Monotonic times so seek callbacks apply cleanly forward
  const shots = [
    { name: '00_open', t: 0.8 },
    { name: '01_first_greet', t: first.start + 0.4 },
    { name: '02_walkin', t: Math.min(first.end - 0.2, 3.2) },
  ];
  plan.forEach((p, i) => {
    const L = byId[p.id];
    if (!L) return;
    // effect lines peak mid-line; plain dialogue lines just after the start
    const hasEffect = p.foods || p.warning || p.heart;
    const t = L.start + (hasEffect ? L.duration * 0.55 : Math.min(0.8, L.duration * 0.35));
    shots.push({ name: String(i + 3).padStart(2, '0') + '_' + p.id + '_' + p.shot, t });
  });
  shots.push({ name: String(shots.length).padStart(2, '0') + '_endcard', t: timing.total - 4.0 });

  for (const s of shots) {
    await page.evaluate((t) => window.__seek(t), s.t);
    await new Promise((r) => setTimeout(r, 40));
    const file = path.join(OUT, s.name + '.png');
    await page.screenshot({ path: file });
    console.log('wrote', path.relative(ROOT, file), 't=' + s.t.toFixed(2));
  }

  await browser.close();
  server.close();
  console.log('\nPreview shots in episodes/' + EP + '/render/preview/');
})().catch((e) => { console.error(e); process.exit(1); });
