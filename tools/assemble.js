// Assembles the final MP4:
//   1) mixes the per-line voice files into one track, each placed at its timeline position
//   2) muxes render/frames/*.png + the audio mix into render/final.mp4
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
const framesDir = path.join(ROOT, 'render', 'frames');
const outFile = path.join(ROOT, 'render', 'final.mp4');
const mixFile = path.join(ROOT, 'render', 'audio_mix.wav');

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

// ---- 2) mux frames + audio ----
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
  outFile,
], 'encoding final.mp4');

console.log('\nDone: ' + path.relative(ROOT, outFile));
