// Builds intro/outro hook card PNGs for assemble.js.
// Background = a mid-scenario frame from render/frames, blurred in HTML;
// Persian text is shaped by the browser (Vazirmatn) — not ffmpeg drawtext.
//
// Usage:  node tools/make-hook-cards.js
// Requires: puppeteer (npm install), and render/frames/f_*.png from tools/render.js
const path = require('path');
const fs = require('fs');
const { startServer } = require('./serve');

const ROOT = path.join(__dirname, '..');
const W = 1080;
const H = 1920;

(async () => {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (e) {
    console.error('puppeteer is not installed. Run:  npm install');
    process.exit(1);
  }

  const scenario = JSON.parse(fs.readFileSync(path.join(ROOT, 'scenario.json'), 'utf8'));
  const hooks = scenario.hooks;
  if (!hooks || !hooks.intro || !hooks.outro) {
    console.error('scenario.json is missing hooks.intro / hooks.outro');
    process.exit(1);
  }

  const framesDir = path.join(ROOT, 'render', 'frames');
  const files = fs.existsSync(framesDir)
    ? fs.readdirSync(framesDir).filter((f) => /^f_\d+\.png$/i.test(f)).sort()
    : [];
  if (files.length === 0) {
    console.error('No frames in render/frames. Run tools/render.js first.');
    process.exit(1);
  }

  // Intro background: fixed shot 200 (matches the hand-made reference card).
  const srcName = files.some((f) => f === 'f_00200.png')
    ? 'f_00200.png'
    : files[Math.min(files.length - 1, Math.floor((hooks.intro.frameAt != null ? hooks.intro.frameAt : 0.42) * files.length))];
  const srcRel = '/render/frames/' + srcName;
  console.log('Background frame:', srcName, '(frameAt=' + frameAt + ')');

  const port = 8094;
  const server = startServer(port, ROOT);
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-lcd-text', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

  async function shootCard(kind, htmlBody, outName) {
    const html = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8"/>
<style>
@font-face {
  font-family: Vazirmatn;
  src: url('/src/lib/fonts/Vazirmatn-Regular.woff2') format('woff2');
  font-weight: 400; font-style: normal;
}
@font-face {
  font-family: Vazirmatn;
  src: url('/src/lib/fonts/Vazirmatn-Bold.woff2') format('woff2');
  font-weight: 700; font-style: normal;
}
html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: #000; }
.bg {
  position: absolute; inset: -8%;
  background: url('${srcRel}') center/cover no-repeat;
  transform: scale(1.15);
  filter: blur(16px);
}
.veil { position: absolute; inset: 0; background: rgba(0,0,0,0.35); }
.card {
  position: absolute; left: 50%; top: 38%; transform: translate(-50%, -50%);
  width: 88%; box-sizing: border-box;
  background: rgba(216, 179, 242, 0.92);
  border-radius: 96px; padding: 140px 60px;
  display: flex; flex-direction: column; align-items: center;
  text-align: center;
  font-family: Vazirmatn, Tahoma, sans-serif;
}
.card .kicker {
  font-weight: 400; font-size: 46px; color: #2a9d8f;
  margin-bottom: 26px; letter-spacing: 0.02em;
}
.card .title {
  font-weight: 700; font-size: 88px; line-height: 1.4; color: #fff;
  text-shadow: 0 2px 10px rgba(0,0,0,0.15);
}
.copy {
  position: absolute; left: 0; right: 0;
  display: flex; flex-direction: column; align-items: center;
  text-align: center; padding: 0 72px;
  font-family: Vazirmatn, Tahoma, sans-serif; color: #fff;
}
.kicker {
  font-weight: 400; font-size: 52px; color: #4db6ac;
  margin-bottom: 28px; letter-spacing: 0.02em;
}
.title { font-weight: 700; font-size: 84px; line-height: 1.35; text-shadow: 0 2px 18px rgba(0,0,0,0.45); }
.outro-title { font-weight: 700; font-size: 76px; line-height: 1.35; text-shadow: 0 2px 18px rgba(0,0,0,0.45); }
</style>
</head>
<body>
  <div class="bg"></div>
  ${kind === 'intro' ? '' : '<div class="veil"></div>'}
  ${htmlBody}
</body>
</html>`;
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    // Give WOFF2 a beat to paint
    await new Promise((r) => setTimeout(r, 200));
    const outPath = path.join(ROOT, 'render', outName);
    await page.screenshot({ path: outPath, type: 'png' });
    console.log('Wrote', path.relative(ROOT, outPath), '(' + kind + ')');
  }

  const introBody = `<div class="card">
    <div class="kicker">${escapeHtml(hooks.intro.kicker || '')}</div>
    <div class="title">${escapeHtml(hooks.intro.title || '')}</div>
  </div>`;
  const outroBody = `<div class="copy" style="top:46%">
    <div class="outro-title">${escapeHtml(hooks.outro.title || 'ادامه دارد')}</div>
  </div>`;

  fs.mkdirSync(path.join(ROOT, 'render'), { recursive: true });
  await shootCard('intro', introBody, 'hook-intro.png');
  await shootCard('outro', outroBody, 'hook-outro.png');

  await browser.close();
  server.close();
  console.log('\nHook cards ready. Next: node tools/assemble.js');
})().catch((e) => { console.error(e); process.exit(1); });

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
