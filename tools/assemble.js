// Assembles the final MP4:
//   1) mixes the per-line voice files into one track, each placed at its timeline position
//   2) encodes frames + audio → render/main.mp4
//   3) if hook cards exist (from tools/make-hook-cards.js), concatenates
//      intro card + main + outro card → render/final.mp4
//      otherwise final.mp4 = main.mp4
// Subtitles are already baked into the captured frames (HTML overlay).
//
// Requires ffmpeg on PATH:  winget install Gyan.FFmpeg
// Usage:  node tools/assemble.js [--fps 30] [--ep <episode-id>]
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { resolveEp } = require('./ep');

const { id: EP, ROOT, EP_DIR } = resolveEp();
let FPS = 30;
const argv = process.argv.slice(2);
const fi = argv.indexOf('--fps');
if (fi !== -1 && argv[fi + 1]) FPS = Number(argv[fi + 1]);

const timing = JSON.parse(fs.readFileSync(path.join(EP_DIR, 'timing.json'), 'utf8'));
const scenario = JSON.parse(fs.readFileSync(path.join(EP_DIR, 'scenario.json'), 'utf8'));
const framesDir = path.join(EP_DIR, 'render', 'frames');
const mainFile = path.join(EP_DIR, 'render', 'main.mp4');
const outFile = path.join(EP_DIR, 'render', 'final.mp4');
const mixFile = path.join(EP_DIR, 'render', 'audio_mix.wav');
const introPng = path.join(EP_DIR, 'render', 'hook-intro.png');
const outroPng = path.join(EP_DIR, 'render', 'hook-outro.png');

function ffmpeg(args, label) {
  console.log('>', label);
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error'].concat(args), { stdio: 'inherit' });
}

// ---- 1) audio mix ----
const withAudio = timing.lines.filter((L) => fs.existsSync(path.join(EP_DIR, 'audio', L.id + '.mp3')));
if (withAudio.length === 0) {
  console.error('No audio files found in episodes/' + EP + '/audio. Generate voices first (see README).');
  process.exit(1);
}

// ---- 1b) optional sound design (tools/Sound pack SFX) ----
// Spec file: episodes/<id>/sound.json
//   beds:  [{ file, gain, start?, end?, fadeIn?, fadeOut? }]  — ambience/music loops
//   hits:  [{ at, file, gain? }]                              — one-shot SFX on the main timeline
//   intro: { file, gain? } / outro: { file, gain? }           — hook-card sounds
const sfxFile = path.join(EP_DIR, 'sound.json');
const sfxSpec = fs.existsSync(sfxFile) ? JSON.parse(fs.readFileSync(sfxFile, 'utf8')) : null;

const inputs = [];
const filterParts = [];
const mixLabels = [];
withAudio.forEach((L, i) => {
  inputs.push('-i', path.join(EP_DIR, 'audio', L.id + '.mp3'));
  const delay = Math.round(L.start * 1000);
  filterParts.push('[' + i + ':a]adelay=' + delay + ':all=1[d' + i + ']');
  mixLabels.push('[d' + i + ']');
});
if (sfxSpec) {
  let n = inputs.length / 2;
  const chain = (idx, ev) => {
    const g = ev.gain == null ? 1 : ev.gain;
    const start = ev.start || 0;
    let f = '[' + idx + ':a]volume=' + g + ',adelay=' + Math.round(start * 1000) + ':all=1';
    if (ev.fadeIn) f += ',afade=t=in:st=' + start + ':d=' + ev.fadeIn;
    if (ev.end && ev.fadeOut) f += ',afade=t=out:st=' + (ev.end - ev.fadeOut) + ':d=' + ev.fadeOut;
    if (ev.end) f += ',atrim=0:' + ev.end;
    return f + '[s' + idx + ']';
  };
  (sfxSpec.beds || []).forEach((ev) => {
    if (!fs.existsSync(ev.file)) { console.error('sound.json: missing bed file ' + ev.file); process.exit(1); }
    if (ev.loop) inputs.push('-stream_loop', '-1');
    inputs.push('-i', ev.file);
    filterParts.push(chain(n, ev)); mixLabels.push('[s' + n + ']'); n++;
  });
  (sfxSpec.hits || []).forEach((ev) => {
    if (!fs.existsSync(ev.file)) { console.error('sound.json: missing hit file ' + ev.file); process.exit(1); }
    inputs.push('-i', ev.file);
    filterParts.push(chain(n, { file: ev.file, gain: ev.gain, start: ev.at }));
    mixLabels.push('[s' + n + ']'); n++;
  });
  console.log('sound design: ' + ((sfxSpec.beds || []).length + (sfxSpec.hits || []).length) + ' SFX layers');
}
filterParts.push(mixLabels.join('') + 'amix=inputs=' + mixLabels.length + ':normalize=0,apad[out]');
ffmpeg(inputs.concat([
  '-filter_complex', filterParts.join(';'),
  '-map', '[out]',
  '-ac', '2',
  '-t', String(timing.total),
  mixFile,
]), 'mixing ' + withAudio.length + ' voice files' + (sfxSpec ? ' + SFX' : ''));

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

function encodeCard(png, dur, outMp4, label, sound) {
  const args = ['-loop', '1', '-t', String(dur), '-i', png];
  if (sound && fs.existsSync(sound.file)) {
    args.push('-i', sound.file);
    const g = sound.gain == null ? 1 : sound.gain;
    args.push('-af', 'atrim=0:' + dur + ',volume=' + g + ',afade=t=out:st=' + Math.max(0, dur - 0.15) + ':d=0.15');
  } else {
    args.push('-f', 'lavfi', '-t', String(dur), '-i', 'anullsrc=r=44100:cl=stereo');
  }
  args.push('-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-r', String(FPS),
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ac', '2',
    '-shortest',
    outMp4);
  ffmpeg(args, label);
}

const introMp4 = path.join(EP_DIR, 'render', 'hook-intro.mp4');
const outroMp4 = path.join(EP_DIR, 'render', 'hook-outro.mp4');
const concatList = path.join(EP_DIR, 'render', 'hooks-concat.txt');

encodeCard(introPng, introDur, introMp4, 'encoding hook-intro.mp4 (' + introDur + 's)', sfxSpec && sfxSpec.intro);
encodeCard(outroPng, outroDur, outroMp4, 'encoding hook-outro.mp4 (' + outroDur + 's)', sfxSpec && sfxSpec.outro);

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
