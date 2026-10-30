// Assembles the final MP4:
//   1) mixes the per-line voice files into one track, each placed at its timeline position
//   2) encodes frames + audio → render/main.mp4
//   3) if hook cards exist (from tools/make-hook-cards.js), concatenates
//      intro card + main + outro card → render/final.mp4
//      otherwise final.mp4 = main.mp4
// Subtitles are already baked into the captured frames (HTML overlay).
//
// Requires ffmpeg on PATH:  winget install Gyan.FFmpeg
// Usage:  node tools/assemble.js [--fps 30]
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
let FPS = 30;
const argv = process.argv.slice(2);
const fi = argv.indexOf('--fps');
if (fi !== -1 && argv[fi + 1]) FPS = Number(argv[fi + 1]);

const timing = JSON.parse(fs.readFileSync(path.join(ROOT, 'timing.json'), 'utf8'));
const scenario = JSON.parse(fs.readFileSync(path.join(ROOT, 'scenario.json'), 'utf8'));
const framesDir = path.join(ROOT, 'render', 'frames');
const mainFile = path.join(ROOT, 'render', 'main.mp4');
const outFile = path.join(ROOT, 'render', 'final.mp4');
const mixFile = path.join(ROOT, 'render', 'audio_mix.wav');
const introPng = path.join(ROOT, 'render', 'hook-intro.png');
const outroPng = path.join(ROOT, 'render', 'hook-outro.png');

function ffmpeg(args, label) {
  console.log('>', label);
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error'].concat(args), { stdio: 'inherit' });
}

// ---- 1) audio mix ----
const withAudio = timing.lines.filter((L) => fs.existsSync(path.join(ROOT, 'audio', L.id + '.mp3')));
if (withAudio.length === 0) {
  console.error('No audio files found in audio/. Generate voices first (see README).');
  process.exit(1);
}

const inputs = [];
const filterParts = [];
const mixLabels = [];
withAudio.forEach((L, i) => {
  inputs.push('-i', path.join(ROOT, 'audio', L.id + '.mp3'));
  const delay = Math.round(L.start * 1000);
  filterParts.push('[' + i + ':a]adelay=' + delay + ':all=1[d' + i + ']');
  mixLabels.push('[d' + i + ']');
});
filterParts.push(mixLabels.join('') + 'amix=inputs=' + withAudio.length + ':normalize=0,apad[out]');
ffmpeg(inputs.concat([
  '-filter_complex', filterParts.join(';'),
  '-map', '[out]',
  '-t', String(timing.total),
  mixFile,
]), 'mixing ' + withAudio.length + ' voice files');

// ---- 2) mux frames + audio → main.mp4 ----
ffmpeg([
  '-framerate', String(FPS),
  '-i', path.join(framesDir, 'f_%05d.png'),
  '-i', mixFile,
  '-map', '0:v',
  '-map', '1:a',
  '-c:v', 'libx264',
  '-preset', 'medium',
  '-crf', '18',
  '-pix_fmt', 'yuv420p',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-shortest',
  mainFile,
], 'encoding main.mp4');

// ---- 3) optional intro/outro hook cards ----
const hooks = scenario.hooks || {};
const introDur = (hooks.intro && hooks.intro.duration) || 0.5;
const outroDur = (hooks.outro && hooks.outro.duration) || 1.0;
const hasHooks = fs.existsSync(introPng) && fs.existsSync(outroPng);

if (!hasHooks) {
  fs.copyFileSync(mainFile, outFile);
  console.log('\nNo hook cards found — final.mp4 = main.mp4');
  console.log('(Run node tools/make-hook-cards.js before assemble to add intro/outro.)');
  console.log('Done: ' + path.relative(ROOT, outFile));
  process.exit(0);
}

function encodeCard(png, dur, outMp4, label) {
  ffmpeg([
    '-loop', '1', '-t', String(dur), '-i', png,
    '-f', 'lavfi', '-t', String(dur), '-i', 'anullsrc=r=44100:cl=mono',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-r', String(FPS),
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    outMp4,
  ], label);
}

const introMp4 = path.join(ROOT, 'render', 'hook-intro.mp4');
const outroMp4 = path.join(ROOT, 'render', 'hook-outro.mp4');
const concatList = path.join(ROOT, 'render', 'hooks-concat.txt');

encodeCard(introPng, introDur, introMp4, 'encoding hook-intro.mp4 (' + introDur + 's)');
encodeCard(outroPng, outroDur, outroMp4, 'encoding hook-outro.mp4 (' + outroDur + 's)');

const listBody = [
  "file '" + introMp4.replace(/\\/g, '/') + "'",
  "file '" + mainFile.replace(/\\/g, '/') + "'",
  "file '" + outroMp4.replace(/\\/g, '/') + "'",
].join('\n');
fs.writeFileSync(concatList, listBody);

ffmpeg([
  '-f', 'concat',
  '-safe', '0',
  '-i', concatList,
  '-c', 'copy',
  outFile,
], 'concat intro + main + outro → final.mp4');

console.log('\nDone: ' + path.relative(ROOT, outFile)
  + '  (intro ' + introDur + 's + main ' + timing.total + 's + outro ' + outroDur + 's)');
