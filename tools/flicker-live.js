// Live-mode flicker probe: starts playback like a user, grabs consecutive
// real-time frames, and reports per-region temporal noise (z-fight/acne shows
// as salt-and-pepper INSIDE surfaces; camera motion only moves edges).
// Usage: node tools/flicker-live.js [--ep <id>] [--frames 40]
const path = require('path');
const fs = require('fs');
const { startServer } = require('./serve');

const ROOT = path.resolve(path.join(__dirname, '..'));
const argv = process.argv.slice(2);
const EP = argv.includes('--ep') ? argv[argv.indexOf('--ep') + 1] : 'ep02-child-fever';
const N = argv.includes('--frames') ? +argv[argv.indexOf('--frames') + 1] : 40;
const OUT = process.env.OUT_DIR ? path.resolve(process.env.OUT_DIR) : path.join(ROOT, 'tmp-flicker');
const PORT = 8099;

(async () => {
  const puppeteer = require('puppeteer');
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const server = startServer(PORT, ROOT);
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${PORT}/src/index.html?ep=${EP}`, { waitUntil: 'networkidle0', timeout: 50000 });
  // start like a user would (dev mode waits for the start button)
  await page.click('#btnStart');
  await new Promise((r) => setTimeout(r, 600)); // catch the opening sweep

  const cdp = await page.createCDPSession();
  for (let i = 0; i < N; i++) {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, `l${String(i).padStart(2, '0')}.png`), Buffer.from(data, 'base64'));
  }
  console.log('captured', N, 'live frames to', OUT);
  await browser.close();
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });
