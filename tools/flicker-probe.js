// Temporal flicker probe: renders consecutive deterministic frames at each
// storyboard shot and measures frame-to-frame pixel noise. Z-fighting and
// shadow strobe show as salt-and-pepper INSIDE surfaces (away from edges);
// camera motion only moves edges. Writes an amplified diff heatmap per shot.
//
// Usage: node tools/flicker-probe.js [--ep <id>] [--frames 6] [--thresh 25]
const path = require('path');
const fs = require('fs');
const { startServer } = require('./serve');
const { resolveEp } = require('./ep');

const { id: EP, ROOT, EP_DIR } = resolveEp();
const argv = process.argv.slice(2);
const argValue = (name, dflt) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? Number(argv[i + 1]) : dflt;
};
const N = argValue('--frames', 6);
const THRESH = argValue('--thresh', 25);
const FPS = 30;
const SCALE = argValue('--scale', 0.5); // half-res probe is plenty for speckle
const OUT = path.join(EP_DIR, 'render', 'flicker-probe');
const PORT = 8098;

(async () => {
  const puppeteer = require('puppeteer');
  fs.mkdirSync(OUT, { recursive: true });
  const server = startServer(PORT, ROOT);
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width: Math.round(1080 * SCALE), height: Math.round(1920 * SCALE), deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${PORT}/src/index.html?ep=${EP}&render=1&fps=${FPS}`, { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.__ready === true', { timeout: 60000 });

  // same shot list derivation as tools/preview-shots.js
  const timing = JSON.parse(fs.readFileSync(path.join(EP_DIR, 'timing.json'), 'utf8'));
  const scenario = JSON.parse(fs.readFileSync(path.join(EP_DIR, 'scenario.json'), 'utf8'));
  const byId = Object.fromEntries(timing.lines.map((l) => [l.id, l]));
  const plan = (scenario.staging && scenario.staging.plan) || [];
  const first = byId[timing.lines[0].id];
  const shots = [
    { name: '00_open', t: 0.8 },
    { name: '01_first_greet', t: first.start + 0.4 },
  ];
  plan.forEach((p, i) => {
    const L = byId[p.id];
    if (!L) return;
    const hasEffect = p.foods || p.warning || p.heart || p.medicineInsert || p.dangerCard || p.infantCard || p.doseCard;
    const t = L.start + (hasEffect ? L.duration * 0.55 : Math.min(0.8, L.duration * 0.35));
    shots.push({ name: String(i + 3).padStart(2, '0') + '_' + p.id + '_' + p.shot, t });
  });

  // in-page: diff two screenshots (dataURLs) on a canvas, return stats + heatmap
  await page.evaluate((w, h) => {
    window.__c1 = document.createElement('canvas');
    window.__c1.width = w; window.__c1.height = h;
    window.__ctx = window.__c1.getContext('2d', { willReadFrequently: true });
    window.__img = new Image();
  }, Math.round(1080 * SCALE), Math.round(1920 * SCALE));

  const results = [];
  for (const s of shots) {
    const dataURLs = [];
    for (let k = 0; k < N; k++) {
      await page.evaluate((t) => window.__seek(t), s.t + k / FPS);
      await new Promise((r) => setTimeout(r, 30));
      const shot = await page.screenshot({ encoding: 'base64' });
      dataURLs.push('data:image/png;base64,' + shot);
    }
    const stats = await page.evaluate((urls, thresh) => new Promise((resolve) => {
      const ctx = window.__ctx, W = ctx.canvas.width, H = ctx.canvas.height;
      const imgs = urls.map((u) => {
        const im = new Image();
        im.src = u;
        return im;
      });
      Promise.all(imgs.map((im) => new Promise((r) => { im.onload = r; }))).then(() => {
        const datas = imgs.map((im) => {
          ctx.clearRect(0, 0, W, H);
          ctx.drawImage(im, 0, 0, W, H);
          return ctx.getImageData(0, 0, W, H).data;
        });
        const acc = new Float32Array(W * H);
        let worst = 0;
        for (let k = 1; k < datas.length; k++) {
          const a = datas[k - 1], b = datas[k];
          let changed = 0;
          for (let px = 0; px < W * H; px++) {
            const d = Math.max(
              Math.abs(a[px * 4] - b[px * 4]),
              Math.abs(a[px * 4 + 1] - b[px * 4 + 1]),
              Math.abs(a[px * 4 + 2] - b[px * 4 + 2]));
            if (d > thresh) {
              changed++;
              acc[px] = Math.max(acc[px], d);
              if (d > worst) worst = d;
            }
          }
          if (k === 1) var firstChanged = changed;
        }
        // amplified heatmap
        const out = ctx.createImageData(W, H);
        for (let px = 0; px < W * H; px++) {
          const v = Math.min(255, acc[px] * 8);
          out.data[px * 4] = v; out.data[px * 4 + 1] = v; out.data[px * 4 + 2] = v;
          out.data[px * 4 + 3] = 255;
        }
        ctx.putImageData(out, 0, 0);
        resolve({ firstChanged, worst, heat: window.__c1.toDataURL('image/png') });
      });
    }), dataURLs, THRESH).catch((e) => ({ error: String(e) }));

    const png = stats.heat ? stats.heat.split(',')[1] : null;
    if (png) fs.writeFileSync(path.join(OUT, s.name + '_diff.png'), Buffer.from(png, 'base64'));
    results.push({ name: s.name, t: s.t, changed: stats.firstChanged, worst: stats.worst });
    console.log(`${s.name}  t=${s.t.toFixed(2)}  flickering px: ${String(stats.firstChanged).padStart(7)}  maxDelta: ${stats.worst}`);
  }

  const total = results.reduce((a, r) => a + r.changed, 0);
  console.log(`\nTOTAL flickering pixels across ${results.length} shots: ${total}`);
  console.log(`heatmaps in ${path.relative(ROOT, OUT)}`);
  await browser.close();
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });
