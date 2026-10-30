// Captures the animation frame-by-frame with headless Chrome (deterministic —
// the GSAP timeline is seeked, not played in real time).
//
// Usage:
//   npm install                (once — installs puppeteer + its Chrome)
//   node tools/render.js [--fps 30] [--scale 1] [--from <frame>] [--ep <episode-id>]
//
// Output: episodes/<ep>/render/frames/f_00000.png ...   then run tools/assemble.js
const path = require('path');
const fs = require('fs');
const { startServer } = require('./serve');
const { resolveEp } = require('./ep');

const { id: EP, ROOT, EP_DIR } = resolveEp();

// --- args ---
let FPS = 30, SCALE = 1, FROM = 0;
const argv = process.argv.slice(2);
function argValue(name) {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? Number(argv[i + 1]) : null;
}
FPS = argValue('--fps') || FPS;
SCALE = argValue('--scale') || SCALE;
FROM = argValue('--from') || FROM;

(async () => {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (e) {
    console.error('puppeteer is not installed. Run:  npm install');
    process.exit(1);
  }

  const framesDir = path.join(EP_DIR, 'render', 'frames');
  fs.mkdirSync(framesDir, { recursive: true });

  const port = 8093;
  const server = startServer(port, ROOT);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-lcd-text', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport({
    // vertical Reels format: 1080x1920 (9:16). --scale multiplies for testing.
    width: Math.round(1080 * SCALE),
    height: Math.round(1920 * SCALE),
    deviceScaleFactor: 1,
  });
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('[page]', m.text());
  });

  await page.goto('http://127.0.0.1:' + port + '/src/index.html?ep=' + EP + '&render=1&fps=' + FPS, { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.__ready === true', { timeout: 60000 });

  const duration = await page.evaluate('window.__duration');
  const totalFrames = Math.round(duration * FPS);
  console.log('Duration: ' + duration + 's  ->  ' + totalFrames + ' frames @ ' + FPS + 'fps');

  for (let i = FROM; i <= totalFrames; i++) {
    await page.evaluate((t) => window.__seek(t), i / FPS);
    const name = 'f_' + String(i).padStart(5, '0') + '.png';
    await page.screenshot({ path: path.join(framesDir, name) });
    if (i % 50 === 0) console.log('frame', i, '/', totalFrames);
  }

  await browser.close();
  server.close();
  console.log('\nFrames written to episodes/' + EP + '/render/frames. Now run:  node tools/assemble.js --ep ' + EP);
})().catch((e) => { console.error(e); process.exit(1); });
