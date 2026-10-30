// Diagnostic: builds an episode scene and reports near-coplanar / touching box
// face pairs (the surfaces that z-fight and flicker as the camera moves).
// Usage: node tools/zfight-diag.js [--ep <episode-id>] [--gap 0.15]
const path = require('path');
const { startServer } = require('./serve');

const ROOT = path.resolve(path.join(__dirname, '..'));
const args = process.argv.slice(2);
const EP = args.includes('--ep') ? args[args.indexOf('--ep') + 1] : 'ep02-child-fever';
const GAP = args.includes('--gap') ? +args[args.indexOf('--gap') + 1] : 0.15;
const PORT = 8096;

(async () => {
  const puppeteer = require('puppeteer');
  const server = startServer(PORT, ROOT);
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERR:', e.message));
  await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${PORT}/src/index.html?ep=${EP}&render=1`, { waitUntil: 'networkidle0', timeout: 50000 });
  await page.waitForFunction('window.__ready === true', { timeout: 60000 });

  const report = await page.evaluate((GAP) => {
    const scene = window.__scene;
    const boxes = [];
    scene.traverse((o) => {
      if (o.isMesh && o.geometry && o.geometry.type === 'BoxGeometry') {
        // world-space AABB from geometry positions × matrixWorld
        const p = o.geometry.attributes.position.array;
        const m = o.matrixWorld.elements;
        const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
        for (let k = 0; k < p.length; k += 3) {
          const x = p[k], y = p[k + 1], z = p[k + 2];
          const w = [
            m[0] * x + m[4] * y + m[8] * z + m[12],
            m[1] * x + m[5] * y + m[9] * z + m[13],
            m[2] * x + m[6] * y + m[10] * z + m[14],
          ];
          for (let a = 0; a < 3; a++) {
            if (w[a] < mn[a]) mn[a] = w[a];
            if (w[a] > mx[a]) mx[a] = w[a];
          }
        }
        const mat = o.material && o.material.color ? o.material.color.getHexString() : '?';
        boxes.push({ mn, mx, mat });
      }
    });
    const risks = [];
    const fmt = (b) => b.mat + ' @ ' + b.mn.map((v) => +v.toFixed(1)).join(',');
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const A = boxes[i], B = boxes[j];
        const gaps = [0, 1, 2].map((a) => Math.max(A.mn[a], B.mn[a]) - Math.min(A.mx[a], B.mx[a]));
        const ov = gaps.map((g) => -g); // overlap extent per axis when negative
        // (a) interpenetration: overlapping on all 3 axes, neither box fully
        // contains the other, and the overlap isn't a sliver
        if (gaps.every((g) => g < -0.01)) {
          const contains = (S, T) => S.mn.every((v, a) => v <= T.mn[a] + 0.01) && S.mx.every((v, a) => v >= T.mx[a] - 0.01);
          if (!contains(A, B) && !contains(B, A)) {
            risks.push({ kind: 'PENETRATE', axis: '-', gap: +Math.max(...gaps).toFixed(3), A: fmt(A), B: fmt(B) });
          }
        }
        // (b) near-coplanar: deep overlap on two axes, thin positive gap on the third
        for (let a = 0; a < 3; a++) {
          const [g1, g2] = gaps.filter((_, k) => k !== a);
          if (g1 < -0.5 && g2 < -0.5 && gaps[a] > 0.001 && gaps[a] < GAP) {
            risks.push({ kind: 'GAP', axis: 'xyz'[a], gap: +gaps[a].toFixed(3), A: fmt(A), B: fmt(B) });
          }
        }
      }
    }
    const seen = new Set();
    return risks.filter((r) => {
      const k = r.axis + r.gap + r.A + r.B;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, GAP);

  console.log(`risky pairs: ${report.length}`);
  for (const r of report) console.log(`${r.kind} axis ${r.axis} gap ${r.gap} | ${r.A}  <->  ${r.B}`);
  await browser.close();
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });
